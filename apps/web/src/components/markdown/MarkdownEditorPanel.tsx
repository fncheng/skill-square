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
import { editor as MonacoEditorApi, type editor as MonacoEditorNamespace } from 'monaco-editor';
import { ArrowDownUp, Eye, ListTree, Minimize2, PanelRightOpen, PencilLine, X } from 'lucide-react';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { MarkdownEditorToc } from '@/components/markdown/MarkdownEditorToc';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarkdown, type MarkdownHeading, type MarkdownSourceBlock } from '@/hooks/use-markdown';
import type { MarkdownEditorPendingTocNavigation, MarkdownEditorTocEntry } from '@/types/markdown-editor';

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
  onBlocksRendered: (source: string, headings: MarkdownHeading[], sourceBlocks: MarkdownSourceBlock[]) => void;
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

interface PreviewBlockCache {
  sourceBlock: MarkdownSourceBlock;
  element: HTMLElement;
}

interface SourcePointerPosition {
  clientX: number;
  clientY: number;
}

interface TocPreviewPosition {
  entry: MarkdownEditorTocEntry;
  previewTop: number;
}

const MIN_LEFT_PANE_PERCENT = 35;
const MAX_LEFT_PANE_PERCENT = 70;
const DEFAULT_LEFT_PANE_PERCENT = 50;
const DESKTOP_SPLIT_MEDIA_QUERY = '(min-width: 961px)';
const WIDE_TOC_MEDIA_QUERY = '(min-width: 1280px)';
const SCROLL_ANCHOR_VIEWPORT_RATIO = 0.25;
const SCROLL_WRITE_TOLERANCE = 2;

/** 预览保持与详情页一致的 Markdown 解析和引用呈现链路。 */
function MarkdownPreview({ source, onScrollContainerChange, onBlocksRendered }: MarkdownPreviewProps) {
  const { html, citationGroups, headings, sourceBlocks } = useMarkdown(source, { includeSourceBlocks: true });

  useLayoutEffect(() => {
    onBlocksRendered(source, headings, sourceBlocks);
  }, [headings, onBlocksRendered, source, sourceBlocks]);

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

/** 按原始源码行定位块，并排除空行和解析前被过滤的引用定义行。 */
function findSourceBlockAtLine(blocks: PreviewBlockCache[], lineNumber: number): PreviewBlockCache | null {
  let left = 0;
  let right = blocks.length - 1;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const block = blocks[middle];
    if (lineNumber < block.sourceBlock.startLine) {
      right = middle - 1;
    } else if (lineNumber > block.sourceBlock.endLine) {
      left = middle + 1;
    } else {
      if (block.sourceBlock.kind === 'other') {
        return block;
      }
      return !block.sourceBlock.renderedSourceLines || block.sourceBlock.renderedSourceLines.has(lineNumber)
        ? block
        : null;
    }
  }

  return null;
}

/** 将分栏比例限制在工作区可读性边界内。 */
function clampPanePercent(value: number): number {
  return Math.min(MAX_LEFT_PANE_PERCENT, Math.max(MIN_LEFT_PANE_PERCENT, value));
}

/** 目录快照对齐 Monaco 的 CRLF/LF 模型换行，保留独立 CR 以维持 Markdown 行号语义。 */
function normalizeLineEndingsForMonacoSnapshot(source: string, modelEol: string): string {
  return source.replace(/\r\n|\n/g, modelEol);
}

/** 标题和同轮源码块按文档顺序一一映射，重复 slug 仍通过 blockId 区分。 */
function createTocEntries(
  source: string,
  headings: MarkdownHeading[],
  sourceBlocks: MarkdownSourceBlock[]
): MarkdownEditorTocEntry[] {
  const headingBlocks = sourceBlocks.filter((block) => block.kind === 'heading');
  return headings.flatMap((heading, index) => {
    const block = headingBlocks[index];
    if (!block) {
      return [];
    }
    return [{
      blockId: block.blockId,
      headingId: heading.id,
      level: heading.level,
      text: heading.text,
      startLine: block.startLine,
      source
    }];
  });
}

