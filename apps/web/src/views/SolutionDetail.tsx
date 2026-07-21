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
import { deleteSolution, exportSolution, getSolution } from '@/api/solutions';
import type { Solution } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

export function SolutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const annotationSurfaceRef = useRef<MarkdownAnnotationSurfaceHandle>(null);

  const [solution, setSolution] = useState<Solution>();
  const [loading, setLoading] = useState(false);
  const [annotationCount, setAnnotationCount] = useState(0);

  const { html, headings } = useMarkdown(solution?.content ?? '');
  const { exporting, exportFile } = useContentExport({
    resourceLabel: '解决方案',
    exporter: async () => {
      if (!solution) {
        throw new Error('解决方案尚未加载。');
      }
      return exportSolution(solution.id);
    }
  });

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      setLoading(true);
      try {
        setSolution(await getSolution(id));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const copyContent = async () => {
    if (!solution) {
      return;
    }
    await copyText(solution.content);
    toast({ title: 'Markdown 内容已复制', variant: 'success' });
  };

  const handleDelete = async () => {
    if (!solution) {
      return;
    }

    const confirmed = await confirm({
      title: '删除解决方案',
      description: `确认删除「${solution.title}」？该操作不可恢复。`,
      confirmText: '删除',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    await deleteSolution(solution.id);
    toast({ title: '解决方案已删除', variant: 'success' });
    navigate('/solutions');
  };

  return (
    <section className="relative">
      {loading ? <div className="loading-panel">正在加载解决方案...</div> : null}

      <PageHead
        title={solution?.title || '解决方案'}
        subtitle={solution?.summary}
        back="/solutions"
        actions={
          solution ? (
            <>
              <Button variant="outline" disabled={exporting} onClick={() => void exportFile()}>
                <Download className="h-4 w-4" />
                {exporting ? '正在导出...' : '导出'}
              </Button>
              <Button variant="outline" onClick={copyContent}>
                <Copy className="h-4 w-4" />
                复制 Markdown
              </Button>
              <Button variant="outline" onClick={() => navigate(`/solutions/${solution.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
              <Button variant="outline" onClick={() => annotationSurfaceRef.current?.openList()}>
                <MessageSquareText className="h-4 w-4" />
                批注
                <span className="md-annotation-count">{annotationCount}</span>
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </>
          ) : null
        }
      />

      {solution ? (
        <div className="detail-grid">
          <MarkdownAnnotationSurface
            ref={annotationSurfaceRef}
            html={html}
            resourceType="SOLUTION"
            resourceId={solution.id}
            documentUpdatedAt={solution.updatedAt}
            onCountChange={setAnnotationCount}
          />

          <aside className="detail-surface">
            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">分类</span>
                <span className="meta-value">{solution.category || '未分类'}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">标签</span>
                <div className="tag-list">
                  {solution.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {solution.tags.length === 0 ? <span className="meta-value">无标签</span> : null}
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-label">创建时间</span>
                <span className="meta-value">{formatDateTime(solution.createdAt)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">更新时间</span>
                <span className="meta-value">{formatDateTime(solution.updatedAt)}</span>
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
        <div className="empty-state">未找到该解决方案</div>
      ) : null}
    </section>
  );
}
