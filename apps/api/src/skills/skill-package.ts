import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import { load } from 'js-yaml';
import * as yauzl from 'yauzl';

const UPLOAD_LIMIT = 10 * 1024 * 1024;
const TOTAL_LIMIT = 50 * 1024 * 1024;
const TEXT_LIMIT = 1024 * 1024;
const FILE_LIMIT = 500;

export interface PackageFile {
  path: string;
  size: number;
  hash: string;
  text: string | null;
}
export interface SkillPackage {
  format: 'MD' | 'ZIP';
  files: PackageFile[];
  name: string;
  description: string;
  contentHash: string;
  artifactHash: string;
}
// ZIP CRC32 用于检测压缩数据损坏，内容摘要用于版本比较。
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const sha = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');
const invalid = (message: string): never => {
  throw new BadRequestException(message);
};

/** 只将有效 UTF-8、非二进制且不超过上限的文件用于在线查看。 */
function preview(data: Buffer): string | null {
  if (data.length > TEXT_LIMIT || data.includes(0)) return null;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(data);
  } catch {
    return null;
  }
}

function safePath(value: string): string {
  if (
    !value ||
    value.includes('\\') ||
    value.startsWith('/') ||
    /^[a-z]:/i.test(value) ||
    /[\x00-\x1f\x7f]/.test(value)
  )
    return invalid(`非法文件路径：${value}`);
  const parts = value.replace(/\/$/, '').split('/');
  if (
    parts.length > 32 ||
    parts.some(
      (part) =>
        !part ||
        part === '.' ||
        part === '..' ||
        /[<>:"|?*]/.test(part) ||
        /[. ]$/.test(part) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part)
    )
  )
    return invalid(`非法文件路径：${value}`);
  return parts.join('/').normalize('NFC');
}

/** ZIP 顺序读取，每个数据流都计数；永不写入磁盘或执行包内文件。 */
async function readZip(data: Buffer): Promise<Array<{ path: string; data: Buffer }>> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(data, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) return reject(new BadRequestException('ZIP 文件无效或不受支持。'));
      const archive = zip;
      const files: Array<{ path: string; data: Buffer }> = [];
      const seen = new Set<string>();
      const directories = new Set<string>();
      let total = 0;
      let entries = 0;
      let finished = false;
      let activeStream: Readable | undefined;
      const timer = setTimeout(() => fail('ZIP 解析超时。'), 10000);
      const fail = (message: string) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        activeStream?.destroy();
        archive.close();
        reject(new BadRequestException(message));
      };
      archive.on('error', () => fail('ZIP 文件损坏或不受支持。'));
      archive.on('end', () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve(files);
        }
      });
      archive.on('entry', (entry: yauzl.Entry) => {
        try {
          if (finished) return;
          if (++entries > 1000) return fail('ZIP 条目数量超限。');
          const path = safePath(entry.fileName);
          const key = path.toLocaleLowerCase('en-US');
          if (seen.has(key)) return fail(`文件路径重复或大小写冲突：${path}`);
          const isDirectory = /\/$/.test(entry.fileName);
          for (const other of files) {
            const existing = other.path.toLocaleLowerCase('en-US');
            if (key.startsWith(existing + '/') || (!isDirectory && existing.startsWith(key + '/')))
              return fail(`文件与目录路径冲突：${path}`);
          }
          if (!isDirectory && Array.from(directories).some((dir) => dir.startsWith(key + '/')))
            return fail(`文件与目录路径冲突：${path}`);
          if (isDirectory) directories.add(key);
          seen.add(key);
          if ((entry.generalPurposeBitFlag & 1) !== 0) return fail('不支持加密 ZIP。');
          const mode = entry.externalFileAttributes >>> 16;
          if ((mode & 0o170000) === 0o120000) return fail(`不支持符号链接：${path}`);
          if (/\/$/.test(entry.fileName)) return archive.readEntry();
          if (path.split('/').some((part) => part === '__MACOSX' || part === '.DS_Store')) return archive.readEntry();
          if (
            files.length >= FILE_LIMIT ||
            entry.uncompressedSize > TOTAL_LIMIT ||
            total + entry.uncompressedSize > TOTAL_LIMIT ||
            (entry.uncompressedSize > 1024 * 1024 && entry.uncompressedSize > Math.max(1, entry.compressedSize) * 200)
          )
            return fail(`ZIP 文件数量、大小或解压比超限：${path}`);
          archive.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(`无法读取文件：${path}`);
            if (finished) {
              stream.destroy();
              return;
            }
            activeStream = stream;
            const chunks: Buffer[] = [];
            let size = 0;
            stream.on('data', (chunk: Buffer) => {
              size += chunk.length;
              total += chunk.length;
              if (size > entry.uncompressedSize || total > TOTAL_LIMIT) {
                stream.destroy();
                fail('解压大小超限。');
              } else chunks.push(chunk);
            });
            stream.on('error', () => fail(`无法解压文件：${path}`));
            stream.on('end', () => {
              if (finished) return;
              activeStream = undefined;
              const content = Buffer.concat(chunks);
              if (crc32(content) !== entry.crc32) return fail(`文件校验失败：${path}`);
              files.push({ path, data: content });
              archive.readEntry();
            });
          });
        } catch (err) {
          if (!finished) {
            finished = true;
            clearTimeout(timer);
            archive.close();
            reject(err);
          }
        }
      });
      archive.readEntry();
    });
  });
}

