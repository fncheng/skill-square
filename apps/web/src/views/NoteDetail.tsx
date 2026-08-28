import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Download, MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { PageHead } from '@/components/layout/PageHead';
import {
  MarkdownAnnotationSurface,
  type MarkdownAnnotationSurfaceHandle
} from '@/components/markdown/MarkdownAnnotationSurface';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { useMarkdown } from '@/hooks/use-markdown';
import { useContentExport } from '@/hooks/use-content-transfer';
import { deleteNote, exportNote, getNote } from '@/api/notes';
import { useAuthStore } from '@/stores/auth';
import type { Note } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const annotationSurfaceRef = useRef<MarkdownAnnotationSurfaceHandle>(null);
  const isAdmin = useAuthStore((state) => state.status === 'admin');

  const [note, setNote] = useState<Note>();
  const [loading, setLoading] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);

  const { html, headings } = useMarkdown(note?.content ?? '');
  const { exporting, exportFile } = useContentExport({
    resourceLabel: '学习笔记',
    exporter: async () => {
      if (!note) {
        throw new Error('学习笔记尚未加载。');
      }
      return exportNote(note.id);
    }
  });

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      setLoading(true);
      try {
        setNote(await getNote(id));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const copyContent = async () => {
    if (!note) {
      return;
    }
    await copyText(note.content);
    toast({ title: 'Markdown 内容已复制', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!note) {
      return;
    }

    const confirmed = await confirmDeletion({
      title: '删除笔记',
      description: `删除「${note.title}」后将同时删除其全部批注，该操作不可恢复。`,
      expectedText: note.title
    });

    if (!confirmed) {
      return;
    }

    await deleteNote(note.id);
    toast({ title: '笔记已删除', variant: 'success' });
    navigate('/notes');
  };

  return (
    <section className="relative">
      {loading ? <div className="loading-panel">正在加载笔记...</div> : null}

      <PageHead
        title={note?.title || '笔记'}
        subtitle={note?.summary}
        back="/notes"
        sticky
        actions={
          note ? (
            <>
              <Button variant="outline" disabled={exporting} onClick={() => void exportFile()}>
                <Download className="h-4 w-4" />
                {exporting ? '正在导出...' : '导出'}
              </Button>
              <Button variant="outline" onClick={copyContent}>
                <Copy className="h-4 w-4" />
                复制 Markdown
              </Button>
              {isAdmin ? (
                <Button variant="outline" onClick={() => navigate(`/notes/${note.id}/edit`)}>
                  <Pencil className="h-4 w-4" />
                  编辑
                </Button>
              ) : null}
              <Button variant="outline" onClick={() => annotationSurfaceRef.current?.openList()}>
                <MessageSquareText className="h-4 w-4" />
                批注
                <span className="md-annotation-count">{annotationCount}</span>
              </Button>
              {isAdmin ? (
                <Button variant="outline" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      {note ? (
        <div className="detail-grid">
          <MarkdownAnnotationSurface
            ref={annotationSurfaceRef}
            html={html}
            resourceType="NOTE"
            resourceId={note.id}
            documentUpdatedAt={note.updatedAt}
            readOnly={!isAdmin}
            onCountChange={setAnnotationCount}
          />

          <aside className="detail-surface">
            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">分类</span>
                <span className="meta-value">{note.category || '未分类'}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">标签</span>
                <div className="tag-list">
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {note.tags.length === 0 ? <span className="meta-value">无标签</span> : null}
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-label">创建时间</span>
                <span className="meta-value">{formatDateTime(note.createdAt)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">更新时间</span>
                <span className="meta-value">{formatDateTime(note.updatedAt)}</span>
              </div>

              {headings.length > 0 ? (
                <div className="meta-item meta-item-toc">
                  <span className="meta-label">目录</span>
                  <nav className="md-toc">
                    {headings.map((heading) => (
                      <a
                        key={heading.id}
                        href={`#${heading.id}`}
                        className={`md-toc-link level-${heading.level}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </nav>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : !loading ? (
        <div className="empty-state">未找到该笔记</div>
      ) : null}
    </section>
  );
}
