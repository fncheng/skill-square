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

type TableAlignment = 'left' | 'center' | 'right' | null;

/**
 * 拆分 GFM 表格行，并保留行内代码或反斜杠转义中的竖线。
 * 返回 null 表示当前行不具备表格行结构。
 */
function splitTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) {
    return null;
  }

  const cells: string[] = [];
  let cell = '';
  let codeDelimiterLength = 0;
  let index = trimmed.startsWith('|') ? 1 : 0;
  const end = trimmed.endsWith('|') && !trimmed.endsWith('\\|') ? trimmed.length - 1 : trimmed.length;

  while (index < end) {
    const character = trimmed[index];

    if (character === '\\' && trimmed[index + 1] === '|') {
      cell += '|';
      index += 2;
      continue;
    }

    if (character === '`') {
      let runLength = 1;
      while (trimmed[index + runLength] === '`') {
        runLength += 1;
      }
      if (codeDelimiterLength === 0) {
        codeDelimiterLength = runLength;
      } else if (codeDelimiterLength === runLength) {
        codeDelimiterLength = 0;
      }
      cell += '`'.repeat(runLength);
      index += runLength;
      continue;
    }

    if (character === '|' && codeDelimiterLength === 0) {
      cells.push(cell.trim());
      cell = '';
      index += 1;
      continue;
    }

    cell += character;
    index += 1;
  }

  cells.push(cell.trim());
  return cells.length > 0 ? cells : null;
}

/** 解析 GFM 表头分隔行，同时提取每一列的对齐方式。 */
function parseTableAlignments(line: string, columnCount: number): TableAlignment[] | null {
  const cells = splitTableRow(line);
  if (!cells || cells.length !== columnCount) {
    return null;
  }

  const alignments: TableAlignment[] = [];
  for (const cell of cells) {
    const delimiter = cell.trim();
    if (!/^:?-+:?$/.test(delimiter)) {
      return null;
    }
    const leftAligned = delimiter.startsWith(':');
    const rightAligned = delimiter.endsWith(':');
    alignments.push(leftAligned && rightAligned ? 'center' : rightAligned ? 'right' : leftAligned ? 'left' : null);
  }

  return alignments;
}

/** 渲染带可访问横向滚动容器的 GFM 表格。 */
function renderTable(headers: string[], alignments: TableAlignment[], rows: string[][]): string {
  const renderCells = (cells: string[], tag: 'th' | 'td') =>
    headers
      .map((_header, index) => {
        const alignment = alignments[index];
        const alignmentClass = alignment ? ` is-${alignment}` : '';
        const scope = tag === 'th' ? ' scope="col"' : '';
        return `<${tag}${scope} class="md-table-cell${alignmentClass}">${renderInline(cells[index] ?? '')}</${tag}>`;
      })
      .join('');

  const body = rows.map((row) => `<tr>${renderCells(row, 'td')}</tr>`).join('');

  return (
    `<div class="md-table-scroll" role="region" aria-label="Markdown 表格" tabindex="0">` +
      `<table class="md-table">` +
        `<thead><tr>${renderCells(headers, 'th')}</tr></thead>` +
        (body ? `<tbody>${body}</tbody>` : '') +
      `</table>` +
    `</div>`
  );
}

/** 生成代码块右上角的复制按钮，图标使用 Lucide Copy 与 Check 路径。 */
function renderCodeCopyButton(): string {
  return (
    `<button type="button" class="md-code-copy" data-code-copy aria-label="复制代码" title="复制代码">` +
      `<svg class="md-code-copy-icon" viewBox="0 0 24 24" aria-hidden="true">` +
        `<rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>` +
        `<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>` +
      `</svg>` +
      `<svg class="md-code-copy-success" viewBox="0 0 24 24" aria-hidden="true">` +
        `<path d="m20 6-11 11-5-5"></path>` +
      `</svg>` +
    `</button>`
  );
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
          `<div class="md-code-block md-mermaid-code" hidden>` +
            renderCodeCopyButton() +
            `<pre class="md-pre" data-lang="mermaid"><code>${code}</code></pre>` +
          `</div>` +
        `</section>`
      );
      fenceLines = [];
      fenceLang = '';
      return;
    }

    const langAttr = fenceLang ? ` data-lang="${escapeHtml(fenceLang)}"` : '';
    blocks.push(
      `<div class="md-code-block">` +
        renderCodeCopyButton() +
        `<pre class="md-pre"${langAttr}><code>${code}</code></pre>` +
      `</div>`
    );
    fenceLines = [];
    fenceLang = '';
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
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

    const tableHeaders = splitTableRow(line);
    const tableAlignments = tableHeaders
      ? parseTableAlignments(lines[lineIndex + 1] ?? '', tableHeaders.length)
      : null;
    if (tableHeaders && tableAlignments) {
      flushParagraph();
      flushList();

      const tableRows: string[][] = [];
      let nextLineIndex = lineIndex + 2;
      while (nextLineIndex < lines.length) {
        const row = splitTableRow(lines[nextLineIndex]);
        if (!row) {
          break;
        }
        tableRows.push(row.slice(0, tableHeaders.length));
        nextLineIndex += 1;
      }

      blocks.push(renderTable(tableHeaders, tableAlignments, tableRows));
      lineIndex = nextLineIndex - 1;
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
