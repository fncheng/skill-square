import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { test } from 'node:test';
import { parseSkillPackage } from '../src/skills/skill-package.ts';

const entry = Buffer.from('---\nname: example\ndescription: example skill\n---\n# Example\n');
function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
/** 构造真实 ZIP，并允许故意制造危险元数据以覆盖拒绝分支。 */
function zip(entries, { compress = false, badCrc = false, encrypted = false } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [path, data, mode = 0] of entries) {
    const name = Buffer.from(path);
    const body = compress ? deflateRawSync(data) : data;
    const crc = (crc32(data) + (badCrc ? 1 : 0)) >>> 0;
    const method = compress ? 8 : 0;
    const flags = 0x800 | (encrypted ? 1 : 0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
test('MD validates frontmatter and original bytes determine artifact hash', async () => {
  const result = await parseSkillPackage('SKILL.md', entry);
  assert.equal(result.name, 'example');
  assert.equal(result.files[0].text, entry.toString());
  await assert.rejects(parseSkillPackage('other.md', entry));
  await assert.rejects(parseSkillPackage('SKILL.md', Buffer.from('# missing')));
  await assert.rejects(parseSkillPackage('SKILL.md', Buffer.from([0xff])));
});
test('ZIP strips one wrapper and hashes file content independent of compression', async () => {
  const entries = [
    ['demo/SKILL.md', entry],
    ['demo/scripts/run.sh', Buffer.from('echo ok\n')]
  ];
  const a = await parseSkillPackage('a.zip', zip(entries));
  const b = await parseSkillPackage('b.zip', zip(entries, { compress: true }));
  assert.deepEqual(
    a.files.map((file) => file.path),
    ['scripts/run.sh', 'SKILL.md']
  );
  assert.equal(a.contentHash, b.contentHash);
  assert.notEqual(a.artifactHash, b.artifactHash);
});
test('checks CRC across multiple decompression chunks', async () => {
  const content = Buffer.alloc(512 * 1024);
  for (let i = 0; i < content.length; i++) content[i] = (i * 31 + (i >>> 8)) & 0xff;
  const entries = [['large.bin', content], ['SKILL.md', entry]];
  const result = await parseSkillPackage('x.zip', zip(entries, { compress: true }));
  assert.equal(result.files.find((file) => file.path === 'large.bin').size, content.length);
  await assert.rejects(
    parseSkillPackage('x.zip', zip(entries, { compress: true, badCrc: true })),
    /文件校验失败：large\.bin/
  );
});
test('rejects unsafe paths, case conflicts, file directory conflicts and ambiguous entrypoints', async () => {
  const cases = [
    [
      ['SKILL.md', entry],
      ['../escape', entry]
    ],
    [
      ['SKILL.md', entry],
      ['A.txt', entry],
      ['a.txt', entry]
    ],
    [
      ['SKILL.md', entry],
      ['refs', entry],
      ['refs/a.txt', entry]
    ],
    [
      ['SKILL.md', entry],
      ['refs/a.txt', entry],
      ['refs', entry]
    ],
    [
      ['SKILL.md', entry],
      ['other/SKILL.md', entry]
    ],
    [
      ['root/SKILL.md', entry],
      ['outside.txt', entry]
    ],
    [
      ['SKILL.md', entry],
      ['link', entry, 0o120777]
    ]
  ];
  for (const candidate of cases) await assert.rejects(parseSkillPackage('x.zip', zip(candidate)));
});
test('bounds normalized UTF-8 paths before persistence', async () => {
  const accepted = 'a'.repeat(1024);
  const normalized = 'e\u0301'.repeat(512);
  for (const path of [accepted, normalized]) {
    const result = await parseSkillPackage('x.zip', zip([['SKILL.md', entry], [path, Buffer.from('x')]]));
    assert.ok(result.files.some((file) => file.path === path.normalize('NFC')));
  }
  for (const path of ['a'.repeat(1025), '界'.repeat(342)]) {
    await assert.rejects(parseSkillPackage('x.zip', zip([['SKILL.md', entry], [path, Buffer.from('x')]])), (error) => {
      assert.equal(error.getStatus(), 400);
      assert.match(error.message, /文件路径超过 1024 UTF-8 字节/);
      return true;
    });
  }
});
test('rejects corrupt CRC, encrypted archives and limits', async () => {
  await assert.rejects(parseSkillPackage('x.zip', zip([['SKILL.md', entry]], { badCrc: true })));
  await assert.rejects(parseSkillPackage('x.zip', zip([['SKILL.md', entry]], { encrypted: true })));
  await assert.rejects(
    parseSkillPackage(
      'x.zip',
      zip([['SKILL.md', entry], ...Array.from({ length: 500 }, (_, i) => [`files/${i}`, Buffer.from('x')])])
    )
  );
  await assert.rejects(parseSkillPackage('x.zip', Buffer.alloc(10 * 1024 * 1024 + 1)));
  await assert.rejects(
    parseSkillPackage(
      'x.zip',
      zip(
        [
          ['SKILL.md', entry],
          ['huge', Buffer.alloc(51 * 1024 * 1024)]
        ],
        { compress: true }
      )
    )
  );
});

test('complete snapshots distinguish added, changed and removed paths', async () => {
  const first = await parseSkillPackage(
    'v1.zip',
    zip([
      ['SKILL.md', entry],
      ['remove.txt', Buffer.from('old')],
      ['change.txt', Buffer.from('old')]
    ])
  );
  const second = await parseSkillPackage(
    'v2.zip',
    zip([
      ['SKILL.md', entry],
      ['add.txt', Buffer.from('new')],
      ['change.txt', Buffer.from('new')],
      ['binary.bin', Buffer.from([0, 1])]
    ])
  );
  const old = new Map(first.files.map((file) => [file.path, file]));
  const current = new Map(second.files.map((file) => [file.path, file]));
  assert.equal(old.has('add.txt'), false);
  assert.equal(current.has('remove.txt'), false);
  assert.notEqual(old.get('change.txt').hash, current.get('change.txt').hash);
  assert.equal(old.get('SKILL.md').hash, current.get('SKILL.md').hash);
  assert.equal(current.get('binary.bin').text, null);
});