/** 返回给定源码行所属的最后一个标题，供光标与滚动位置更新目录状态。 */
function findTocEntryAtLine(entries: MarkdownEditorTocEntry[], lineNumber: number): MarkdownEditorTocEntry | null {
  let activeEntry: MarkdownEditorTocEntry | null = null;
  for (const entry of entries) {
    if (entry.startLine > lineNumber) {
      break;
    }
    activeEntry = entry;
  }
  return activeEntry;
}

/** 从已缓存的预览标题位置二分定位，滚动时不重复读取标题 DOM 几何。 */
function findTocEntryAtPreviewPosition(
  positions: TocPreviewPosition[],
  previewPosition: number
): MarkdownEditorTocEntry | null {
  let left = 0;
  let right = positions.length - 1;
  let activeIndex = -1;
  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    if (positions[middle].previewTop <= previewPosition) {
      activeIndex = middle;
      left = middle + 1;
    } else {
      right = middle - 1;
    }
  }
  return activeIndex >= 0 ? positions[activeIndex].entry : null;
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
  const [tocOpen, setTocOpen] = useState(false);
  const [wideTocLayout, setWideTocLayout] = useState(() => window.matchMedia(WIDE_TOC_MEDIA_QUERY).matches);
  const [tocEntries, setTocEntries] = useState<MarkdownEditorTocEntry[]>([]);
  const [tocSource, setTocSource] = useState('');
  const [activeTocBlockId, setActiveTocBlockId] = useState<string | null>(null);
  const [leftPanePercent, setLeftPanePercent] = useState(DEFAULT_LEFT_PANE_PERCENT);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [monacoEditor, setMonacoEditor] = useState<MonacoEditor | null>(null);
  const [previewElement, setPreviewElement] = useState<HTMLDivElement | null>(null);
  const [previewRenderVersion, setPreviewRenderVersion] = useState(0);
  const [finePointer, setFinePointer] = useState(() => window.matchMedia('(pointer: fine)').matches);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const editorSurfaceRef = useRef<HTMLDivElement>(null);
  const sourcePaneRef = useRef<HTMLDivElement>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const metadataRef = useRef<HTMLElement>(null);
  const metadataButtonRef = useRef<HTMLButtonElement>(null);
  const tocButtonRef = useRef<HTMLButtonElement>(null);
  const deferredValue = useDeferredValue(value);
  const previewBlocksRef = useRef<MarkdownSourceBlock[]>([]);
  const previewBlockCacheRef = useRef<PreviewBlockCache[]>([]);
  const previewSourceRef = useRef('');
  const tocEntriesRef = useRef<MarkdownEditorTocEntry[]>([]);
  const tocPreviewElementsRef = useRef(new Map<string, HTMLElement>());
  const tocPreviewPositionsRef = useRef<TocPreviewPosition[]>([]);
  const tocRestoreOpenRef = useRef(false);
  const fullscreenSessionRef = useRef(false);
  const pendingTocNavigationRef = useRef<MarkdownEditorPendingTocNavigation | null>(null);
  const scrollGeometryRef = useRef<ScrollSyncBlock[]>([]);
  const activeScrollSideRef = useRef<ScrollSyncSide>('source');
  const queuedScrollSideRef = useRef<ScrollSyncSide | null>(null);
  const scrollSyncFrameRef = useRef<number | null>(null);
  const geometryFrameRef = useRef<number | null>(null);
  const previewHighlightFrameRef = useRef<number | null>(null);
  const tocGeometryFrameRef = useRef<number | null>(null);
  const sourcePointerRef = useRef<SourcePointerPosition | null>(null);
  const highlightedPreviewElementRef = useRef<HTMLElement | null>(null);
  const scrollSyncActiveRef = useRef(false);
  const previewHoverActiveRef = useRef(false);
  const programmaticScrollTargetsRef = useRef<Record<ScrollSyncSide, number | null>>({
    source: null,
    preview: null
  });
  const tocProgrammaticScrollUntilRef = useRef<Record<ScrollSyncSide, number>>({ source: 0, preview: 0 });
  const tocProgrammaticCursorLineRef = useRef<number | null>(null);
  const [desktopSplit, setDesktopSplit] = useState(() => window.matchMedia(DESKTOP_SPLIT_MEDIA_QUERY).matches);
  const previewVisible = fullscreen || previewing;
  const previewMatchesSource = deferredValue === value && previewSourceRef.current === value;
  const scrollSyncActive = fullscreen && desktopSplit && scrollSyncEnabled && previewVisible && previewMatchesSource;
  const previewHoverActive = scrollSyncActive && finePointer;
  // rAF 闭包可能晚于 React 状态提交执行，因此每次渲染都同步写入当前有效性。
  scrollSyncActiveRef.current = scrollSyncActive;
  previewHoverActiveRef.current = previewHoverActive;
  const workspaceTitle = fullscreenTitle?.trim() || '未命名 Markdown 文档';
  const tocModal = fullscreen && tocOpen && !wideTocLayout;
  const metadataInactive = fullscreen && (!metadataOpen || tocModal);
  const tocUpdating = tocSource !== value || previewSourceRef.current !== value || deferredValue !== value;
  tocEntriesRef.current = tocEntries;

  /** 预览内容替换或条件失效时，立即撤销旧节点上的高亮类。 */
  const clearPreviewHighlight = useCallback(() => {
    highlightedPreviewElementRef.current?.classList.remove('is-source-hovered');
    highlightedPreviewElementRef.current = null;
  }, []);

  /** 同一份 deferred Markdown 提交后，才允许其块映射驱动 Monaco 的当前源码。 */
  const handlePreviewBlocksRendered = useCallback((
    source: string,
    headings: MarkdownHeading[],
    sourceBlocks: MarkdownSourceBlock[]
  ) => {
    clearPreviewHighlight();
    previewSourceRef.current = source;
    previewBlocksRef.current = sourceBlocks;
    const entries = createTocEntries(source, headings, sourceBlocks);
    tocEntriesRef.current = entries;
    setTocEntries(entries);
    setTocSource(source);
    setActiveTocBlockId((current) => entries.some((entry) => entry.blockId === current) ? current : entries[0]?.blockId ?? null);
    previewBlockCacheRef.current = [];
    scrollGeometryRef.current = [];
    setPreviewRenderVersion((current) => current + 1);
  }, [clearPreviewHighlight]);

  /** 关闭侧板后将焦点返回到触发按钮，避免键盘焦点停留在不可见表单中。 */
  const closeMetadata = useCallback(() => {
    setMetadataOpen(false);
    setTocOpen(tocRestoreOpenRef.current);
    metadataButtonRef.current?.focus();
  }, []);

  /** 关闭目录时恢复工具栏入口焦点，避免焦点遗留在已隐藏的抽屉内。 */
  const closeToc = useCallback(() => {
    setTocOpen(false);
    window.requestAnimationFrame(() => {
      if (fullscreenSessionRef.current && tocButtonRef.current?.getClientRects().length) {
        tocButtonRef.current.focus();
      }
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_SPLIT_MEDIA_QUERY);
    const updateDesktopSplit = () => setDesktopSplit(mediaQuery.matches);
    updateDesktopSplit();
    mediaQuery.addEventListener('change', updateDesktopSplit);
    return () => mediaQuery.removeEventListener('change', updateDesktopSplit);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia(WIDE_TOC_MEDIA_QUERY);
    const updateWideTocLayout = () => setWideTocLayout(mediaQuery.matches);
    updateWideTocLayout();
    mediaQuery.addEventListener('change', updateWideTocLayout);
    return () => mediaQuery.removeEventListener('change', updateWideTocLayout);
  }, []);

  useEffect(() => {
    if (fullscreen && !fullscreenSessionRef.current) {
      // 每次进入全屏按首次视口决定初始状态，之后的断点变化不覆盖用户选择。
      fullscreenSessionRef.current = true;
      setTocOpen(window.matchMedia(WIDE_TOC_MEDIA_QUERY).matches);
      return;
    }
    if (!fullscreen) {
      fullscreenSessionRef.current = false;
      pendingTocNavigationRef.current = null;
      tocProgrammaticScrollUntilRef.current = { source: 0, preview: 0 };
      tocProgrammaticCursorLineRef.current = null;
      if (tocGeometryFrameRef.current !== null) {
        window.cancelAnimationFrame(tocGeometryFrameRef.current);
        tocGeometryFrameRef.current = null;
      }
      setTocOpen(false);
    }
  }, [fullscreen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateFinePointer = () => setFinePointer(mediaQuery.matches);
    updateFinePointer();
    mediaQuery.addEventListener('change', updateFinePointer);
    return () => mediaQuery.removeEventListener('change', updateFinePointer);
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
      previewBlockCacheRef.current = [];
      return;
    }

    const previewBounds = previewElement.getBoundingClientRect();
    const lineCount = monacoEditor.getModel()?.getLineCount() ?? 0;
    const nextGeometry: ScrollSyncBlock[] = [];
    const nextBlockCache: PreviewBlockCache[] = [];
    const previewBlockElements = new Map<string, HTMLElement>();
    previewElement.querySelectorAll<HTMLElement>('[data-md-block-id]').forEach((element) => {
      const blockId = element.dataset.mdBlockId;
      if (blockId) {
        previewBlockElements.set(blockId, element);
      }
    });

    for (const sourceBlock of previewBlocksRef.current) {
      const blockElement = previewBlockElements.get(sourceBlock.blockId);
      if (!blockElement) {
        continue;
      }

      nextBlockCache.push({ sourceBlock, element: blockElement });
      if (lineCount === 0) {
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
    previewBlockCacheRef.current = nextBlockCache;
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

  /** 每帧至多根据当前指针位置命中一次 Monaco 行号，并只切换一个预览块的样式。 */
  const queuePreviewHoverHighlight = useCallback(() => {
    if (previewHighlightFrameRef.current !== null) {
      return;
    }

    previewHighlightFrameRef.current = window.requestAnimationFrame(() => {
      previewHighlightFrameRef.current = null;
      const pointerPosition = sourcePointerRef.current;
      if (
        !previewHoverActiveRef.current ||
        !pointerPosition ||
        !monacoEditor ||
        previewSourceRef.current !== value ||
        deferredValue !== value
      ) {
        clearPreviewHighlight();
        return;
      }

      const target = monacoEditor.getTargetAtClientPoint(pointerPosition.clientX, pointerPosition.clientY);
      if (
        !target ||
        (target.type !== MonacoEditorApi.MouseTargetType.CONTENT_TEXT &&
          target.type !== MonacoEditorApi.MouseTargetType.CONTENT_EMPTY)
      ) {
        clearPreviewHighlight();
        return;
      }

      const lineNumber = target.position?.lineNumber;
      const sourceBlock = lineNumber === undefined
        ? null
        : findSourceBlockAtLine(previewBlockCacheRef.current, lineNumber);
      if (!sourceBlock || sourceBlock.sourceBlock.kind === 'other') {
        clearPreviewHighlight();
        return;
      }

      if (highlightedPreviewElementRef.current === sourceBlock.element) {
        return;
      }

      clearPreviewHighlight();
      sourceBlock.element.classList.add('is-source-hovered');
      highlightedPreviewElementRef.current = sourceBlock.element;
    });
  }, [clearPreviewHighlight, deferredValue, monacoEditor, value]);

  /** 用已提交预览中的块节点建立目录当前位置缓存，不依赖同步滚动是否开启。 */
  const rebuildTocPreviewElements = useCallback(() => {
    const nextElements = new Map<string, HTMLElement>();
    const nextPositions: TocPreviewPosition[] = [];
    if (previewElement && previewSourceRef.current === tocSource) {
      const previewBounds = previewElement.getBoundingClientRect();
      previewElement.querySelectorAll<HTMLElement>('[data-md-block-id]').forEach((element) => {
        const blockId = element.dataset.mdBlockId;
        if (blockId) {
          nextElements.set(blockId, element);
        }
      });
      for (const entry of tocEntriesRef.current) {
        const element = nextElements.get(entry.blockId);
        if (element) {
          nextPositions.push({
            entry,
            previewTop: element.getBoundingClientRect().top - previewBounds.top + previewElement.scrollTop
          });
        }
      }
    }
    tocPreviewElementsRef.current = nextElements;
    tocPreviewPositionsRef.current = nextPositions;
  }, [previewElement, tocSource]);

  /** 合并目录几何重建，滚动帧只读取已缓存的标题位置。 */
  const requestTocGeometryRebuild = useCallback(() => {
    if (tocGeometryFrameRef.current !== null) {
      return;
    }
    tocGeometryFrameRef.current = window.requestAnimationFrame(() => {
      tocGeometryFrameRef.current = null;
      rebuildTocPreviewElements();
    });
  }, [rebuildTocPreviewElements]);

  const updateActiveTocFromSourceLine = useCallback((lineNumber: number) => {
    const entry = findTocEntryAtLine(tocEntriesRef.current, lineNumber);
    setActiveTocBlockId(entry?.blockId ?? null);
  }, []);

  /** 预览顶部标题变化时更新当前章节；程序跳转期间不反向覆盖目录选择。 */
  const updateActiveTocFromPreview = useCallback(() => {
    if (
      !previewElement ||
      previewSourceRef.current !== value ||
      previewElement.clientWidth === 0 ||
      previewElement.clientHeight === 0
    ) {
      return;
    }
    const previewPosition = previewElement.scrollTop + 24;
    const activeEntry = findTocEntryAtPreviewPosition(tocPreviewPositionsRef.current, previewPosition);
    setActiveTocBlockId(activeEntry?.blockId ?? tocEntriesRef.current[0]?.blockId ?? null);
  }, [previewElement, value]);

  const isPaneVisible = useCallback((element: HTMLElement | null) => {
    if (!element) {
      return false;
    }
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  }, []);

  /** 定位目录条目到同一源码快照中的 Monaco 行和预览块；隐藏栏恢复后会补做一次。 */
  const performTocNavigation = useCallback((entry: MarkdownEditorTocEntry, queueWhenHidden: boolean) => {
    const model = monacoEditor?.getModel();
    if (
      !monacoEditor ||
      !model ||
      entry.source !== value ||
      entry.source !== deferredValue ||
      entry.source !== previewSourceRef.current ||
      model.getValue() !== normalizeLineEndingsForMonacoSnapshot(entry.source, model.getEOL())
    ) {
      return;
    }

    const sourceVisible = isPaneVisible(sourcePaneRef.current);
    const previewVisibleNow = isPaneVisible(previewElement);
    const previewTarget = tocPreviewElementsRef.current.get(entry.blockId);
    if (!previewTarget) {
      return;
    }

    const previousPendingNavigation = pendingTocNavigationRef.current;
    const pendingSource = !sourceVisible && (queueWhenHidden || previousPendingNavigation?.pendingSource === true);
    const pendingPreview = !previewVisibleNow && (queueWhenHidden || previousPendingNavigation?.pendingPreview === true);

    if (sourceVisible && (queueWhenHidden || previousPendingNavigation?.pendingSource)) {
      tocProgrammaticCursorLineRef.current = entry.startLine;
      tocProgrammaticScrollUntilRef.current.source = performance.now() + 180;
      if (!queueWhenHidden) {
        // 源码栏刚从隐藏的 Tab 恢复时，先刷新 Monaco 尺寸再计算行定位。
        monacoEditor.layout();
      }
      monacoEditor.setPosition({ lineNumber: entry.startLine, column: 1 });
      monacoEditor.revealLineInCenter(entry.startLine);
    }
    if (previewElement && previewVisibleNow && (queueWhenHidden || previousPendingNavigation?.pendingPreview)) {
      tocProgrammaticScrollUntilRef.current.preview = performance.now() + 180;
      previewElement.scrollTop += previewTarget.getBoundingClientRect().top - previewElement.getBoundingClientRect().top - 24;
    }
    setActiveTocBlockId(entry.blockId);

    if (pendingSource || pendingPreview) {
      pendingTocNavigationRef.current = { entry, source: entry.source, pendingSource, pendingPreview };
    } else {
      pendingTocNavigationRef.current = null;
    }
  }, [deferredValue, isPaneVisible, monacoEditor, previewElement, value]);

  /** 目录点击优先废弃自动同步队列，防止显式章节跳转被旧滚动任务立即覆盖。 */
  const handleTocNavigate = useCallback((entry: MarkdownEditorTocEntry) => {
    if (tocUpdating) {
      return;
    }
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
    pendingTocNavigationRef.current = null;
    performTocNavigation(entry, true);
    if (tocModal) {
      closeToc();
    }
  }, [closeToc, performTocNavigation, tocModal, tocUpdating]);

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
      const tocNavigationInProgress = performance.now() < Math.max(
        tocProgrammaticScrollUntilRef.current.source,
        tocProgrammaticScrollUntilRef.current.preview
      );
      if (!tocNavigationInProgress) {
        queueScrollSync(activeScrollSideRef.current);
      }
      queuePreviewHoverHighlight();
    });
  }, [queuePreviewHoverHighlight, queueScrollSync, rebuildScrollGeometry]);

  useEffect(() => () => {
    if (scrollSyncFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollSyncFrameRef.current);
    }
    if (geometryFrameRef.current !== null) {
      window.cancelAnimationFrame(geometryFrameRef.current);
    }
    if (previewHighlightFrameRef.current !== null) {
      window.cancelAnimationFrame(previewHighlightFrameRef.current);
    }
    if (tocGeometryFrameRef.current !== null) {
      window.cancelAnimationFrame(tocGeometryFrameRef.current);
      tocGeometryFrameRef.current = null;
    }
    clearPreviewHighlight();
  }, [clearPreviewHighlight]);

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
      previewBlockCacheRef.current = [];
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
    if (!fullscreen || !previewElement || previewSourceRef.current !== tocSource) {
      return;
    }
    const observer = new ResizeObserver(requestTocGeometryRebuild);
    const previewContent = previewElement.querySelector<HTMLElement>('.editor-preview-content');
    observer.observe(previewElement);
    if (previewContent) {
      observer.observe(previewContent);
    }
    if (workspaceRef.current) {
      observer.observe(workspaceRef.current);
    }
    window.addEventListener('resize', requestTocGeometryRebuild);
    requestTocGeometryRebuild();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', requestTocGeometryRebuild);
    };
  }, [
    fullscreen,
    previewElement,
    previewRenderVersion,
    previewing,
    requestTocGeometryRebuild,
    tocSource,
    wideTocLayout
  ]);

  useEffect(() => {
    if (!fullscreen || !monacoEditor || !previewElement || !previewMatchesSource) {
      return;
    }

    const handleIncomingScroll = (side: ScrollSyncSide, scrollTop: number): boolean => {
      const programmedTarget = programmaticScrollTargetsRef.current[side];
      if (programmedTarget !== null) {
        programmaticScrollTargetsRef.current[side] = null;
        if (Math.abs(scrollTop - programmedTarget) <= SCROLL_WRITE_TOLERANCE) {
          return true;
        }
      }

      activeScrollSideRef.current = side;
      queueScrollSync(side);
      return false;
    };
    const sourceSubscription = monacoEditor.onDidScrollChange((event) => {
      if (event.scrollTopChanged) {
        const isProgrammaticTocScroll = performance.now() < tocProgrammaticScrollUntilRef.current.source;
        const isProgrammaticSyncScroll = !isProgrammaticTocScroll && scrollSyncActive
          ? handleIncomingScroll('source', monacoEditor.getScrollTop())
          : false;
        if (!isProgrammaticTocScroll && !isProgrammaticSyncScroll) {
          pendingTocNavigationRef.current = null;
          const sourceLine = monacoEditor.getVisibleRanges()[0]?.startLineNumber ?? monacoEditor.getPosition()?.lineNumber;
          if (typeof sourceLine === 'number') {
            updateActiveTocFromSourceLine(sourceLine);
          }
        }
        // 先排队预览跟随滚动，再按静止指针重新命中源码行。
        queuePreviewHoverHighlight();
      }
    });
    const handlePreviewScroll = () => {
      const isProgrammaticTocScroll = performance.now() < tocProgrammaticScrollUntilRef.current.preview;
      const isProgrammaticSyncScroll = !isProgrammaticTocScroll && scrollSyncActive
        ? handleIncomingScroll('preview', previewElement.scrollTop)
        : false;
      if (!isProgrammaticTocScroll && !isProgrammaticSyncScroll) {
        pendingTocNavigationRef.current = null;
        updateActiveTocFromPreview();
      }
    };
    previewElement.addEventListener('scroll', handlePreviewScroll, { passive: true });
    if (scrollSyncActive) {
      requestGeometryRebuild();
    }

    return () => {
      sourceSubscription.dispose();
      previewElement.removeEventListener('scroll', handlePreviewScroll);
    };
  }, [
    monacoEditor,
    previewElement,
    queuePreviewHoverHighlight,
    queueScrollSync,
    requestGeometryRebuild,
    fullscreen,
    previewMatchesSource,
    scrollSyncActive,
    updateActiveTocFromPreview,
    updateActiveTocFromSourceLine
  ]);

  useEffect(() => {
    if (!monacoEditor || !previewMatchesSource) {
      return;
    }
    const cursorSubscription = monacoEditor.onDidChangeCursorPosition((event) => {
      if (tocProgrammaticCursorLineRef.current === event.position.lineNumber) {
        tocProgrammaticCursorLineRef.current = null;
        return;
      }
      pendingTocNavigationRef.current = null;
      updateActiveTocFromSourceLine(event.position.lineNumber);
    });
    if (!pendingTocNavigationRef.current) {
      updateActiveTocFromSourceLine(monacoEditor.getPosition()?.lineNumber ?? 1);
    }
    return () => cursorSubscription.dispose();
  }, [monacoEditor, previewMatchesSource, updateActiveTocFromSourceLine]);

  useLayoutEffect(() => {
    rebuildTocPreviewElements();
    if (previewMatchesSource && !pendingTocNavigationRef.current) {
      updateActiveTocFromPreview();
    }
  }, [previewMatchesSource, previewRenderVersion, rebuildTocPreviewElements, tocEntries, updateActiveTocFromPreview]);

  useEffect(() => {
    const pendingNavigation = pendingTocNavigationRef.current;
    if (
      !pendingNavigation ||
      pendingNavigation.source !== value ||
      pendingNavigation.source !== deferredValue ||
      (!pendingNavigation.pendingSource || !isPaneVisible(sourcePaneRef.current)) &&
      (!pendingNavigation.pendingPreview || !isPaneVisible(previewElement))
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const latestPendingNavigation = pendingTocNavigationRef.current;
      if (
        latestPendingNavigation &&
        latestPendingNavigation.source === value &&
        latestPendingNavigation.source === deferredValue
      ) {
        performTocNavigation(latestPendingNavigation.entry, false);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [
    deferredValue,
    desktopSplit,
    isPaneVisible,
    performTocNavigation,
    previewElement,
    previewing,
    previewRenderVersion,
    value,
    wideTocLayout
  ]);

  useLayoutEffect(() => {
    if (!previewHoverActive) {
      clearPreviewHighlight();
      return;
    }
    queuePreviewHoverHighlight();
  }, [clearPreviewHighlight, previewHoverActive, previewRenderVersion, queuePreviewHoverHighlight]);

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
    if (tocSource !== value) {
      // blockId 仅在单份解析快照内有效，输入变化后不能保留旧目录的当前位置或待跳转请求。
      pendingTocNavigationRef.current = null;
      setActiveTocBlockId(null);
    }
  }, [tocSource, value]);

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
    const editorSurface = editorSurfaceRef.current;
    if (editorSurface) {
      editorSurface.inert = fullscreen && (tocModal || metadataOpen);
    }
  }, [fullscreen, metadataOpen, tocModal]);

  useEffect(() => {
    if (!tocModal) {
      return;
    }
    tocRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus();
  }, [tocModal]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('.md-citation-popover')) {
        return;
      }

      const targetDialog = event.target instanceof Element ? event.target.closest('[role="dialog"]') : null;
      const activeModal = tocModal ? tocRef.current : metadataOpen ? metadataRef.current : null;
      if (event.key === 'Tab' && activeModal && (!targetDialog || targetDialog === activeModal)) {
        const focusableElements = Array.from(
          activeModal.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
          ) ?? []
        );
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          if (!activeModal.contains(document.activeElement)) {
            event.preventDefault();
            (event.shiftKey ? lastElement : firstElement).focus();
          } else if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          } else if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
        return;
      }

      if (
        event.key !== 'Escape' ||
        (targetDialog && targetDialog !== tocRef.current && targetDialog !== metadataRef.current)
      ) {
        return;
      }

      event.preventDefault();
      if (tocOpen) {
        closeToc();
        return;
      }
      if (metadataOpen) {
        closeMetadata();
        return;
      }
      onFullscreenChange?.(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMetadata, closeToc, fullscreen, metadataOpen, onFullscreenChange, tocModal, tocOpen]);

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

  /** 仅记录鼠标位置；实际 Monaco 命中与预览 DOM 更新合并到动画帧中执行。 */
  const handleSourcePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') {
      return;
    }
    sourcePointerRef.current = { clientX: event.clientX, clientY: event.clientY };
    queuePreviewHoverHighlight();
  };

  const handleSourcePointerLeave = () => {
    sourcePointerRef.current = null;
    clearPreviewHighlight();
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
            ref={tocButtonRef}
            type="button"
            variant="outline"
            size="sm"
            className="markdown-editor-toc-toggle"
            aria-label="显示或收起目录"
            title="显示或收起目录"
            aria-expanded={tocOpen}
            aria-controls="markdown-editor-toc"
            onClick={() => {
              if (metadataOpen) {
                setMetadataOpen(false);
              }
              setTocOpen((current) => !current);
            }}
          >
            <ListTree className="h-4 w-4" />
            目录
          </Button>
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
              className="markdown-editor-metadata-toggle"
              aria-expanded={metadataOpen}
              aria-controls="markdown-editor-metadata"
              onClick={() => {
                if (metadataOpen) {
                  closeMetadata();
                  return;
                }
                tocRestoreOpenRef.current = tocOpen;
                setTocOpen(false);
                setMetadataOpen(true);
              }}
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
            className="markdown-editor-exit"
            aria-label="退出全屏双栏编辑"
            onClick={() => onFullscreenChange?.(false)}
          >
            <Minimize2 className="h-4 w-4" />
            退出
          </Button>
        </div>
      </div>

      {fullscreen && (metadataOpen || tocModal) ? (
        <button
          className="markdown-editor-metadata-backdrop"
          type="button"
          aria-label={metadataOpen ? '关闭元数据面板' : '关闭目录'}
          onClick={metadataOpen ? closeMetadata : closeToc}
        />
      ) : null}

      <div className="editor-layout markdown-editor-workspace-body">
        {metadata ? (
          <aside
            ref={metadataRef}
            id="markdown-editor-metadata"
            className={`form-surface markdown-editor-metadata${metadataOpen ? ' is-open' : ''}`}
            role={fullscreen ? 'dialog' : undefined}
            aria-modal={fullscreen || undefined}
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

        {fullscreen && tocOpen ? (
          <div
            ref={tocRef}
            className={`markdown-editor-toc-shell${tocModal ? ' is-modal' : ''}`}
            role={tocModal ? 'dialog' : undefined}
            aria-modal={tocModal || undefined}
            aria-labelledby={tocModal ? 'markdown-editor-toc-title' : undefined}
          >
            <MarkdownEditorToc
              entries={tocEntries}
              activeBlockId={activeTocBlockId}
              isUpdating={tocUpdating}
              onNavigate={handleTocNavigate}
              onClose={closeToc}
            />
          </div>
        ) : null}

        <div ref={editorSurfaceRef} className="editor-surface">
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
            <div
              ref={sourcePaneRef}
              className={`editor-mode-panel markdown-editor-source-pane${!fullscreen && previewing ? ' is-hidden' : ''}`}
              onPointerMove={handleSourcePointerMove}
              onPointerLeave={handleSourcePointerLeave}
            >
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
