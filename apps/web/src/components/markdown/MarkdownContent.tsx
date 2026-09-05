import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent
} from 'react';
import {
  decorateMarkdownAnnotations,
  getMarkdownTextSelection,
  type MarkdownTextSelection
} from '@/components/markdown/annotation-anchor';
import { MarkdownCitationPopover } from '@/components/markdown/MarkdownCitationPopover';
import { cn } from '@/lib/utils';
import type { MarkdownCitationGroup } from '@/hooks/use-markdown';
import type { Annotation } from '@/types/domain';
import { copyText } from '@/utils/clipboard';

interface MarkdownContentProps {
  html: string;
  citationGroups?: MarkdownCitationGroup[];
  className?: string;
  annotations?: Annotation[];
  onAnnotationActivate?: (annotationId: string, trigger: HTMLElement) => void;
  onAnnotationResolutionChange?: (orphanIds: string[]) => void;
  onTextSelection?: (selection: MarkdownTextSelection | null) => void;
}

type MermaidApi = (typeof import('mermaid'))['default'];
type HighlightApi = (typeof import('highlight.js/lib/common'))['default'];

const mermaidSvgCache = new Map<string, string>();
const mermaidRenderingCache = new Map<string, Promise<string>>();
const codeLanguageAliases: Record<string, string> = {
  html: 'xml',
  js: 'javascript',
  jsx: 'javascript',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'xml',
  yml: 'yaml'
};

let mermaidApiPromise: Promise<MermaidApi> | undefined;
let highlightApiPromise: Promise<HighlightApi> | undefined;
let mermaidCounter = 0;
const emptyAnnotations: Annotation[] = [];
const emptyCitationGroups: MarkdownCitationGroup[] = [];

interface ActiveCitation {
  groupIndex: number;
  pinned: boolean;
  trigger: HTMLButtonElement;
}

/** 按需加载 highlight.js 常用语言包，避免普通页面承担语法高亮开销。 */
async function getHighlightApi(): Promise<HighlightApi> {
  if (!highlightApiPromise) {
    highlightApiPromise = import('highlight.js/lib/common').then(({ default: highlight }) => highlight);
  }

  return highlightApiPromise;
}

function highlightCodeBlocks(container: HTMLElement, highlight: HighlightApi): void {
  container.querySelectorAll<HTMLElement>('.md-code-block pre code').forEach((codeElement) => {
    const source = codeElement.textContent ?? '';
    const declaredLanguage =
      codeElement.closest('pre')?.dataset.lang?.trim().toLowerCase().split(/\s+/)[0] ?? '';
    const normalizedLanguage = codeLanguageAliases[declaredLanguage] ?? declaredLanguage;

    try {
      if (normalizedLanguage && highlight.getLanguage(normalizedLanguage)) {
        codeElement.innerHTML = highlight.highlight(source, {
          language: normalizedLanguage,
          ignoreIllegals: true
        }).value;
      } else if (!normalizedLanguage && source.trim()) {
        codeElement.innerHTML = highlight.highlightAuto(source).value;
      }
    } catch {
      // 单个代码块高亮失败时保留其纯文本内容，并继续处理后续代码块。
    } finally {
      codeElement.classList.add('hljs');
    }
  });
}

/** 按需加载并初始化 Mermaid，避免普通 Markdown 页面承担图表依赖开销。 */
async function getMermaidApi(): Promise<MermaidApi> {
  if (!mermaidApiPromise) {
    mermaidApiPromise = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        theme: 'default'
      });
      return mermaid;
    });
  }

  return mermaidApiPromise;
}

/** 同一份 Mermaid 源码只渲染一次，并复用已经生成的 SVG。 */
async function renderMermaid(code: string): Promise<string> {
  const cachedSvg = mermaidSvgCache.get(code);
  if (cachedSvg) {
    return cachedSvg;
  }

  const rendering = mermaidRenderingCache.get(code);
  if (rendering) {
    return rendering;
  }

  const task = getMermaidApi()
    .then((mermaid) => mermaid.render(`mermaid-${Date.now()}-${mermaidCounter++}`, code))
    .then(({ svg }) => {
      mermaidSvgCache.set(code, svg);
      return svg;
    })
    .finally(() => {
      mermaidRenderingCache.delete(code);
    });

  mermaidRenderingCache.set(code, task);
  return task;
}

function showMermaidError(preview: HTMLElement): void {
  const error = document.createElement('span');
  error.className = 'md-mermaid-error';
  error.textContent = 'Mermaid 图表渲染失败，请切换到代码模式检查语法。';
  preview.replaceChildren(error);
}

