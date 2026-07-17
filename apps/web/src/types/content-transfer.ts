import type { AnnotationResourceType } from './domain';

export const CONTENT_TRANSFER_FORMAT = 'prompt-skill-manager-transfer';
export const CONTENT_TRANSFER_VERSION = 1;
export const CONTENT_TRANSFER_MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ContentTransferResource {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentTransferAnnotation {
  content: string;
  exact: string;
  prefix: string;
  suffix: string;
  start: number;
  end: number;
  documentUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTransferFile {
  format: typeof CONTENT_TRANSFER_FORMAT;
  version: typeof CONTENT_TRANSFER_VERSION;
  resourceType: AnnotationResourceType;
  exportedAt: string;
  resource: ContentTransferResource;
  annotations: ContentTransferAnnotation[];
}
