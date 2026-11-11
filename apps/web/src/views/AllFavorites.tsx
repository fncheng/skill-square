import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, Star, X } from 'lucide-react';
import { getAllFavorites } from '@/api/favorites';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import type { FavoriteItem } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

const resourceLabels: Record<FavoriteItem['resource'], string> = {
  prompts: 'Prompt',
  solutions: '解决方案',
  notes: '学习笔记',
  miscellanies: '杂谈',
  'model-responses': '模型回答'
};

/** 汇总所有可访问的收藏，身份变化时丢弃上一轮请求结果。 */
export function AllFavorites() {
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    let active = true;
    setLoading(true);
    setHasErrors(false);
    setItems([]);
    void getAllFavorites(status === 'admin').then((result) => {
      if (!active) return;
      setItems(result.items);
      setHasErrors(result.hasErrors);
      setLoading(false);
    });
    return () => { active = false; };
  }, [status, attempt]);

  // 登出后立即隐藏私有数据，不等待下一次请求完成。
  const keyword = search.trim().toLocaleLowerCase();
  const visibleItems = items.filter((item) => {
    if (status !== 'admin' && item.resource === 'model-responses') return false;
    return !keyword || item.title.toLocaleLowerCase().includes(keyword) || item.summary.toLocaleLowerCase().includes(keyword);
  });

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">我的收藏</h1>
          <p className="page-subtitle">查看所有已收藏的内容。</p>
        </div>
      </div>
      <div className="solution-toolbar">
        <label className="solution-search">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} type="text" aria-label="搜索收藏" placeholder="搜索标题或摘要..."
            onChange={(event) => setSearch(event.target.value)} />
          {search ? (
            <button type="button" className="solution-search-clear" aria-label="清空搜索" onClick={() => setSearch('')}>
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>
      </div>
      {hasErrors ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive" role="alert">
          <span>部分收藏加载失败，请重试。</span>
          <Button variant="outline" size="sm" onClick={() => setAttempt((current) => current + 1)}>重试</Button>
        </div>
      ) : null}
      <div className="solution-grid relative min-h-[200px]">
        {loading || status === 'loading' ? <div className="loading-panel">正在加载收藏...</div> : null}
        {!loading && status !== 'loading' ? visibleItems.map((item) => (
          <article key={`${item.resource}:${item.id}`} className="solution-card" role="link" tabIndex={0}
            onClick={() => navigate(`/${item.resource}/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate(`/${item.resource}/${item.id}`);
            }}>
            <header className="solution-card-head">
              <h2 className="solution-card-title">{item.title}</h2>
              {status === 'admin' ? (
                <FavoriteButton resource={item.resource} id={item.id} isFavorite
                  onChange={(isFavorite) => {
                    if (!isFavorite) setItems((current) => current.filter((entry) => entry.resource !== item.resource || entry.id !== item.id));
                  }} />
              ) : null}
            </header>
            <p className="solution-card-desc">{item.summary || '暂无摘要'}</p>
            <footer className="solution-card-meta">
              <span className="prompt-card-tag category">{resourceLabels[item.resource]}</span>
              <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatShortDate(item.updatedAt)}</span>
            </footer>
          </article>
        )) : null}
        {!loading && status !== 'loading' && !hasErrors && visibleItems.length === 0 ? (
          <div className="solution-empty"><div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
            {keyword ? <Search className="h-8 w-8" /> : <Star className="h-8 w-8" />}
            <p className="font-semibold">{keyword ? '暂无匹配的收藏内容' : '暂无收藏内容'}</p>
          </div></div>
        ) : null}
      </div>
    </section>
  );
}