export async function parseSkillPackage(filename: string, data: Buffer): Promise<SkillPackage> {
  if (!data.length || data.length > UPLOAD_LIMIT) return invalid('上传文件必须小于等于 10 MiB 且不能为空。');
  const format =
    filename === 'SKILL.md' ? 'MD' : /\.zip$/i.test(filename) ? 'ZIP' : invalid('请选择 SKILL.md 或 ZIP 文件。');
  let raw = format === 'MD' ? [{ path: 'SKILL.md', data }] : await readZip(data);
  const roots = raw.filter((file) => file.path === 'SKILL.md' || /^[^/]+\/SKILL\.md$/.test(file.path));
  if (roots.length !== 1 || raw.filter((file) => file.path.split('/').pop() === 'SKILL.md').length !== 1)
    return invalid('必须包含唯一的根目录或单层包裹目录 SKILL.md。');
  const prefix = roots[0].path === 'SKILL.md' ? '' : roots[0].path.slice(0, -'SKILL.md'.length);
  if (prefix && raw.some((file) => !file.path.startsWith(prefix))) return invalid('ZIP 必须仅包含一个包裹目录。');
  raw = raw
    .map((file) => ({ ...file, path: file.path.slice(prefix.length) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const entry = preview(raw.find((file) => file.path === 'SKILL.md')!.data);
  if (entry === null) return invalid('SKILL.md 必须是 1 MiB 以内的 UTF-8 文本。');
  const match = entry.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return invalid('SKILL.md 缺少有效的 frontmatter。');
  let metadata: unknown;
  try {
    metadata = load(match[1], { json: false });
  } catch {
    return invalid('SKILL.md frontmatter 不是有效 YAML。');
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return invalid('frontmatter 必须包含 name 和 description。');
  const fields = metadata as Record<string, unknown>;
  if (
    typeof fields.name !== 'string' ||
    !fields.name.trim() ||
    typeof fields.description !== 'string' ||
    !fields.description.trim()
  )
    return invalid('frontmatter 必须包含非空的 name 和 description。');
  const files = raw.map((file) => ({
    path: file.path,
    size: file.data.length,
    hash: sha(file.data),
    text: preview(file.data)
  }));
  return {
    format,
    files,
    name: fields.name.trim(),
    description: fields.description.trim(),
    contentHash: sha(JSON.stringify(files.map(({ path, size, hash }) => ({ path, size, hash })))),
    artifactHash: sha(data)
  };
}
