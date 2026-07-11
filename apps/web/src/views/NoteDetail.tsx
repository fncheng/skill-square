import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Pencil, Trash2 } from 'lucide-react';
import { PageHead } from '@/components/layout/PageHead';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { useMarkdown } from '@/hooks/use-markdown';
import { deleteNote, getNote } from '@/api/notes';
import type { Note } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [note, setNote] = useState<Note>();
  const [loading, setLoading] = useState(false);

  const { html, headings } = useMarkdown(note?.content ?? '');

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

    const confirmed = await confirm({
      title: '删除笔记',
      description: `确认删除「${note.title}」？该操作不可恢复。`,
      confirmText: '删除',
      destructive: true
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
        actions={
          note ? (
            <>
              <Button variant="outline" onClick={copyContent}>
                <Copy className="h-4 w-4" />
                复制 Markdown
              </Button>
              <Button variant="outline" onClick={() => navigate(`/notes/${note.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </>
          ) : null
        }
      />

      {note ? (
        <div className="detail-grid">
          <article className="md-surface" dangerouslySetInnerHTML={{ __html: html }} />

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
                <div className="meta-item">
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
