import type { AnnotationResourceType } from './domain';

export const CONTENT_TRANSFER_FORMAT = 'prompt-skill-manager-transfer';
export const CONTENT_TRANSFER_VERSION = 2;
export const CONTENT_TRANSFER_VERSIONS = [1, CONTENT_TRANSFER_VERSION] as const;
export const CONTENT_TRANSFER_MAX_FILE_SIZE = 5 * 1024 * 1024;
export type ContentTransferVersion = (typeof CONTENT_TRANSFER_VERSIONS)[number];

export interface ContentTransferResource {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  sourceProduct?: string;
  modelName?: string;
  originalPrompt?: string;
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
  version: ContentTransferVersion;
  resourceType: AnnotationResourceType;
  exportedAt: string;
  resource: ContentTransferResource;
  annotations: ContentTransferAnnotation[];
}
