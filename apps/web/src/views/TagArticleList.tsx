import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  FileText,
  NotebookPen,
  RefreshCw,
  Search,
  Tags,
  X
} from 'lucide-react';
import { getContentTagItems } from '@/api/content-tags';
import { Button } from '@/components/ui/button';
import type { ContentTagItemsResponse, ContentTagScope } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

const pageSize = 12;
const scopeOptions: Array<{ value: ContentTagScope; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'SOLUTION', label: '解决方案' },
  { value: 'NOTE', label: '学习笔记' }
];

export function TagArticleList() {
  const [searchParams] = useSearchParams();
  const tag = searchParams.get('tag')?.trim() ?? '';
  const [scope, setScope] = useState<ContentTagScope>('ALL');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<ContentTagItemsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!tag) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    void getContentTagItems({
      tag,
      resourceType: scope,
      search: debouncedSearch || undefined,
      page,
      pageSize
    })
      .then((result) => {
        if (active) {
          setResponse(result);
        }
      })
      .catch(() => {
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, page, reloadKey, scope, tag]);

  if (!tag) {
    return (
      <section className="tag-article-page">
        <div className="tag-article-invalid">
          <Tags className="h-9 w-9" />
          <h1>缺少标签参数</h1>
          <p>请从标签词云中选择一个标签后查看相关内容。</p>
          <Button asChild>
            <Link to="/tag-cloud">返回标签词云</Link>
          </Button>
        </div>
      </section>
    );
  }

  const totalPages = Math.max(1, Math.ceil((response?.total ?? 0) / pageSize));

  return (
    <section className="tag-article-page">
      <div className="page-head">
        <div className="page-head-main">
          <Link className="app-main-back" to="/tag-cloud" title="返回标签词云" aria-label="返回标签词云">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="tag-article-title-line">
              <h1 className="page-title">{tag}</h1>
              <span className="tag-article-title-count">{response?.total ?? 0} 篇</span>
            </div>
            <p className="page-subtitle">包含该标签的解决方案与学习笔记，按最近更新时间排列。</p>
          </div>
        </div>
      </div>

      <div className="tag-article-toolbar">
        <label className="tag-cloud-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            type="search"
            placeholder={`在“${tag}”中搜索...`}
            aria-label={`在标签 ${tag} 的内容中搜索`}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {search ? (
            <button type="button" aria-label="清除内容搜索" onClick={() => setSearch('')}>
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="tag-scope-control" aria-label="内容类型筛选">
          {scopeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={scope === option.value ? 'is-active' : undefined}
              onClick={() => {
                setScope(option.value);
                setPage(1);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tag-article-list-surface">
        <div className="tag-article-list-head" aria-hidden="true">
          <span>类型</span>
          <span>内容</span>
          <span>更新时间</span>
          <span />
        </div>

        {loading ? (
          <div className="tag-article-loading" aria-label="正在加载内容">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="tag-cloud-state is-error">
            <FileText className="h-8 w-8" />
            <strong>相关内容加载失败</strong>
            <span>请检查网络连接后重试。</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" />
              重新加载
            </Button>
          </div>
        ) : null}

        {!loading && !error
          ? response?.items.map((item) => {
              const isSolution = item.resourceType === 'SOLUTION';
              return (
                <Link
                  key={`${item.resourceType}-${item.id}`}
                  className="tag-article-row"
                  to={isSolution ? `/solutions/${item.id}` : `/notes/${item.id}`}
                >
                  <span className={`tag-article-type ${isSolution ? 'is-solution' : 'is-note'}`}>
                    {isSolution ? <FileText className="h-4 w-4" /> : <NotebookPen className="h-4 w-4" />}
                    {isSolution ? '解决方案' : '学习笔记'}
                  </span>

                  <span className="tag-article-main">
                    <strong>{item.title}</strong>
                    <span className="tag-article-summary">{item.summary || '暂无摘要'}</span>
                    <span className="tag-article-meta">
                      {item.category ? <span className="tag-article-category">{item.category}</span> : null}
                      {item.tags.map((itemTag) => (
                        <span
                          key={itemTag}
                          className={itemTag.toLocaleLowerCase('zh-CN') === tag.toLocaleLowerCase('zh-CN') ? 'is-current' : undefined}
                        >
                          #{itemTag}
                        </span>
                      ))}
                    </span>
                  </span>

                  <span className="tag-article-date">
                    <CalendarDays className="h-4 w-4" />
                    {formatShortDate(item.updatedAt)}
                  </span>
                  <ArrowUpRight className="tag-article-arrow" />
                </Link>
              );
            })
          : null}

        {!loading && !error && response?.items.length === 0 ? (
          <div className="tag-cloud-state">
            <Search className="h-8 w-8" />
            <strong>暂无匹配内容</strong>
            <span>{search ? '请尝试其他关键词或内容类型。' : '该标签下暂时没有内容。'}</span>
          </div>
        ) : null}
      </div>

      {!loading && !error && (response?.total ?? 0) > 0 ? (
        <div className="tag-article-pagination">
          <span>
            第 {page} / {totalPages} 页，共 {response?.total ?? 0} 篇
          </span>
          <div>
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
