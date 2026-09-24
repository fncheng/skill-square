import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react';
import type { editor as MonacoEditorNamespace } from 'monaco-editor';
import { ArrowDownUp, Eye, Minimize2, PanelRightOpen, PencilLine, X } from 'lucide-react';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarkdown, type MarkdownSourceBlock } from '@/hooks/use-markdown';

interface MarkdownEditorPanelProps {
  /** 正文区标题。 */
  title: string;
  /** 当前 Markdown 源码，由所属页面维护。 */
  value: string;
  onChange: (value: string) => void;
  /** 与正文同属一份表单状态的元数据字段。 */
  metadata?: ReactNode;
  /** 是否以覆盖应用布局的沉浸式工作区显示。 */
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** 全屏工具栏展示的实时文档标题。 */
  fullscreenTitle?: string;
  /** 复用页面原有保存校验和请求逻辑。 */
  onSave?: () => void;
  saving?: boolean;
}

interface MarkdownPreviewProps {
  source: string;
  onScrollContainerChange: (element: HTMLDivElement | null) => void;
  onBlocksRendered: (source: string, sourceBlocks: MarkdownSourceBlock[]) => void;
}

type ScrollSyncSide = 'source' | 'preview';
type MonacoEditor = MonacoEditorNamespace.IStandaloneCodeEditor;

interface ScrollSyncBlock {
  sourceTop: number;
  sourceBottom: number;
  previewTop: number;
  previewBottom: number;
}

interface ScrollMetrics {
  scrollTop: number;
  clientHeight: number;
  maxScrollTop: number;
}

const MIN_LEFT_PANE_PERCENT = 35;
const MAX_LEFT_PANE_PERCENT = 70;
const DEFAULT_LEFT_PANE_PERCENT = 50;
const DESKTOP_SPLIT_MEDIA_QUERY = '(min-width: 961px)';
const SCROLL_ANCHOR_VIEWPORT_RATIO = 0.25;
const SCROLL_WRITE_TOLERANCE = 2;

/** 预览保持与详情页一致的 Markdown 解析和引用呈现链路。 */
function MarkdownPreview({ source, onScrollContainerChange, onBlocksRendered }: MarkdownPreviewProps) {
  const { html, citationGroups, sourceBlocks } = useMarkdown(source, { includeSourceBlocks: true });

  useLayoutEffect(() => {
    onBlocksRendered(source, sourceBlocks);
  }, [onBlocksRendered, source, sourceBlocks]);

  if (!source.trim()) {
    return <div className="editor-preview-empty">暂无可预览的 Markdown 内容</div>;
  }

  return (
    <div ref={onScrollContainerChange} className="editor-preview-scroll">
      <MarkdownContent html={html} citationGroups={citationGroups} className="editor-preview-content" />
    </div>
  );
}

function clampScrollTop(value: number, maxScrollTop: number): number {
  return Math.min(maxScrollTop, Math.max(0, value));
}

/** 将当前块内的位置线性映射到另一列；块间的空白区域按相邻边界补插值。 */
function mapBlockPosition(
  blocks: ScrollSyncBlock[],
  position: number,
  side: ScrollSyncSide
): number | null {
  if (blocks.length === 0) {
    return null;
  }

  const fromTop = side === 'source' ? 'sourceTop' : 'previewTop';
  const fromBottom = side === 'source' ? 'sourceBottom' : 'previewBottom';
  const toTop = side === 'source' ? 'previewTop' : 'sourceTop';
  const toBottom = side === 'source' ? 'previewBottom' : 'sourceBottom';
  const first = blocks[0];
  const last = blocks[blocks.length - 1];

  if (position <= first[fromTop]) {
    return first[toTop];
  }
  if (position >= last[fromBottom]) {
    return last[toBottom];
  }

  // 以块结束位置二分定位，滚动帧只读取已缓存的几何数据。
  let left = 0;
  let right = blocks.length - 1;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (position <= blocks[middle][fromBottom]) {
      right = middle;
    } else {
      left = middle + 1;
    }
  }

  const block = blocks[left];
  if (position < block[fromTop] && left > 0) {
    const previous = blocks[left - 1];
    const gap = Math.max(1, block[fromTop] - previous[fromBottom]);
    const progress = clampScrollTop((position - previous[fromBottom]) / gap, 1);
    return previous[toBottom] + (block[toTop] - previous[toBottom]) * progress;
  }

  const span = Math.max(1, block[fromBottom] - block[fromTop]);
  const progress = clampScrollTop((position - block[fromTop]) / span, 1);
  return block[toTop] + (block[toBottom] - block[toTop]) * progress;
}

