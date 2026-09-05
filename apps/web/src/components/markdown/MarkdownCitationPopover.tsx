import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Github, Globe2, X } from 'lucide-react';
import { isGitHubCitationUrl, type MarkdownCitationGroup } from '@/hooks/use-markdown';

interface MarkdownCitationPopoverProps {
  group: MarkdownCitationGroup;
  trigger: HTMLElement;
  pinned: boolean;
  onRequestClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

function calculatePosition(trigger: HTMLElement, popoverSize?: { width: number; height: number }): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(popoverSize?.width || 460, window.innerWidth - 28);
  const height = Math.min(popoverSize?.height || 258, window.innerHeight - 28);
  const gap = 10;
  const shouldOpenAbove = rect.bottom + gap + height > window.innerHeight - 14 && rect.top > height;
  const top = shouldOpenAbove ? rect.top - height - gap : rect.bottom + gap;

  return {
    left: Math.max(14, Math.min(rect.left, window.innerWidth - width - 14)),
    top: Math.max(14, Math.min(top, window.innerHeight - height - 14))
  };
}

function useMobileCitationPanel(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 760px)');
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobile;
}

/** 渲染紧凑引用来源卡片，并在移动端降级为带遮罩的底部面板。 */
export function MarkdownCitationPopover({
  group,
  trigger,
  pinned,
  onRequestClose,
  onPointerEnter,
  onPointerLeave
}: MarkdownCitationPopoverProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const popoverRef = useRef<HTMLElement>(null);
  const isMobile = useMobileCitationPanel();
  const source = group.sources[sourceIndex];
  const portalRoot = typeof document === 'undefined' ? null : document.body;

  useEffect(() => {
    setSourceIndex(0);
  }, [group]);

  useLayoutEffect(() => {
    if (isMobile) {
      return;
    }

    const updatePosition = () => {
      const popoverSize = popoverRef.current
        ? { width: popoverRef.current.offsetWidth, height: popoverRef.current.offsetHeight }
        : undefined;
      setPosition(calculatePosition(trigger, popoverSize));
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isMobile, sourceIndex, trigger]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (trigger.contains(target) || popoverRef.current?.contains(target))) {
        return;
      }
      onRequestClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onRequestClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onRequestClose, trigger]);

  if (!portalRoot || !source) {
    return null;
  }

  const sourceTitle = source.title || source.label || source.siteName;
  const SourceIcon = isGitHubCitationUrl(source.url) ? Github : Globe2;
  const canNavigate = group.sources.length > 1;
  const goToPrevious = () => setSourceIndex((current) => (current - 1 + group.sources.length) % group.sources.length);
  const goToNext = () => setSourceIndex((current) => (current + 1) % group.sources.length);

  return createPortal(
    <>
      {isMobile ? (
        <button
          type="button"
          className="md-citation-backdrop"
          aria-label="关闭来源"
          onClick={onRequestClose}
        />
      ) : null}
      <aside
        ref={popoverRef}
        className={`md-citation-popover${isMobile ? ' is-mobile' : ''}`}
        style={isMobile ? undefined : position}
        role="dialog"
        aria-modal={isMobile}
        aria-label="引用来源"
        onPointerEnter={onPointerEnter}
        onPointerLeave={() => {
          if (!pinned) {
            onPointerLeave();
          }
        }}
      >
        <header className="md-citation-popover-head">
          <div className="md-citation-source-brand">
            <SourceIcon aria-hidden="true" />
            <span>{source.siteName}</span>
          </div>
          <div className="md-citation-popover-actions">
            <div className="md-citation-pagination" aria-label="切换来源">
              <button type="button" aria-label="上一条来源" disabled={!canNavigate} onClick={goToPrevious}>
                <ChevronLeft aria-hidden="true" />
              </button>
              <span aria-live="polite">
                {sourceIndex + 1} / {group.sources.length}
              </span>
              <button type="button" aria-label="下一条来源" disabled={!canNavigate} onClick={goToNext}>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <button type="button" className="md-citation-close" aria-label="关闭来源" onClick={onRequestClose}>
              <X aria-hidden="true" />
            </button>
          </div>
        </header>
        <a
          className="md-citation-source-link"
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          onFocus={onPointerEnter}
        >
          <strong>{sourceTitle}</strong>
          <span>{source.url}</span>
        </a>
      </aside>
    </>,
    portalRoot
  );
}
