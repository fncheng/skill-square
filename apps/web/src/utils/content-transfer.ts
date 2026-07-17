import {
  CONTENT_TRANSFER_FORMAT,
  CONTENT_TRANSFER_MAX_FILE_SIZE,
  CONTENT_TRANSFER_VERSION,
  type ContentTransferAnnotation,
  type ContentTransferFile,
  type ContentTransferResource
} from '@/types/content-transfer';
import type { AnnotationResourceType } from '@/types/domain';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isTransferResource(value: unknown): value is ContentTransferResource {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === 'string' &&
    typeof value.summary === 'string' &&
    typeof value.content === 'string' &&
    typeof value.category === 'string' &&
    isStringArray(value.tags) &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isTransferAnnotation(value: unknown): value is ContentTransferAnnotation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.content === 'string' &&
    typeof value.exact === 'string' &&
    typeof value.prefix === 'string' &&
    typeof value.suffix === 'string' &&
    typeof value.start === 'number' &&
    typeof value.end === 'number' &&
    (value.documentUpdatedAt === null || typeof value.documentUpdatedAt === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

function isContentTransferFile(value: unknown): value is ContentTransferFile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.format === CONTENT_TRANSFER_FORMAT &&
    value.version === CONTENT_TRANSFER_VERSION &&
    (value.resourceType === 'NOTE' || value.resourceType === 'SOLUTION') &&
    typeof value.exportedAt === 'string' &&
    isTransferResource(value.resource) &&
    Array.isArray(value.annotations) &&
    value.annotations.every(isTransferAnnotation)
  );
}

/** 读取并校验迁移文件，阻止错误资源类型进入导入接口。 */
export async function readContentTransferFile(file: File, expectedType: AnnotationResourceType) {
  if (file.size > CONTENT_TRANSFER_MAX_FILE_SIZE) {
    throw new Error('迁移文件不能超过 5 MB。');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('文件不是有效的 JSON 迁移文件。');
  }

  if (!isContentTransferFile(parsed)) {
    throw new Error('迁移文件格式无效或版本不受支持。');
  }

  if (parsed.resourceType !== expectedType) {
    const expectedLabel = expectedType === 'SOLUTION' ? '解决方案' : '学习笔记';
    throw new Error(`请选择${expectedLabel}迁移文件。`);
  }

  return parsed;
}

/** 将迁移对象下载为单个 JSON 文件。 */
export function downloadContentTransferFile(transfer: ContentTransferFile) {
  const resourceLabel = transfer.resourceType === 'SOLUTION' ? 'solution' : 'note';
  const safeTitle = transfer.resource.title
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'untitled';
  const blob = new Blob([JSON.stringify(transfer, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `skill-square-${resourceLabel}-${safeTitle}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