/** 渲染 Markdown HTML，并为代码高亮、Mermaid 和可选批注补充交互能力。 */
export function MarkdownContent({
  html,
  citationGroups = emptyCitationGroups,
  className,
  annotations = emptyAnnotations,
  onAnnotationActivate,
  onAnnotationResolutionChange,
  onTextSelection
}: MarkdownContentProps) {
  const containerRef = useRef<HTMLElement>(null);
  const copyResetTimers = useRef(new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>());
  const resolutionKeyRef = useRef('');
  const citationCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [activeCitation, setActiveCitation] = useState<ActiveCitation | null>(null);

  const applyAnnotations = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const orphanIds = decorateMarkdownAnnotations(container, annotations);
    const resolutionKey = orphanIds.slice().sort().join(',');
    if (resolutionKey !== resolutionKeyRef.current) {
      resolutionKeyRef.current = resolutionKey;
      onAnnotationResolutionChange?.(orphanIds);
    }
  }, [annotations, onAnnotationResolutionChange]);

  useEffect(() => {
    const timers = copyResetTimers.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const cancelCitationClose = useCallback(() => {
    if (citationCloseTimer.current) {
      clearTimeout(citationCloseTimer.current);
      citationCloseTimer.current = undefined;
    }
  }, []);

  const closeCitation = useCallback(() => {
    cancelCitationClose();
    setActiveCitation(null);
  }, [cancelCitationClose]);

  const scheduleCitationClose = useCallback(() => {
    cancelCitationClose();
    citationCloseTimer.current = setTimeout(() => setActiveCitation(null), 120);
  }, [cancelCitationClose]);

  useEffect(() => {
    return () => cancelCitationClose();
  }, [cancelCitationClose]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.querySelectorAll<HTMLButtonElement>('[data-citation-group]').forEach((button) => {
      const groupIndex = Number(button.dataset.citationGroup);
      const isActive = activeCitation?.trigger === button && activeCitation.groupIndex === groupIndex;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-expanded', String(isActive));
    });
  }, [activeCitation, html]);

  useEffect(() => {
    const container = containerRef.current;
    if (
      activeCitation &&
      (!citationGroups[activeCitation.groupIndex] || !container?.contains(activeCitation.trigger))
    ) {
      closeCitation();
    }
  }, [activeCitation, citationGroups, closeCitation, html]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    const previews = container.querySelectorAll<HTMLElement>('.md-mermaid-preview[data-mermaid-code]');

    previews.forEach((preview) => {
      const encodedCode = preview.dataset.mermaidCode ?? '';
      let code = '';

      try {
        code = decodeURIComponent(encodedCode);
      } catch {
        showMermaidError(preview);
        return;
      }

      void renderMermaid(code)
        .then((svg) => {
          if (active && container.contains(preview) && preview.dataset.mermaidCode === encodedCode) {
            preview.innerHTML = svg;
          }
        })
        .catch(() => {
          if (active && container.contains(preview)) {
            showMermaidError(preview);
          }
        });
    });

    return () => {
      active = false;
    };
  }, [html]);

  useEffect(() => {
    const frame = requestAnimationFrame(applyAnnotations);
    return () => cancelAnimationFrame(frame);
  }, [html, applyAnnotations]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let active = true;
    void getHighlightApi()
      .then((highlight) => {
        if (active) {
          highlightCodeBlocks(container, highlight);
          applyAnnotations();
        }
      })
      .catch(() => {
        // 高亮失败时保留已经转义的纯文本代码，不影响 Markdown 正文渲染。
        if (active) {
          applyAnnotations();
        }
      });

    return () => {
      active = false;
    };
  }, [html, applyAnnotations]);

  const handleCodeCopy = async (button: HTMLButtonElement) => {
    const code = button.closest('.md-code-block')?.querySelector('pre code')?.textContent;
    if (code === undefined || button.disabled) {
      return;
    }

    button.disabled = true;
    const previousTimer = copyResetTimers.current.get(button);
    if (previousTimer) {
      clearTimeout(previousTimer);
    }

    try {
      await copyText(code);
      button.classList.remove('is-error');
      button.classList.add('is-copied');
      button.setAttribute('aria-label', '代码已复制');
      button.title = '代码已复制';
    } catch {
      button.classList.remove('is-copied');
      button.classList.add('is-error');
      button.setAttribute('aria-label', '代码复制失败');
      button.title = '代码复制失败';
    } finally {
      button.disabled = false;
      const timer = setTimeout(() => {
        button.classList.remove('is-copied', 'is-error');
        button.setAttribute('aria-label', '复制代码');
        button.title = '复制代码';
        copyResetTimers.current.delete(button);
      }, 1600);
      copyResetTimers.current.set(button, timer);
    }
  };

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const citationTrigger = target.closest<HTMLButtonElement>('[data-citation-group]');
    if (citationTrigger && event.currentTarget.contains(citationTrigger)) {
      const groupIndex = Number(citationTrigger.dataset.citationGroup);
      if (!Number.isInteger(groupIndex) || !citationGroups[groupIndex]) {
        return;
      }
      cancelCitationClose();
      setActiveCitation((current) => {
        if (current?.trigger === citationTrigger && current.pinned) {
          return null;
        }
        return { groupIndex, trigger: citationTrigger, pinned: true };
      });
      return;
    }

    const annotationTrigger = target.closest<HTMLElement>('[data-annotation-id]');
    if (annotationTrigger && event.currentTarget.contains(annotationTrigger)) {
      onAnnotationActivate?.(annotationTrigger.dataset.annotationId ?? '', annotationTrigger);
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>('[data-code-copy]');
    if (copyButton && event.currentTarget.contains(copyButton)) {
      void handleCodeCopy(copyButton);
      return;
    }

    const toggle = target.closest<HTMLButtonElement>('[data-mermaid-mode]');
    if (!toggle || !event.currentTarget.contains(toggle)) {
      return;
    }

    const block = toggle.closest<HTMLElement>('.md-mermaid-block');
    const preview = block?.querySelector<HTMLElement>('.md-mermaid-preview');
    const code = block?.querySelector<HTMLElement>('.md-mermaid-code');
    if (!block || !preview || !code) {
      return;
    }

    const showPreview = toggle.dataset.mermaidMode === 'preview';
    preview.hidden = !showPreview;
    code.hidden = showPreview;

    block.querySelectorAll<HTMLButtonElement>('[data-mermaid-mode]').forEach((button) => {
      const active = button === toggle;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  const handleCitationPointerEnter = (event: MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const citationTrigger = target.closest<HTMLButtonElement>('[data-citation-group]');
    if (!citationTrigger || !event.currentTarget.contains(citationTrigger)) {
      return;
    }
    const groupIndex = Number(citationTrigger.dataset.citationGroup);
    if (!Number.isInteger(groupIndex) || !citationGroups[groupIndex]) {
      return;
    }
    cancelCitationClose();
    setActiveCitation((current) =>
      current?.trigger === citationTrigger && current.pinned
        ? current
        : { groupIndex, trigger: citationTrigger, pinned: false }
    );
  };

  const handleCitationPointerLeave = (event: MouseEvent<HTMLElement>) => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      return;
    }
    const target = event.target;
    const nextTarget = event.relatedTarget;
    if (!(target instanceof Element)) {
      return;
    }
    const citationTrigger = target.closest<HTMLButtonElement>('[data-citation-group]');
    if (citationTrigger && nextTarget instanceof Node && citationTrigger.contains(nextTarget)) {
      return;
    }
    if (citationTrigger && activeCitation?.trigger === citationTrigger && !activeCitation.pinned) {
      scheduleCitationClose();
    }
  };

  const handleCitationFocus = (event: FocusEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.matches('[data-citation-group]')) {
      return;
    }
    const groupIndex = Number(target.dataset.citationGroup);
    if (!Number.isInteger(groupIndex) || !citationGroups[groupIndex]) {
      return;
    }
    cancelCitationClose();
    setActiveCitation({ groupIndex, trigger: target, pinned: false });
  };

  const publishSelection = () => {
    const container = containerRef.current;
    const selection = window.getSelection();
    onTextSelection?.(container && selection ? getMarkdownTextSelection(container, selection) : null);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      target.matches('.md-annotation-mark') &&
      (event.key === 'Enter' || event.key === ' ')
    ) {
      event.preventDefault();
      onAnnotationActivate?.(target.dataset.annotationId ?? '', target);
      return;
    }
    publishSelection();
  };

  return (
    <>
      <article
        ref={containerRef}
        className={cn('md-surface', annotations.length > 0 || onTextSelection ? 'md-annotation-enabled' : '', className)}
        onClick={handleClick}
        onMouseOver={handleCitationPointerEnter}
        onMouseOut={handleCitationPointerLeave}
        onMouseUp={publishSelection}
        onKeyUp={handleKeyUp}
        onFocus={handleCitationFocus}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {activeCitation && citationGroups[activeCitation.groupIndex] ? (
        <MarkdownCitationPopover
          group={citationGroups[activeCitation.groupIndex]}
          trigger={activeCitation.trigger}
          pinned={activeCitation.pinned}
          onRequestClose={closeCitation}
          onPointerEnter={cancelCitationClose}
          onPointerLeave={scheduleCitationClose}
        />
      ) : null}
    </>
  );
}
