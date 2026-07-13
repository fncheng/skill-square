import { useEffect, useRef, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { copyText } from '@/utils/clipboard';

interface MarkdownContentProps {
  html: string;
  className?: string;
}

type MermaidApi = (typeof import('mermaid'))['default'];

const mermaidSvgCache = new Map<string, string>();
const mermaidRenderingCache = new Map<string, Promise<string>>();

let mermaidApiPromise: Promise<MermaidApi> | undefined;
let mermaidCounter = 0;

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

/** 渲染 Markdown HTML，并为 Mermaid 代码块补充异步渲染与视图切换。 */
export function MarkdownContent({ html, className }: MarkdownContentProps) {
  const containerRef = useRef<HTMLElement>(null);
  const copyResetTimers = useRef(new Map<HTMLButtonElement, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = copyResetTimers.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

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

  return (
    <article
      ref={containerRef}
      className={cn('md-surface', className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
