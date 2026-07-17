import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Eye, PanelsTopLeft, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { deleteUiPrototype, getUiPrototypes } from '@/api/ui-prototypes';
import { UiPrototypeThumbnail } from '@/components/ui-prototype/UiPrototypeFrame';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { UiPrototype, UiPrototypeFilters } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

export function UiPrototypeList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [prototypes, setPrototypes] = useState<UiPrototype[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<UiPrototypeFilters>({ search: '', category: '' });

  const loadPrototypes = async () => {
    setLoading(true);
    try {
      setPrototypes(await getUiPrototypes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPrototypes();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(prototypes.map((item) => item.category).filter(Boolean))),
    [prototypes]
  );

  const filteredPrototypes = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return prototypes.filter((item) => {
      const matchCategory = !filters.category || item.category === filters.category;
      const searchText = [item.title, item.summary, item.category, ...item.tags].join(' ').toLowerCase();
      return matchCategory && (!keyword || searchText.includes(keyword));
    });
  }, [filters, prototypes]);

  const handleDelete = async (prototype: UiPrototype) => {
    const confirmed = await confirm({
      title: '删除 UI 原型',
      description: `确认删除「${prototype.title}」？该操作不可恢复。`,
      confirmText: '删除',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    await deleteUiPrototype(prototype.id);
    toast({ title: 'UI 原型已删除', variant: 'success' });
    await loadPrototypes();
  };

  return (
    <section className="ui-prototype-home">
      <div className="page-head">
        <div className="page-head-main">
          <span className="ui-prototype-page-icon">
            <PanelsTopLeft className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">UI 原型</h1>
            <p className="page-subtitle">收藏 AI 生成的单文件 HTML，在隔离环境中随时查看和对比设计效果。</p>
          </div>
        </div>
        <Button onClick={() => navigate('/ui-prototypes/new')}>
          <Plus className="h-4 w-4" />
          新建原型
        </Button>
      </div>

      <div className="ui-prototype-toolbar">
        <label className="solution-search">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            type="text"
            placeholder="搜索名称、描述或标签..."
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          {filters.search ? (
            <button
              type="button"
              className="solution-search-clear"
              aria-label="清空搜索"
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

        <span className="ui-prototype-result-count">共 {filteredPrototypes.length} 个</span>
      </div>

      <section className="ui-prototype-grid relative min-h-[280px]">
        {loading ? <div className="loading-panel">正在加载 UI 原型...</div> : null}

        {filteredPrototypes.map((item) => (
          <article
            key={item.id}
            className="ui-prototype-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/ui-prototypes/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigate(`/ui-prototypes/${item.id}`);
              }
            }}
          >
            <div className="ui-prototype-card-preview">
              <div className="ui-prototype-browser-bar" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <UiPrototypeThumbnail prototype={item} />
              <span className="ui-prototype-card-preview-action">
                <Eye className="h-4 w-4" />
                打开预览
              </span>
            </div>

            <div className="ui-prototype-card-content">
              <h2 className="ui-prototype-card-title">{item.title}</h2>
              <p className="ui-prototype-card-summary">{item.summary || '暂无描述'}</p>

              <div className="solution-card-tags">
                {item.category ? <span className="prompt-card-tag category">{item.category}</span> : null}
                {item.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="prompt-card-tag muted">
                    {tag}
                  </span>
                ))}
              </div>

              <footer className="ui-prototype-card-footer">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {formatShortDate(item.updatedAt)}
                </span>
                <div className="solution-card-actions" aria-label="UI 原型操作">
                  <button
                    type="button"
                    title="编辑"
                    className="card-icon-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/ui-prototypes/${item.id}/edit`);
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
                </div>
              </footer>
            </div>
          </article>
        ))}

        {!loading && filteredPrototypes.length === 0 ? (
          <div className="ui-prototype-empty">
            <PanelsTopLeft className="h-9 w-9" />
            <p className="font-semibold">暂无匹配的 UI 原型</p>
            <span>可以调整搜索条件，或者创建一个新的 HTML 原型。</span>
            <Button size="sm" onClick={() => navigate('/ui-prototypes/new')}>
              <Plus className="h-4 w-4" />
              新建原型
            </Button>
          </div>
        ) : null}
      </section>
    </section>
  );
}
