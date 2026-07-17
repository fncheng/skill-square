import { useRef, useState, type ChangeEvent } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from '@/hooks/use-toast';
import type { ContentTransferFile } from '@/types/content-transfer';
import type { AnnotationResourceType } from '@/types/domain';
import {
  downloadContentTransferFile,
  readContentTransferFile
} from '@/utils/content-transfer';

interface UseContentImportOptions {
  resourceType: AnnotationResourceType;
  resourceLabel: string;
  importer: (payload: ContentTransferFile) => Promise<unknown>;
  onImported: () => Promise<void> | void;
}

interface UseContentExportOptions {
  resourceLabel: string;
  exporter: () => Promise<ContentTransferFile>;
}

/** 管理列表页文件选择、格式校验与导入状态。 */
export function useContentImport(options: UseContentImportOptions) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const openFilePicker = () => fileInputRef.current?.click();

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    let transfer: ContentTransferFile;
    try {
      transfer = await readContentTransferFile(file, options.resourceType);
    } catch (error) {
      toast({
        title: '无法导入文件',
        description: error instanceof Error ? error.message : '迁移文件读取失败。',
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    try {
      await options.importer(transfer);
      toast({
        title: `${options.resourceLabel}已导入`,
        description: transfer.annotations.length
          ? `已同时迁移 ${transfer.annotations.length} 条批注。`
          : undefined,
        variant: 'success'
      });
      await options.onImported();
    } catch (error) {
      if (!isAxiosError(error)) {
        toast({ title: '导入失败', description: '迁移文件处理失败。', variant: 'destructive' });
      }
    } finally {
      setImporting(false);
    }
  };

  return { fileInputRef, importing, openFilePicker, importFile };
}

/** 管理详情页导出请求与浏览器文件下载。 */
export function useContentExport(options: UseContentExportOptions) {
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const exportFile = async () => {
    setExporting(true);
    try {
      const transfer = await options.exporter();
      downloadContentTransferFile(transfer);
      toast({ title: `${options.resourceLabel}已导出`, variant: 'success' });
    } catch (error) {
      if (!isAxiosError(error)) {
        toast({ title: '导出失败', description: '迁移文件生成失败。', variant: 'destructive' });
      }
    } finally {
      setExporting(false);
    }
  };

  return { exporting, exportFile };
}