/** 将分栏比例限制在工作区可读性边界内。 */
function clampPanePercent(value: number): number {
  return Math.min(MAX_LEFT_PANE_PERCENT, Math.max(MIN_LEFT_PANE_PERCENT, value));
}

/**
 * 统一承载 Markdown 编辑、预览与沉浸式工作区。
 * 全屏时仅改变既有编辑器的容器布局，避免 Monaco 因组件重建丢失光标和滚动位置。
 */
export function MarkdownEditorPanel({
  title,
  value,
  onChange,
  metadata,
  fullscreen = false,
  onFullscreenChange,
  fullscreenTitle,
  onSave,
  saving = false
}: MarkdownEditorPanelProps) {
  const [previewing, setPreviewing] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [leftPanePercent, setLeftPanePercent] = useState(DEFAULT_LEFT_PANE_PERCENT);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [monacoEditor, setMonacoEditor] = useState<MonacoEditor | null>(null);
  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);
  const [previewRenderVersion, setPreviewRenderVersion] = useState(0);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const metadataRef = useRef<HTMLElement>(null);
  const metadataButtonRef = useRef<HTMLButtonElement>(null);
  const deferredValue = useDeferredValue(value);
  const previewBlocksRef = useRef<MarkdownSourceBlock[]>([]);
  const previewSourceRef = useRef('');
  const scrollGeometryRef = useRef<ScrollSyncBlock[]>([]);
  const activeScrollSideRef = useRef<ScrollSyncSide>('source');
  const queuedScrollSideRef = useRef<ScrollSyncSide | null>(null);
  const scrollSyncFrameRef = useRef<number | null>(null);
  const geometryFrameRef = useRef<number | null>(null);
  const scrollSyncActiveRef = useRef(false);
  const programmaticScrollTargetsRef = useRef<Record<ScrollSyncSide, number | null>>({
    source: null,
    preview: null
  });
  const [desktopSplit, setDesktopSplit] = useState(() => window.matchMedia(DESKTOP_SPLIT_MEDIA_QUERY).matches);
  const previewVisible = fullscreen || previewing;
  const previewMatchesSource = deferredValue === value && previewSourceRef.current === value;
  const scrollSyncActive = fullscreen && desktopSplit && scrollSyncEnabled && previewVisible && previewMatchesSource;
  // rAF 闭包可能晚于 React 状态提交执行，因此每次渲染都同步写入当前有效性。
  scrollSyncActiveRef.current = scrollSyncActive;
  const workspaceTitle = fullscreenTitle?.trim() || '未命名 Markdown 文档';
  const metadataInactive = fullscreen && !metadataOpen;

  /** 同一份 deferred Markdown 提交后，才允许其块映射驱动 Monaco 的当前源码。 */
  const handlePreviewBlocksRendered = useCallback((source: string, sourceBlocks: MarkdownSourceBlock[]) => {
    previewSourceRef.current = source;
    previewBlocksRef.current = sourceBlocks;
    setPreviewRenderVersion((current) => current + 1);
  }, []);

  /** 关闭侧板后将焦点返回到触发按钮，避免键盘焦点停留在不可见表单中。 */
  const closeMetadata = useCallback(() => {
    setMetadataOpen(false);
    metadataButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_SPLIT_MEDIA_QUERY);
    const updateDesktopSplit = () => setDesktopSplit(mediaQuery.matches);
    updateDesktopSplit();
    mediaQuery.addEventListener('change', updateDesktopSplit);
    return () => mediaQuery.removeEventListener('change', updateDesktopSplit);
  }, []);

  /** 在预览提交、分栏改宽或异步图表重排后，批量重建两侧的内容块几何缓存。 */
  const rebuildScrollGeometry = useCallback(() => {
    if (
      !scrollSyncActiveRef.current ||
      !monacoEditor ||
      !previewElement ||
      previewSourceRef.current !== value ||
      deferredValue !== value
    ) {
      scrollGeometryRef.current = [];
      return;
    }

    const previewBounds = previewElement.getBoundingClientRect();
    const lineCount = monacoEditor.getModel()?.getLineCount() ?? 0;
    const nextGeometry: ScrollSyncBlock[] = [];
    const previewBlockElements = new Map<string, HTMLElement>();
    previewElement.querySelectorAll<HTMLElement>('[data-md-block-id]').forEach((element) => {
      const blockId = element.dataset.mdBlockId;
      if (blockId) {
        previewBlockElements.set(blockId, element);
      }
    });

    for (const sourceBlock of previewBlocksRef.current) {
      const blockElement = previewBlockElements.get(sourceBlock.blockId);
      if (!blockElement || lineCount === 0) {
        continue;
      }

      const startLine = Math.min(sourceBlock.startLine, lineCount);
      const endLine = Math.min(Math.max(startLine, sourceBlock.endLine), lineCount);
      const blockBounds = blockElement.getBoundingClientRect();
      const sourceTop = monacoEditor.getTopForLineNumber(startLine);
      const sourceBottom = monacoEditor.getBottomForLineNumber(endLine);
      nextGeometry.push({
        sourceTop,
        sourceBottom: Math.max(sourceTop + 1, sourceBottom),
        previewTop: blockBounds.top - previewBounds.top + previewElement.scrollTop,
        previewBottom: Math.max(
          blockBounds.top - previewBounds.top + previewElement.scrollTop + 1,
          blockBounds.bottom - previewBounds.top + previewElement.scrollTop
        )
      });
    }

    scrollGeometryRef.current = nextGeometry;
  }, [deferredValue, monacoEditor, previewElement, value]);

  const performScrollSync = useCallback((side: ScrollSyncSide) => {
    if (!scrollSyncActiveRef.current || !scrollSyncActive || !monacoEditor || !previewElement) {
      return;
    }

    const sourceMetrics: ScrollMetrics = {
      scrollTop: monacoEditor.getScrollTop(),
      clientHeight: monacoEditor.getLayoutInfo().height,
      maxScrollTop: Math.max(0, monacoEditor.getScrollHeight() - monacoEditor.getLayoutInfo().height)
    };
    const previewMetrics: ScrollMetrics = {
      scrollTop: previewElement.scrollTop,
      clientHeight: previewElement.clientHeight,
      maxScrollTop: Math.max(0, previewElement.scrollHeight - previewElement.clientHeight)
    };
    const fromMetrics = side === 'source' ? sourceMetrics : previewMetrics;
    const toMetrics = side === 'source' ? previewMetrics : sourceMetrics;
    const targetSide: ScrollSyncSide = side === 'source' ? 'preview' : 'source';
    let targetScrollTop: number;

    if (fromMetrics.scrollTop <= SCROLL_WRITE_TOLERANCE) {
      targetScrollTop = 0;
    } else if (fromMetrics.scrollTop >= fromMetrics.maxScrollTop - SCROLL_WRITE_TOLERANCE) {
      targetScrollTop = toMetrics.maxScrollTop;
    } else {
      const anchorPosition = fromMetrics.scrollTop + fromMetrics.clientHeight * SCROLL_ANCHOR_VIEWPORT_RATIO;
      const mappedPosition = mapBlockPosition(scrollGeometryRef.current, anchorPosition, side);
      const fallbackPosition = fromMetrics.maxScrollTop > 0
        ? (fromMetrics.scrollTop / fromMetrics.maxScrollTop) * toMetrics.maxScrollTop
        : 0;
      // 比例降级值本身就是目标栏 scrollTop，不能再扣除块锚点使用的视口偏移。
      targetScrollTop = mappedPosition === null
        ? clampScrollTop(fallbackPosition, toMetrics.maxScrollTop)
        : clampScrollTop(
          mappedPosition - toMetrics.clientHeight * SCROLL_ANCHOR_VIEWPORT_RATIO,
          toMetrics.maxScrollTop
        );
    }

    if (Math.abs(targetScrollTop - toMetrics.scrollTop) <= SCROLL_WRITE_TOLERANCE) {
      return;
    }

    programmaticScrollTargetsRef.current[targetSide] = targetScrollTop;
    if (targetSide === 'source') {
      monacoEditor.setScrollTop(targetScrollTop);
    } else {
      previewElement.scrollTop = targetScrollTop;
    }
  }, [monacoEditor, previewElement, scrollSyncActive]);

  /** 连续滚动事件只在动画帧末尾同步一次，避免滚轮滚动时重复读写布局。 */
  const queueScrollSync = useCallback((side: ScrollSyncSide) => {
    if (!scrollSyncActive) {
      return;
    }

    queuedScrollSideRef.current = side;
    if (scrollSyncFrameRef.current !== null) {
      return;
    }

    scrollSyncFrameRef.current = window.requestAnimationFrame(() => {
      scrollSyncFrameRef.current = null;
      if (!scrollSyncActiveRef.current) {
        queuedScrollSideRef.current = null;
        return;
      }
      const queuedSide = queuedScrollSideRef.current;
      queuedScrollSideRef.current = null;
      if (queuedSide) {
        performScrollSync(queuedSide);
      }
    });
  }, [performScrollSync, scrollSyncActive]);

  const requestGeometryRebuild = useCallback(() => {
    if (geometryFrameRef.current !== null) {
      return;
    }

    geometryFrameRef.current = window.requestAnimationFrame(() => {
      geometryFrameRef.current = null;
      if (!scrollSyncActiveRef.current) {
        scrollGeometryRef.current = [];
        return;
      }
      rebuildScrollGeometry();
      queueScrollSync(activeScrollSideRef.current);
    });
  }, [queueScrollSync, rebuildScrollGeometry]);

  useEffect(() => () => {
    if (scrollSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollSyncFrameRef.current);
    }
    if (geometryFrameRef.current !== null) {
      window.cancelAnimationFrame(geometryFrameRef.current);
    }
  }, []);

  /** 同步条件或预览版本变化时，废弃旧 rAF 与其捕获的几何缓存。 */
  useEffect(() => {
    if (scrollSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollSyncFrameRef.current);
      scrollSyncFrameRef.current = null;
    }
    if (geometryFrameRef.current !== null) {
      window.cancelAnimationFrame(geometryFrameRef.current);
      geometryFrameRef.current = null;
    }
    queuedScrollSideRef.current = null;
    programmaticScrollTargetsRef.current = { source: null, preview: null };
    if (!scrollSyncActive) {
      scrollGeometryRef.current = [];
    }
  }, [deferredValue, desktopSplit, fullscreen, previewRenderVersion, scrollSyncActive, value]);

  useEffect(() => {
    if (!scrollSyncActive || !fullscreen || !desktopSplit || !monacoEditor || !previewElement) {
      scrollGeometryRef.current = [];
      return;
    }

    const observer = new ResizeObserver(requestGeometryRebuild);
    const previewContent = previewElement.querySelector<HTMLElement>('.editor-preview-content');
    observer.observe(previewElement);
    if (previewContent) {
      observer.observe(previewContent);
    }
    if (workspaceRef.current) {
      observer.observe(workspaceRef.current);
    }
    const contentSizeSubscription = monacoEditor.onDidContentSizeChange(requestGeometryRebuild);
    window.addEventListener('resize', requestGeometryRebuild);
    requestGeometryRebuild();

    return () => {
      observer.disconnect();
      contentSizeSubscription.dispose();
      window.removeEventListener('resize', requestGeometryRebuild);
    };
  }, [desktopSplit, fullscreen, monacoEditor, previewElement, previewRenderVersion, requestGeometryRebuild, scrollSyncActive]);

  useEffect(() => {
    if (!scrollSyncActive || !monacoEditor || !previewElement) {
      return;
    }

    const handleIncomingScroll = (side: ScrollSyncSide, scrollTop: number) => {
      const programmedTarget = programmaticScrollTargetsRef.current[side];
      if (programmedTarget !== null) {
        programmaticScrollTargetsRef.current[side] = null;
        if (Math.abs(scrollTop - programmedTarget) <= SCROLL_WRITE_TOLERANCE) {
          return;
        }
      }

      activeScrollSideRef.current = side;
      queueScrollSync(side);
    };
    const sourceSubscription = monacoEditor.onDidScrollChange((event) => {
      if (event.scrollTopChanged) {
        handleIncomingScroll('source', monacoEditor.getScrollTop());
      }
    });
    const handlePreviewScroll = () => handleIncomingScroll('preview', previewElement.scrollTop);
    previewElement.addEventListener('scroll', handlePreviewScroll, { passive: true });
    requestGeometryRebuild();

    return () => {
      sourceSubscription.dispose();
      previewElement.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [monacoEditor, previewElement, queueScrollSync, requestGeometryRebuild, scrollSyncActive]);

  useEffect(() => {
    if (!fullscreen) {
      setMetadataOpen(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    // 全屏覆盖应用布局时，让被覆盖的导航和页头退出键盘焦点顺序。
    const backgroundElements = Array.from(
      document.querySelectorAll<HTMLElement>('.app-topbar, .app-sidebar, .page-head')
    );
    const previousStates = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden')
    }));

    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    return () => {
      previousStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
    };
  }, [fullscreen]);

  useEffect(() => {
    const metadataPanel = metadataRef.current;
    if (metadataPanel) {
      metadataPanel.inert = metadataInactive;
    }
  }, [metadataInactive]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        (event.target instanceof Element && event.target.closest('[role="dialog"]')) ||
        document.querySelector('.md-citation-popover')
      ) {
        return;
      }

      event.preventDefault();
      if (metadataOpen) {
        closeMetadata();
        return;
      }
      onFullscreenChange?.(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMetadata, fullscreen, metadataOpen, onFullscreenChange]);

  useEffect(() => {
    if (!metadataOpen) {
      return;
    }

    const firstField = metadataRef.current?.querySelector<HTMLElement>(
      '.form-grid input, .form-grid textarea, .form-grid select'
    );
    firstField?.focus();
  }, [metadataOpen]);

  const updatePaneWidth = (clientX: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const bounds = workspace.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    setLeftPanePercent(clampPanePercent(((clientX - bounds.left) / bounds.width) * 100));
  };

  /** 分隔条拖动只影响当前工作区，不会写入表单草稿。 */
  const handleDividerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePaneWidth(event.clientX);
  };

  const handleDividerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updatePaneWidth(event.clientX);
    }
  };

  const handleDividerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current - 5));
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current + 5));
    }
  };

  const workspaceStyle = {
    '--markdown-editor-left-pane': `${leftPanePercent}%`
  } as CSSProperties;

  return (
    <div className={`markdown-editor-workspace${fullscreen ? ' is-fullscreen' : ''}`}>
      <div className="markdown-editor-fullscreen-toolbar" aria-hidden={!fullscreen}>
        <div className="markdown-editor-toolbar-title" title={workspaceTitle}>{workspaceTitle}</div>
        <div className="markdown-editor-toolbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="markdown-editor-scroll-sync"
            aria-label="切换双栏同步滚动"
            aria-pressed={scrollSyncEnabled}
            onClick={() => {
              setScrollSyncEnabled((current) => !current);
            }}
          >
            <ArrowDownUp className="h-4 w-4" />
            同步滚动
          </Button>
          {metadata ? (
            <Button
              ref={metadataButtonRef}
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={metadataOpen}
              aria-controls="markdown-editor-metadata"
              onClick={() => setMetadataOpen((current) => !current)}
            >
              <PanelRightOpen className="h-4 w-4" />
              元数据
            </Button>
          ) : null}
          {onSave ? (
            <Button type="button" size="sm" disabled={saving} onClick={onSave}>
              {saving ? '保存中...' : '保存'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="退出全屏双栏编辑"
            onClick={() => onFullscreenChange?.(false)}
          >
            <Minimize2 className="h-4 w-4" />
            退出
          </Button>
        </div>
      </div>

      {metadata && fullscreen && metadataOpen ? (
        <button
          className="markdown-editor-metadata-backdrop"
          type="button"
          aria-label="关闭元数据面板"
          onClick={closeMetadata}
        />
      ) : null}

      <div className="editor-layout markdown-editor-workspace-body">
        {metadata ? (
          <aside
            ref={metadataRef}
            id="markdown-editor-metadata"
            className={`form-surface markdown-editor-metadata${metadataOpen ? ' is-open' : ''}`}
            aria-label="文档元数据"
            aria-hidden={metadataInactive}
          >
            {fullscreen ? (
              <div className="markdown-editor-metadata-head">
                <strong>元数据</strong>
                <button
                  type="button"
                  className="editor-head-icon-button"
                  aria-label="关闭元数据面板"
                  onClick={closeMetadata}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <div className="form-grid">{metadata}</div>
          </aside>
        ) : null}

        <div className="editor-surface">
          <div className="editor-head">
            <span>{title}</span>
            <div className="editor-head-actions">
              <Badge variant="outline">Markdown</Badge>
              {!fullscreen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label={previewing ? '切换到编辑模式' : '预览 Markdown'}
                  onClick={() => setPreviewing((current) => !current)}
                >
                  {previewing ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {previewing ? '编辑' : '预览'}
                </Button>
              ) : null}
            </div>
          </div>

          {fullscreen ? (
            <div className="markdown-editor-mobile-tabs" role="tablist" aria-label="Markdown 工作区视图">
              <button
                type="button"
                role="tab"
                aria-selected={!previewing}
                className={!previewing ? 'is-active' : ''}
                onClick={() => setPreviewing(false)}
              >
                编辑
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewing}
                className={previewing ? 'is-active' : ''}
                onClick={() => setPreviewing(true)}
              >
                预览
              </button>
            </div>
          ) : null}

          <div
            ref={workspaceRef}
            className="markdown-editor-panes"
            data-mobile-view={previewing ? 'preview' : 'edit'}
            style={workspaceStyle}
          >
            <div className={`editor-mode-panel markdown-editor-source-pane${!fullscreen && previewing ? ' is-hidden' : ''}`}>
              <PromptMonacoEditor value={value} onChange={onChange} onEditorChange={setMonacoEditor} />
            </div>

            {fullscreen ? (
              <button
                type="button"
                role="separator"
                className="markdown-editor-divider"
                aria-label="调整编辑和预览列宽"
                aria-orientation="vertical"
                aria-valuemin={MIN_LEFT_PANE_PERCENT}
                aria-valuemax={MAX_LEFT_PANE_PERCENT}
                aria-valuenow={Math.round(leftPanePercent)}
                onPointerDown={handleDividerPointerDown}
                onPointerMove={handleDividerPointerMove}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onKeyDown={handleDividerKeyDown}
              />
            ) : null}

            {previewVisible ? (
              <div className="markdown-editor-preview-pane">
                <MarkdownPreview
                  source={fullscreen ? deferredValue : value}
                  onScrollContainerChange={setPreviewElement}
                  onBlocksRendered={handlePreviewBlocksRendered}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
