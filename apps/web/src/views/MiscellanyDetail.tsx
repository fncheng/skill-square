import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { deleteMiscellany, exportMiscellany, getMiscellany } from '@/api/miscellanies';
import { ContentTagLink } from '@/components/content/ContentTagLink';
import { PageHead } from '@/components/layout/PageHead';
import { MarkdownAnnotationSurface, type MarkdownAnnotationSurfaceHandle } from '@/components/markdown/MarkdownAnnotationSurface';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useContentExport } from '@/hooks/use-content-transfer';
import { useMarkdown } from '@/hooks/use-markdown';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';
import type { Miscellany } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

export function MiscellanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const annotationSurfaceRef = useRef<MarkdownAnnotationSurfaceHandle>(null);
  const isAdmin = useAuthStore((state) => state.status === 'admin');
  const [miscellany, setMiscellany] = useState<Miscellany>();
  const [loading, setLoading] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);
  const { html, headings, citationGroups } = useMarkdown(miscellany?.content ?? '');
  const { exporting, exportFile } = useContentExport({ resourceLabel: '杂谈', exporter: async () => { if (!miscellany) throw new Error('杂谈尚未加载。'); return exportMiscellany(miscellany.id); } });

  useEffect(() => { const load = async () => { if (!id) return; setLoading(true); try { setMiscellany(await getMiscellany(id)); } finally { setLoading(false); } }; void load(); }, [id]);
  const copyContent = async () => { if (!miscellany) return; await copyText(miscellany.content); toast({ title: 'Markdown 内容已复制', variant: 'success' }); };
  const handleDelete = async () => { if (!miscellany) return; const confirmed = await confirmDeletion({ title: '删除杂谈', description: `删除「${miscellany.title}」后将同时删除其全部批注，该操作不可恢复。`, expectedText: miscellany.title }); if (!confirmed) return; await deleteMiscellany(miscellany.id); toast({ title: '杂谈已删除', variant: 'success' }); navigate('/miscellanies'); };
  const compactAnnotationAction = <Button variant="outline" size="sm" onClick={() => annotationSurfaceRef.current?.openList()}><MessageSquareText className="h-4 w-4" />批注<span className="md-annotation-count">{annotationCount}</span></Button>;
  const annotationAction = <Button variant="outline" onClick={() => annotationSurfaceRef.current?.openList()}><MessageSquareText className="h-4 w-4" />批注<span className="md-annotation-count">{annotationCount}</span></Button>;

  return <section className="relative">
    {loading ? <div className="loading-panel">正在加载杂谈...</div> : null}
    <PageHead title={miscellany?.title || '杂谈'} subtitle={miscellany?.summary} back="/miscellanies" compactActions={miscellany ? <>{compactAnnotationAction}{isAdmin ? <Button variant="outline" size="sm" onClick={() => navigate(`/miscellanies/${miscellany.id}/edit`)}><Pencil className="h-4 w-4" />编辑</Button> : null}</> : null} actions={miscellany ? <><Button variant="outline" disabled={exporting} onClick={() => void exportFile()}><Download className="h-4 w-4" />{exporting ? '正在导出...' : '导出'}</Button><Button variant="outline" onClick={() => void copyContent()}><Copy className="h-4 w-4" />复制 Markdown</Button>{isAdmin ? <Button variant="outline" onClick={() => navigate(`/miscellanies/${miscellany.id}/edit`)}><Pencil className="h-4 w-4" />编辑</Button> : null}{annotationAction}{isAdmin ? <Button variant="outline" onClick={() => void handleDelete()}><Trash2 className="h-4 w-4" />删除</Button> : null}</> : null} />
    {miscellany ? <div className="detail-grid"><MarkdownAnnotationSurface ref={annotationSurfaceRef} html={html} citationGroups={citationGroups} resourceType="MISCELLANY" resourceId={miscellany.id} documentUpdatedAt={miscellany.updatedAt} readOnly={!isAdmin} onCountChange={setAnnotationCount} />
      <aside className="detail-surface"><div className="detail-meta"><div className="meta-item"><span className="meta-label">分类</span><span className="meta-value">{miscellany.category || '未分类'}</span></div><div className="meta-item"><span className="meta-label">标签</span><div className="tag-list">{miscellany.tags.map((tag) => <ContentTagLink key={tag} tag={tag} />)}{miscellany.tags.length === 0 ? <span className="meta-value">无标签</span> : null}</div></div><div className="meta-item"><span className="meta-label">创建时间</span><span className="meta-value">{formatDateTime(miscellany.createdAt)}</span></div><div className="meta-item"><span className="meta-label">更新时间</span><span className="meta-value">{formatDateTime(miscellany.updatedAt)}</span></div>{headings.length > 0 ? <div className="meta-item meta-item-toc"><span className="meta-label">目录</span><nav className="md-toc">{headings.map((heading) => <a key={heading.id} href={`#${heading.id}`} className={`md-toc-link level-${heading.level}`}>{heading.text}</a>)}</nav></div> : null}</div></aside>
    </div> : !loading ? <div className="empty-state">未找到该杂谈</div> : null}
  </section>;
}
