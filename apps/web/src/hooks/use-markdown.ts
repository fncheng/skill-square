import { useMemo } from 'react';

export interface MarkdownHeading {
  level: number;
  text: string;
  id: string;
}

export interface UseMarkdownReturn {
  html: string;
  headings: MarkdownHeading[];
}

/** 转义 HTML 特殊字符，避免文档内容造成 XSS。 */
function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 生成标题锚点 id，兼容中英文。 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 渲染行内语法：行内代码、粗体、链接、裸 URL 自动链接。
 * 行内代码先以哨兵占位，避免其中的特殊字符被后续规则误处理。
 * 哨兵仅由字母、数字、下划线和 @ 组成，不受 HTML 转义影响，
 * 且几乎不可能与正文冲突。
 */
function renderInline(text: string): string {
  const codeSlots: string[] = [];
  let result = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    codeSlots.push(`<code class="md-inline-code">${escapeHtml(code)}</code>`);
    return `@@CODE_${codeSlots.length - 1}@@`;
  });

  result = escapeHtml(result);
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, url: string) =>
      `<a class="md-link" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
  );
  result = result.replace(
    /(^|[\s(])(https?:\/\/[^\s)]+)/g,
    (_match, prefix: string, url: string) =>
      `${prefix}<a class="md-link" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

  return result.replace(/@@CODE_(\d+)@@/g, (_match, index: string) => codeSlots[Number(index)]);
}

interface ParseResult {
  html: string;
  headings: MarkdownHeading[];
}

/** 将 Markdown 文本解析为 HTML，并收集标题用于目录。 */
function parseMarkdown(source: string): ParseResult {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  const headings: MarkdownHeading[] = [];

  let paragraph: string[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inFence = false;
  let fenceLang = '';
  let fenceLines: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const items = listItems.map((item) => `<li>${renderInline(item)}</li>`).join('');
    blocks.push(`<${listType} class="md-list">${items}</${listType}>`);
    listType = null;
    listItems = [];
  };

  const flushFence = () => {
    const rawCode = fenceLines.join('\n');
    const code = escapeHtml(rawCode);
    const normalizedLang = fenceLang.toLowerCase();

    if (normalizedLang === 'mermaid') {
      const encodedCode = encodeURIComponent(rawCode);
      blocks.push(
        `<section class="md-mermaid-block">` +
          `<div class="md-mermaid-controls" role="group" aria-label="Mermaid 显示模式">` +
            `<button type="button" class="md-mermaid-toggle is-active" data-mermaid-mode="preview" aria-pressed="true">图表</button>` +
            `<button type="button" class="md-mermaid-toggle" data-mermaid-mode="code" aria-pressed="false">代码</button>` +
          `</div>` +
          `<div class="md-mermaid-preview" data-mermaid-code="${encodedCode}" aria-label="Mermaid 图表">` +
            `<span class="md-mermaid-loading">图表渲染中...</span>` +
          `</div>` +
          `<pre class="md-pre md-mermaid-code" hidden><code>${code}</code></pre>` +
        `</section>`
      );
      fenceLines = [];
      fenceLang = '';
      return;
    }

    const langAttr = fenceLang ? ` data-lang="${escapeHtml(fenceLang)}"` : '';
    blocks.push(`<pre class="md-pre"${langAttr}><code>${code}</code></pre>`);
    fenceLines = [];
    fenceLang = '';
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```(.*)$/);
    if (fenceMatch) {
      if (inFence) {
        flushFence();
        inFence = false;
      } else {
        flushParagraph();
        flushList();
        inFence = true;
        fenceLang = fenceMatch[1].trim();
      }
      continue;
    }

    if (inFence) {
      fenceLines.push(line);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      headings.push({ level, text, id });
      blocks.push(`<h${level} id="${id}" class="md-heading">${renderInline(text)}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (ulMatch) {
      flushParagraph();
      if (listType && listType !== 'ul') flushList();
      listType = 'ul';
      listItems.push(ulMatch[1]);
      continue;
    }

    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushParagraph();
      if (listType && listType !== 'ol') flushList();
      listType = 'ol';
      listItems.push(olMatch[1]);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (inFence) flushFence();
  flushParagraph();
  flushList();

  return { html: blocks.join('\n'), headings };
}

/** 记忆化的 Markdown 渲染 hook，返回 HTML 与标题目录。 */
export function useMarkdown(source: string): UseMarkdownReturn {
  return useMemo(() => parseMarkdown(source || ''), [source]);
}
