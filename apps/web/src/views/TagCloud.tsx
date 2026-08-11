import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, NotebookPen, RefreshCw, Search, Tags, X } from 'lucide-react';
import { getContentTagCloud } from '@/api/content-tags';
import { Button } from '@/components/ui/button';
import type { ContentTagCloudItem, ContentTagCloudResponse, ContentTagScope } from '@/types/domain';

const scopeOptions: Array<{ value: ContentTagScope; label: string }> = [
  { value: 'ALL', label: '全部内容' },
  { value: 'SOLUTION', label: '解决方案' },
  { value: 'NOTE', label: '学习笔记' }
];

function getScopedCount(item: ContentTagCloudItem, scope: ContentTagScope) {
  if (scope === 'SOLUTION') {
    return item.solutionCount;
  }
  if (scope === 'NOTE') {
    return item.noteCount;
  }
  return item.total;
}

function getWeightClass(count: number, minimum: number, maximum: number) {
  if (maximum === minimum) {
    return 'weight-3';
  }
  const weight = Math.min(5, Math.floor(((count - minimum) / (maximum - minimum)) * 5) + 1);
  return `weight-${weight}`;
}

function getToneClass(name: string) {
  const hash = Array.from(name).reduce((total, character) => total + (character.codePointAt(0) ?? 0), 0);
  return `tone-${(hash % 5) + 1}`;
}

export function TagCloud() {
  const navigate = useNavigate();
  const [cloud, setCloud] = useState<ContentTagCloudResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ContentTagScope>('ALL');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    void getContentTagCloud()
      .then((response) => {
        if (active) {
          setCloud(response);
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
  }, [reloadKey]);

  const visibleTags = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('zh-CN');
    return (cloud?.items ?? [])
      .filter(
        (item) =>
          getScopedCount(item, scope) > 0 &&
          (!keyword || item.name.toLocaleLowerCase('zh-CN').includes(keyword))
      )
      .sort(
        (left, right) =>
          getScopedCount(right, scope) - getScopedCount(left, scope) ||
          left.name.localeCompare(right.name, 'zh-CN')
      );
  }, [cloud, scope, search]);

  const counts = visibleTags.map((item) => getScopedCount(item, scope));
  const minimum = counts.length > 0 ? Math.min(...counts) : 0;
  const maximum = counts.length > 0 ? Math.max(...counts) : 0;
  const taggedContentCount =
    scope === 'SOLUTION'
      ? cloud?.taggedSolutionCount ?? 0
      : scope === 'NOTE'
        ? cloud?.taggedNoteCount ?? 0
        : (cloud?.taggedSolutionCount ?? 0) + (cloud?.taggedNoteCount ?? 0);

  return (
    <section className="tag-cloud-page">
      <div className="page-head">
        <div className="page-head-main">
          <span className="tag-cloud-page-icon" aria-hidden="true">
            <Tags className="h-5 w-5" />
          </span>
          <div>
            <h1 className="page-title">标签词云</h1>
            <p className="page-subtitle">按使用频率浏览解决方案与学习笔记，点击标签查看相关内容。</p>
          </div>
        </div>
      </div>

      <dl className="tag-cloud-stats" aria-label="标签统计">
        <div>
          <dt>标签数量</dt>
          <dd>{cloud?.totalTags ?? 0}</dd>
        </div>
        <div>
          <dt>已标记内容</dt>
          <dd>{taggedContentCount}</dd>
        </div>
        <div>
          <dt>当前最热</dt>
          <dd>{visibleTags[0]?.name ?? '—'}</dd>
        </div>
      </dl>

      <div className="tag-cloud-toolbar">
        <label className="tag-cloud-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            type="search"
            placeholder="搜索标签..."
            aria-label="搜索标签"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button type="button" aria-label="清除标签搜索" onClick={() => setSearch('')}>
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
              onClick={() => setScope(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tag-cloud-surface">
        {loading ? (
          <div className="tag-cloud-loading" aria-label="正在加载标签">
            {Array.from({ length: 18 }, (_, index) => (
              <span key={index} className={`skeleton-${(index % 4) + 1}`} />
            ))}
          </div>
        ) : null}

        {!loading && error ? (
          <div className="tag-cloud-state is-error">
            <Tags className="h-8 w-8" />
            <strong>标签数据加载失败</strong>
            <span>请检查网络连接后重试。</span>
            <Button variant="outline" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-4 w-4" />
              重新加载
            </Button>
          </div>
        ) : null}

        {!loading && !error && visibleTags.length > 0 ? (
          <div className="tag-cloud" aria-label="标签词云">
            {visibleTags.map((item) => {
              const count = getScopedCount(item, scope);
              return (
                <button
                  key={item.name}
                  type="button"
                  className={`tag-cloud-word ${getWeightClass(count, minimum, maximum)} ${getToneClass(item.name)}`}
                  title={`${item.name}：${count} 篇内容`}
                  aria-label={`查看标签 ${item.name} 下的 ${count} 篇内容`}
                  onClick={() => navigate(`/tag-articles?tag=${encodeURIComponent(item.name)}`)}
                >
                  <span>{item.name}</span>
                  <sup>{count}</sup>
                </button>
              );
            })}
          </div>
        ) : null}

        {!loading && !error && visibleTags.length === 0 ? (
          <div className="tag-cloud-state">
            {scope === 'NOTE' ? <NotebookPen className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
            <strong>{search ? '没有匹配的标签' : '当前范围暂无标签'}</strong>
            <span>{search ? '请尝试缩短关键词或切换内容类型。' : '为内容添加标签后会自动出现在这里。'}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
