import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BotMessageSquare, FileText, Lightbulb, LoaderCircle, NotebookPen, PanelsTopLeft, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { globalSearch } from '@/api/search';
import type { GlobalSearchItem, GlobalSearchResourceType } from '@/types/domain';
import { cn } from '@/lib/utils';

const resourceConfig: Record<
  GlobalSearchResourceType,
  { label: string; path: string; icon: typeof FileText }
> = {
  PROMPT: { label: 'Prompt', path: '/prompts', icon: FileText },
  SOLUTION: { label: '解决方案', path: '/solutions', icon: Lightbulb },
  NOTE: { label: '学习笔记', path: '/notes', icon: NotebookPen },
  UI_PROTOTYPE: { label: 'UI 原型', path: '/ui-prototypes', icon: PanelsTopLeft },
  MODEL_RESPONSE: { label: '模型回答', path: '/model-responses', icon: BotMessageSquare }
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GlobalSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery('');
    setItems([]);
    setOpen(false);
    setActiveIndex(-1);
  }, [location.pathname]);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setItems([]);
      setLoading(false);
      setError(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setOpen(true);

    const timer = window.setTimeout(async () => {
      try {
        const response = await globalSearch(keyword);
        if (cancelled) {
          return;
        }
        setItems(response.items);
        setActiveIndex(response.items.length > 0 ? 0 : -1);
      } catch {
        if (!cancelled) {
          setItems([]);
          setActiveIndex(-1);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const openItem = (item: GlobalSearchItem) => {
    const resource = resourceConfig[item.resourceType];
    setOpen(false);
    navigate(`${resource.path}/${item.id}`);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (items.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current >= items.length - 1 ? 0 : current + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      return;
    }

    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      openItem(items[activeIndex]);
    }
  };

  const hasQuery = Boolean(query.trim());

  return (
    <div ref={rootRef} className="global-search">
      <div className="global-search-input-wrap">
        <Search className="global-search-input-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          className="global-search-input"
          value={query}
          placeholder="搜索 Prompt、解决方案、笔记和 UI 原型"
          aria-label="全局搜索"
          aria-autocomplete="list"
          aria-controls="global-search-results"
          aria-expanded={open && hasQuery}
          aria-activedescendant={activeIndex >= 0 ? `global-search-result-${activeIndex}` : undefined}
          role="combobox"
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="global-search-clear"
            aria-label="清空全局搜索"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open && hasQuery ? (
        <div className="global-search-panel">
          <div id="global-search-results" className="global-search-results" role="listbox">
            {loading ? (
              <div className="global-search-state">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                <span>正在搜索所有内容...</span>
              </div>
            ) : error ? (
              <div className="global-search-state is-error">搜索暂时不可用，请稍后重试。</div>
            ) : items.length === 0 ? (
              <div className="global-search-state">没有找到标题包含“{query.trim()}”的内容。</div>
            ) : (
              items.map((item, index) => {
                const resource = resourceConfig[item.resourceType];
                const Icon = resource.icon;
                return (
                  <button
                    key={`${item.resourceType}-${item.id}`}
                    id={`global-search-result-${index}`}
                    type="button"
                    className={cn('global-search-result', index === activeIndex && 'is-active')}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openItem(item)}
                  >
                    <span className="global-search-result-icon">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="global-search-result-copy">
                      <strong>{item.title}</strong>
                      <span>{resource.label}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
