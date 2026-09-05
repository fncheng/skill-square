import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { deleteModelResponse, exportModelResponse, getModelResponse } from '@/api/model-responses';
import { PageHead } from '@/components/layout/PageHead';
import { MarkdownAnnotationSurface, type MarkdownAnnotationSurfaceHandle } from '@/components/markdown/MarkdownAnnotationSurface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useContentExport } from '@/hooks/use-content-transfer';
import { useMarkdown } from '@/hooks/use-markdown';
import { useToast } from '@/hooks/use-toast';
import type { ModelResponse } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

export function ModelResponseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const surfaceRef = useRef<MarkdownAnnotationSurfaceHandle>(null);
  const [response, setResponse] = useState<ModelResponse>();
  const [loading, setLoading] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const { html, headings, citationGroups } = useMarkdown(response?.content ?? '');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const record = await getModelResponse(id);
        setResponse(record);
        setAnnotationCount(record.annotationCount);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const { exporting, exportFile } = useContentExport({
    resourceLabel: '模型回答',
    exporter: async () => {
      if (!response) throw new Error('模型回答尚未加载。');
      return exportModelResponse(response.id);
    }
  });

  const copyContent = async () => {
    if (!response) return;
    await copyText(response.content);
    toast({ title: 'Markdown 内容已复制', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!response) return;
    const confirmed = await confirmDeletion({
      title: '删除模型回答',
      description: `删除「${response.title}」后将同时删除其全部批注，该操作不可恢复。`,
      expectedText: response.title
    });
    if (!confirmed) return;
    await deleteModelResponse(response.id);
    toast({ title: '模型回答已删除', variant: 'success' });
    navigate('/model-responses');
  };

  return (
    <section className="relative">
      {loading ? <div className="loading-panel">正在加载模型回答...</div> : null}
      <PageHead
        title={response?.title || '模型回答'}
        subtitle={response?.summary}
        back="/model-responses"
        compactActions={response ? <><Button variant="outline" size="sm" onClick={() => surfaceRef.current?.openList()}><MessageSquareText className="h-4 w-4" />批注<span className="md-annotation-count">{annotationCount}</span></Button><Button variant="outline" size="sm" onClick={() => navigate(`/model-responses/${response.id}/edit`)}><Pencil className="h-4 w-4" />编辑</Button></> : null}
        actions={response ? <><Button variant="outline" disabled={exporting} onClick={() => void exportFile()}><Download className="h-4 w-4" />{exporting ? '正在导出...' : '导出'}</Button><Button variant="outline" onClick={() => void copyContent()}><Copy className="h-4 w-4" />复制 Markdown</Button><Button variant="outline" onClick={() => navigate(`/model-responses/${response.id}/edit`)}><Pencil className="h-4 w-4" />编辑</Button><Button variant="outline" onClick={() => surfaceRef.current?.openList()}><MessageSquareText className="h-4 w-4" />批注<span className="md-annotation-count">{annotationCount}</span></Button><Button variant="outline" onClick={() => void handleDelete()}><Trash2 className="h-4 w-4" />删除</Button></> : null}
      />
      {response ? <div className="detail-grid"><MarkdownAnnotationSurface ref={surfaceRef} html={html} citationGroups={citationGroups} resourceType="MODEL_RESPONSE" resourceId={response.id} documentUpdatedAt={response.updatedAt} onCountChange={setAnnotationCount} /><aside className="detail-surface"><div className="detail-meta"><div className="meta-item"><span className="meta-label">来源</span><span className="meta-value">{[response.sourceProduct, response.modelName].filter(Boolean).join(' · ') || '未记录'}</span></div>{response.originalPrompt ? <div className="meta-item"><span className="meta-label">原始 Prompt</span><p className="model-response-original-prompt">{response.originalPrompt}</p></div> : null}<div className="meta-item"><span className="meta-label">分类</span><span className="meta-value">{response.category || '未分类'}</span></div><div className="meta-item"><span className="meta-label">标签</span><div className="tag-list">{response.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></div><div className="meta-item"><span className="meta-label">创建时间</span><span className="meta-value">{formatDateTime(response.createdAt)}</span></div><div className="meta-item"><span className="meta-label">更新时间</span><span className="meta-value">{formatDateTime(response.updatedAt)}</span></div>{headings.length ? <div className="meta-item meta-item-toc"><span className="meta-label">目录</span><nav className="md-toc">{headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`md-toc-link level-${heading.level}`}>{heading.text}</a>)}</nav></div> : null}</div></aside></div> : !loading ? <div className="empty-state">未找到该模型回答</div> : null}
    </section>
  );
}
