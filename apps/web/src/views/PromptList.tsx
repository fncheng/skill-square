import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChartPie, Copy, FileText, Plus, RotateCcw, Search, Star, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { deletePrompt } from '@/api/prompts';
import { usePromptStore } from '@/stores/prompt';
import type { Prompt } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatShortDate } from '@/utils/date';
import { getTagStyle } from '@/utils/tag-style';

const hotKeywords = ['代码优化', '需求分析', '单元测试', '接口设计', '文档生成', 'Bug排查'];

export function PromptList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const store = usePromptStore();
  const [selectedTagId, setSelectedTagId] = useState('');

  const favoriteQuery = searchParams.get('favorite');
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(store.total / store.pageSize)),
    [store.total, store.pageSize]
  );

  useEffect(() => {
    store.setPageSize(8);
    store.setFilters({ favorite: favoriteQuery === 'true' ? 'true' : '' });
    store.setPage(1);
    void store.fetchPrompts();
    void store.fetchCategories();
    void store.fetchTags();
    // 仅在收藏筛选参数变化时重新加载列表
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favoriteQuery]);

  const handleSearch = async () => {
    store.setPage(1);
    await store.fetchPrompts();
  };

  const handleSearchKeyup = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      void handleSearch();
    }
  };

  const clearSearch = async () => {
    store.setFilters({ search: '' });
    await handleSearch();
  };

  const applyKeyword = async (keyword: string) => {
    store.setFilters({ search: keyword });
    await handleSearch();
  };

  const applyCategory = async (categoryId: string) => {
    store.setFilters({ categoryId });
    await handleSearch();
  };

  const applyTagFilter = async (tagId: string) => {
    setSelectedTagId(tagId);
    store.setFilters({ tagIds: tagId ? [tagId] : [] });
    await handleSearch();
  };

  const handleReset = async () => {
    store.resetFilters();
    setSelectedTagId('');
    store.setPageSize(8);
    navigate('/prompts', { replace: true });
    await store.fetchPrompts();
  };

  const handlePageSizeChange = async (size: number) => {
    store.setPageSize(size);
    store.setPage(1);
    await store.fetchPrompts();
  };

  const changePage = async (page: number) => {
    store.setPage(page);
    await store.fetchPrompts();
  };

  const handleFavorite = async (prompt: Prompt) => {
    await store.toggleFavorite(prompt);
  };

  const handleDelete = async (prompt: Prompt) => {
    const confirmed = await confirm({
      title: '删除 Prompt',
      description: `确认删除「${prompt.name}」？删除后将同时删除该 Prompt 的历史版本。`,
      confirmText: '删除',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    await deletePrompt(prompt.id);
    toast({ title: 'Prompt 已删除', variant: 'success' });
    await store.fetchPrompts();
  };

  const copyPrompt = async (content: string) => {
    await copyText(content);
    toast({ title: 'Prompt 内容已复制', variant: 'success' });
  };

  return (
    <section className="prompt-home">
      {favoriteQuery === 'true' ? (
        <>
          <div className="page-head">
            <div>
              <h1 className="page-title">我的收藏</h1>
              <p className="page-subtitle">集中查看已收藏的 Prompt，快速查找并复用常用内容。</p>
            </div>
            <Button onClick={() => navigate('/prompts/new')}>
              <Plus className="h-4 w-4" />
              新建 Prompt
            </Button>
          </div>

          <section className="solution-toolbar">
            <label className="solution-search">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={store.filters.search}
                type="text"
                placeholder="搜索 Prompt、分类、标签关键词..."
                onChange={(event) => store.setFilters({ search: event.target.value })}
                onKeyUp={handleSearchKeyup}
              />
              {store.filters.search ? (
                <button type="button" className="solution-search-clear" onClick={clearSearch}>
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <div className="favorite-toolbar-filters">
              <div className="category-chips">
                <button
                  type="button"
                  className={`category-chip${!store.filters.categoryId ? ' active' : ''}`}
                  onClick={() => applyCategory('')}
                >
                  全部
                </button>
                {store.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-chip${store.filters.categoryId === category.id ? ' active' : ''}`}
                    onClick={() => applyCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
              <select
                value={store.filters.favorite}
                className="native-select w-36"
                aria-label="收藏筛选"
                onChange={(event) => {
                  store.setFilters({ favorite: event.target.value as '' | 'true' | 'false' });
                  void handleSearch();
                }}
              >
                <option value="">全部收藏</option>
                <option value="true">已收藏</option>
                <option value="false">未收藏</option>
              </select>
              <select
                value={selectedTagId}
                className="native-select w-40"
                aria-label="标签筛选"
                onChange={(event) => void applyTagFilter(event.target.value)}
              >
                <option value="">全部标签</option>
                {store.tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="prompt-hero">
            <div className="hero-copy">
              <h1>
                发现优质 <span>Prompt</span>
              </h1>
              <p>搜索、收藏、管理你的 AI 提示词，让 AI 帮你更高效地完成工作</p>

              <label className="hero-search">
                <Search className="h-5 w-5 text-slate-500" />
                <input
                  value={store.filters.search}
                  type="text"
                  placeholder="搜索 Prompt、分类、标签关键词..."
                  onChange={(event) => store.setFilters({ search: event.target.value })}
                  onKeyUp={handleSearchKeyup}
                />
                {store.filters.search ? (
                  <button type="button" className="hero-search-clear" onClick={clearSearch}>
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </label>

              <div className="hot-keywords">
                <b>热门搜索:</b>
                {hotKeywords.map((keyword) => (
                  <button key={keyword} type="button" onClick={() => applyKeyword(keyword)}>
                    {keyword}
                  </button>
                ))}
              </div>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="art-search">
                <Search className="h-5 w-5" />
                <span />
              </div>
              <div className="art-card art-card-primary">
                <div className="art-thumb">&lt;/&gt;</div>
                <i />
                <i />
              </div>
              <div className="art-card">
                <div className="art-thumb">
                  <FileText className="h-8 w-8" />
                </div>
                <i />
                <i />
              </div>
              <div className="art-card">
                <div className="art-thumb">
                  <ChartPie className="h-8 w-8" />
                </div>
                <i />
                <i />
              </div>
            </div>
          </section>

          <section className="category-toolbar">
            <div className="category-main">
              <h2>分类</h2>
              <div className="category-chips">
                <button
                  type="button"
                  className={`category-chip${!store.filters.categoryId ? ' active' : ''}`}
                  onClick={() => applyCategory('')}
                >
                  全部
                </button>
                {store.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-chip${store.filters.categoryId === category.id ? ' active' : ''}`}
                    onClick={() => applyCategory(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-view-tools">
              <select
                value={store.filters.favorite}
                className="native-select w-36"
                aria-label="收藏筛选"
                onChange={(event) => {
                  store.setFilters({ favorite: event.target.value as '' | 'true' | 'false' });
                  void handleSearch();
                }}
              >
                <option value="">全部收藏</option>
                <option value="true">已收藏</option>
                <option value="false">未收藏</option>
              </select>
              <select
                value={selectedTagId}
                className="native-select w-40"
                aria-label="标签筛选"
                onChange={(event) => void applyTagFilter(event.target.value)}
              >
                <option value="">全部标签</option>
                {store.tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                重置
              </Button>
            </div>
          </section>
        </>
      )}

      <section className="prompt-card-grid">
        {store.loading ? <div className="loading-panel">正在加载 Prompt...</div> : null}

        {store.prompts.map((prompt) => (
          <article
            key={prompt.id}
            className="prompt-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/prompts/${prompt.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigate(`/prompts/${prompt.id}`);
              }
            }}
          >
            <header className="prompt-card-head">
              <Link
                className="prompt-card-title"
                to={`/prompts/${prompt.id}`}
                onClick={(event) => event.stopPropagation()}
              >
                {prompt.name}
              </Link>
              <button
                type="button"
                title={prompt.isFavorite ? '取消收藏' : '收藏'}
                className={`card-star-button${prompt.isFavorite ? ' active' : ''}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleFavorite(prompt);
                }}
              >
                <Star className="h-4 w-4" fill={prompt.isFavorite ? 'currentColor' : 'none'} />
              </button>
            </header>

            <p className="prompt-card-desc">{prompt.description || '暂无描述'}</p>

            <div className="prompt-card-tags">
              {prompt.category ? <span className="prompt-card-tag category">{prompt.category.name}</span> : null}
              {prompt.tags.map((tag) => (
                <span key={tag.id} className="prompt-card-tag" style={getTagStyle(tag.color)}>
                  {tag.name}
                </span>
              ))}
              {!prompt.category && prompt.tags.length === 0 ? (
                <span className="prompt-card-tag muted">无标签</span>
              ) : null}
            </div>

            <footer className="prompt-card-meta">
              <div className="prompt-card-owner">
                <span className="meta-avatar">A</span>
                <span>Admin</span>
                <span className="date">{formatShortDate(prompt.updatedAt)}</span>
              </div>
              <div className="prompt-card-actions" aria-label="Prompt 操作">
                <button
                  type="button"
                  title="复制内容"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void copyPrompt(prompt.content);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="删除"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(prompt);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </article>
        ))}

        {!store.loading && store.prompts.length === 0 ? (
          <div className="prompt-card-empty">
            <div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8" />
              <p className="font-semibold">暂无匹配的 Prompt</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="card-pagination">
        <span className="text-sm text-muted-foreground">共 {store.total} 条</span>
        <select
          value={store.pageSize}
          className="native-select w-24"
          onChange={(event) => void handlePageSizeChange(Number(event.target.value))}
        >
          <option value={8}>8 条</option>
          <option value={12}>12 条</option>
          <option value={24}>24 条</option>
          <option value={48}>48 条</option>
        </select>
        <Button variant="outline" size="sm" disabled={store.page <= 1} onClick={() => changePage(store.page - 1)}>
          上一页
        </Button>
        <span className="text-sm font-semibold">
          第 {store.page} / {totalPages} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={store.page >= totalPages}
          onClick={() => changePage(store.page + 1)}
        >
          下一页
        </Button>
      </div>

      {favoriteQuery !== 'true' ? (
        <button type="button" className="prompt-fab" title="新建 Prompt" onClick={() => navigate('/prompts/new')}>
          <Plus className="h-7 w-7" />
        </button>
      ) : null}
    </section>
  );
}
