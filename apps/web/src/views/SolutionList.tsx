import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Lightbulb, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { useContentImport } from '@/hooks/use-content-transfer';
import { deleteSolution, getSolutions, importSolution } from '@/api/solutions';
import { useAuthStore } from '@/stores/auth';
import type { Solution, SolutionFilters } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

export function SolutionList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const isAdmin = useAuthStore((state) => state.status === 'admin');

  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SolutionFilters>({ search: '', category: '' });

  const loadSolutions = async () => {
    setLoading(true);
    try {
      setSolutions(await getSolutions());
    } finally {
      setLoading(false);
    }
  };

  const { fileInputRef, importing, openFilePicker, importFile } = useContentImport({
    resourceType: 'SOLUTION',
    resourceLabel: '解决方案',
    importer: importSolution,
    onImported: loadSolutions
  });

  useEffect(() => {
    void loadSolutions();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(solutions.map((item) => item.category).filter(Boolean))),
    [solutions]
  );

  const filteredSolutions = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return solutions.filter((item) => {
      const matchCategory = !filters.category || item.category === filters.category;
      const matchKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword));

      return matchCategory && matchKeyword;
    });
  }, [solutions, filters]);

  const handleDelete = async (solution: Solution) => {
    const confirmed = await confirmDeletion({
      title: '删除解决方案',
      description: `删除「${solution.title}」后将同时删除其全部批注，该操作不可恢复。`,
      expectedText: solution.title
    });

    if (!confirmed) {
      return;
    }

    await deleteSolution(solution.id);
    toast({ title: '解决方案已删除', variant: 'success' });
    await loadSolutions();
  };

  return (
    <section className="solution-home">
      <div className="page-head">
        <div>
          <h1 className="page-title">解决方案</h1>
          <p className="page-subtitle">沉淀常见问题的处理方式，以 Markdown 文档形式供随时查阅。</p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void importFile(event)}
            />
            <Button variant="outline" disabled={importing} onClick={openFilePicker}>
              <Upload className="h-4 w-4" />
              {importing ? '正在导入...' : '导入'}
            </Button>
            <Button onClick={() => navigate('/solutions/new')}>
              <Plus className="h-4 w-4" />
              新建方案
            </Button>
          </div>
        ) : null}
      </div>

      <div className="solution-toolbar">
        <label className="solution-search">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            type="text"
            placeholder="搜索标题、摘要、标签关键词..."
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          {filters.search ? (
            <button
              type="button"
              className="solution-search-clear"
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="category-chips">
          <button
            type="button"
            className={`category-chip${!filters.category ? ' active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-chip${filters.category === category ? ' active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, category }))}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="solution-grid relative min-h-[200px]">
        {loading ? <div className="loading-panel">正在加载解决方案...</div> : null}

        {filteredSolutions.map((item) => (
          <article
            key={item.id}
            className="solution-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/solutions/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigate(`/solutions/${item.id}`);
              }
            }}
          >
            <header className="solution-card-head">
              <span className="solution-card-icon">
                <Lightbulb className="h-4 w-4" />
              </span>
              <h2 className="solution-card-title">{item.title}</h2>
            </header>

            <p className="solution-card-desc">{item.summary || '暂无摘要'}</p>

            <div className="solution-card-tags">
              {item.category ? <span className="prompt-card-tag category">{item.category}</span> : null}
              {item.tags.map((tag) => (
                <span key={tag} className="prompt-card-tag muted">
                  {tag}
                </span>
              ))}
            </div>

            <footer className="solution-card-meta">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatShortDate(item.updatedAt)}
              </span>
              {isAdmin ? <div className="solution-card-actions" aria-label="解决方案操作">
                <button
                  type="button"
                  title="编辑"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/solutions/${item.id}/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="删除"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(item);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div> : null}
            </footer>
          </article>
        ))}

        {!loading && filteredSolutions.length === 0 ? (
          <div className="solution-empty">
            <div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8" />
              <p className="font-semibold">暂无匹配的解决方案</p>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
