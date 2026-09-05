import { useMemo } from 'react';

export interface MarkdownHeading {
  level: number;
  text: string;
  id: string;
}

export interface MarkdownCitationSource {
  /** 引用定义中的标识，用于在 Markdown 原文中定位来源。 */
  id: string;
  /** 正文引用中的可读名称，在未填写标题时作为来源名称回退。 */
  label: string;
  /** 引用定义可选标题，优先展示为来源标题。 */
  title: string;
  /** 已通过协议校验的外部来源地址。 */
  url: string;
  /** 由 URL 派生的站点名称，供紧凑引用按钮展示。 */
  siteName: string;
}

export interface MarkdownCitationGroup {
  sources: MarkdownCitationSource[];
}

export interface UseMarkdownReturn {
  html: string;
  headings: MarkdownHeading[];
  citationGroups: MarkdownCitationGroup[];
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

interface MarkdownReferenceDefinition {
  id: string;
  title: string;
  url: string;
}

interface MarkdownParseContext {
  citationGroups: MarkdownCitationGroup[];
  referenceDefinitions: Map<string, MarkdownReferenceDefinition>;
}

/** 统一 Markdown reference 标识，兼容大小写与连续空白差异。 */
function normalizeReferenceId(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** 仅允许在来源卡片中打开的安全协议。 */
function getSafeCitationUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function isGitHubHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase().replace(/^www\./, '');
  return normalizedHostname === 'github.com' || normalizedHostname.endsWith('.github.com');
}

/** 供渲染器与引用浮层复用的 GitHub 站点判定，避免误匹配同名恶意域名。 */
export function isGitHubCitationUrl(url: string): boolean {
  try {
    return isGitHubHostname(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** 归一化来源站点名，保持按钮和浮层中的 GitHub 品牌一致。 */
export function getCitationSiteName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, '');
    return isGitHubHostname(hostname) ? 'GitHub' : hostname || url;
  } catch {
    return url;
  }
}

/**
 * 在块级解析前移除 reference definition，避免尾部来源定义被渲染为正文。
 * 围栏代码内的文本必须原样保留，防止示例 Markdown 被误识别为定义。
 */
function extractReferenceDefinitions(source: string): { content: string; referenceDefinitions: Map<string, MarkdownReferenceDefinition> } {
  const referenceDefinitions = new Map<string, MarkdownReferenceDefinition>();
  const content: string[] = [];
  let inFence = false;

  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      content.push(line);
      continue;
    }

    if (inFence) {
      content.push(line);
      continue;
    }

    const definition = line.match(/^\s{0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/);
    if (!definition) {
      content.push(line);
      continue;
    }

    const id = normalizeReferenceId(definition[1]);
    const rawUrl = definition[2] ?? definition[3] ?? '';
    const safeUrl = getSafeCitationUrl(rawUrl);
    if (id && safeUrl) {
      referenceDefinitions.set(id, {
        id: definition[1].trim(),
        title: definition[4] ?? definition[5] ?? definition[6] ?? '',
        url: safeUrl
      });
    }
  }

  return { content: content.join('\n'), referenceDefinitions };
}

function renderMarkdownLink(label: string, url: string): string {
  return `<a class="md-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
}

function createCitationSource(
  definition: MarkdownReferenceDefinition,
  label: string
): MarkdownCitationSource {
  return {
    id: definition.id,
    label: label.trim(),
    title: definition.title.trim(),
    url: definition.url,
    siteName: getCitationSiteName(definition.url)
  };
}

function getCitationDisplayName(source: MarkdownCitationSource): string {
  return source.label || source.siteName;
}

function renderCitationChipIcon(source: MarkdownCitationSource): string {
  if (isGitHubCitationUrl(source.url)) {
    return (
      '<svg class="md-citation-chip-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.88-2.78.62-3.37-1.2-3.37-1.2-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .08 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.15-4.56-5.1 0-1.13.39-2.05 1.03-2.78-.1-.26-.45-1.31.1-2.73 0 0 .84-.28 2.75 1.06A9.29 9.29 0 0 1 12 6.8c.85 0 1.7.12 2.5.35 1.9-1.34 2.74-1.06 2.74-1.06.55 1.42.2 2.47.1 2.73.64.73 1.03 1.65 1.03 2.78 0 3.96-2.34 4.83-4.57 5.09.36.32.68.93.68 1.88 0 1.36-.01 2.46-.01 2.8 0 .27.18.59.69.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"></path>' +
      '</svg>'
    );
  }

  return (
    '<svg class="md-citation-chip-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.3 2.46 3.5 5.48 3.5 9S14.3 18.54 12 21c-2.3-2.46-3.5-5.48-3.5-9S9.7 5.46 12 3Z"></path>' +
    '</svg>'
  );
}

function renderCitationChip(groupIndex: number, sources: MarkdownCitationSource[]): string {
  const firstSource = sources[0];
  const label = `${getCitationDisplayName(firstSource)}${sources.length > 1 ? ` +${sources.length - 1}` : ''}`;
  return (
    `<button type="button" class="md-citation-chip" data-citation-group="${groupIndex}" ` +
      `aria-label="查看来源：${escapeHtml(label)}" aria-haspopup="dialog" aria-expanded="false">` +
      renderCitationChipIcon(firstSource) +
      `<span class="md-citation-chip-label">${escapeHtml(label)}</span>` +
    `</button>`
  );
}

/** 仅在数字引用组被紧邻且未转义的一对括号完整包裹时，扩展其替换区间。 */
function getCitationGroupDisplayRange(
  text: string,
  citationStart: number,
  citationEnd: number
): { start: number; end: number } {
  const openingCharacter = text[citationStart - 1];
  const closingCharacter = text[citationEnd];
  const expectedClosingCharacter = openingCharacter === '(' ? ')' : openingCharacter === '（' ? '）' : '';
  const isEscapedOpening = text[citationStart - 2] === '\\';

  if (!expectedClosingCharacter || isEscapedOpening || closingCharacter !== expectedClosingCharacter) {
    return { start: citationStart, end: citationEnd };
  }

  return { start: citationStart - 1, end: citationEnd + 1 };
}

/** 将相邻数字 reference link 聚合为来源按钮，其余 reference link 继续作为普通外链。 */
function renderReferenceLinks(
  text: string,
  context: MarkdownParseContext,
  createSlot: (html: string) => string
): string {
  const referencePattern = /\[([^\]]+)\]\[([^\]]+)\]/g;
  const matches = Array.from(text.matchAll(referencePattern));
  if (matches.length === 0) {
    return text;
  }

  const getDefinition = (match: RegExpMatchArray) =>
    context.referenceDefinitions.get(normalizeReferenceId(match[2]));
  const isCitation = (match: RegExpMatchArray) => /^\d+$/.test(match[2].trim()) && Boolean(getDefinition(match));

  let result = '';
  let cursor = 0;
  let matchIndex = 0;

  while (matchIndex < matches.length) {
    const match = matches[matchIndex];
    const matchStart = match.index ?? 0;

    if (isCitation(match)) {
      const sources: MarkdownCitationSource[] = [];
      let lastEnd = matchStart + match[0].length;
      let currentIndex = matchIndex;

      while (currentIndex < matches.length) {
        const candidate = matches[currentIndex];
        const candidateStart = candidate.index ?? 0;
        const gap = text.slice(lastEnd, candidateStart);
        if ((currentIndex !== matchIndex && !/^[ \t]*$/.test(gap)) || !isCitation(candidate)) {
          break;
        }

        const definition = getDefinition(candidate);
        if (!definition) {
          break;
        }
        sources.push(createCitationSource(definition, candidate[1]));
        lastEnd = candidateStart + candidate[0].length;
        currentIndex += 1;
      }

      const displayRange = getCitationGroupDisplayRange(text, matchStart, lastEnd);
      const groupIndex = context.citationGroups.length;
      context.citationGroups.push({ sources });
      result += text.slice(cursor, displayRange.start);
      result += createSlot(renderCitationChip(groupIndex, sources));
      cursor = displayRange.end;
      matchIndex = currentIndex;
      continue;
    }

    const definition = getDefinition(match);
    result += text.slice(cursor, matchStart);
    result += definition ? createSlot(renderMarkdownLink(match[1], definition.url)) : match[0];
    cursor = matchStart + match[0].length;
    matchIndex += 1;
  }

  return result + text.slice(cursor);
}

/**
 * 渲染行内语法：行内代码、粗体、链接、裸 URL 自动链接。
 * 行内代码先以哨兵占位，避免其中的特殊字符被后续规则误处理。
 * 哨兵仅由字母、数字、下划线和 @ 组成，不受 HTML 转义影响，
 * 且几乎不可能与正文冲突。
 */
function renderInline(text: string, context: MarkdownParseContext): string {
  const slots: string[] = [];
  const createSlot = (html: string) => {
    slots.push(html);
    return `@@MD_SLOT_${slots.length - 1}@@`;
  };

  let result = text.replace(/`([^`]+)`/g, (_match, code: string) =>
    createSlot(`<code class="md-inline-code">${escapeHtml(code)}</code>`)
  );
  result = renderReferenceLinks(result, context, createSlot);
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, url: string) => createSlot(renderMarkdownLink(label, url))
  );

  result = escapeHtml(result);
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(
    /(^|[\s(])(https?:\/\/[^\s)]+)/g,
    (_match, prefix: string, url: string) =>
      `${prefix}<a class="md-link" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
  );

  return result.replace(/@@MD_SLOT_(\d+)@@/g, (_match, index: string) => slots[Number(index)]);
}

interface ParseResult {
  html: string;
  headings: MarkdownHeading[];
  citationGroups: MarkdownCitationGroup[];
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
function renderTable(
  headers: string[],
  alignments: TableAlignment[],
  rows: string[][],
  context: MarkdownParseContext
): string {
  const renderCells = (cells: string[], tag: 'th' | 'td') =>
    headers
      .map((_header, index) => {
        const alignment = alignments[index];
        const alignmentClass = alignment ? ` is-${alignment}` : '';
        const scope = tag === 'th' ? ' scope="col"' : '';
        return `<${tag}${scope} class="md-table-cell${alignmentClass}">${renderInline(cells[index] ?? '', context)}</${tag}>`;
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

/** 判断当前行是否为 Markdown 分隔线，支持常见的横线、星号和下划线写法。 */
function isHorizontalRule(line: string): boolean {
  const normalized = line.trim();
  return /^(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(normalized);
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
function parseMarkdown(source: string, inheritedContext?: MarkdownParseContext): ParseResult {
  const extracted = inheritedContext ? null : extractReferenceDefinitions(source);
  const context: MarkdownParseContext = inheritedContext ?? {
    citationGroups: [],
    referenceDefinitions: extracted?.referenceDefinitions ?? new Map()
  };
  const lines = (extracted?.content ?? source).replace(/\r\n/g, '\n').split('\n');
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
    blocks.push(`<p>${paragraph.map((line) => renderInline(line, context)).join('<br>')}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }
    const items = listItems.map((item) => `<li>${renderInline(item, context)}</li>`).join('');
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

      blocks.push(renderTable(tableHeaders, tableAlignments, tableRows, context));
      lineIndex = nextLineIndex - 1;
      continue;
    }

    const blockquoteMatch = line.match(/^ {0,3}>\s?(.*)$/);
    if (blockquoteMatch) {
      flushParagraph();
      flushList();

      const quoteLines: string[] = [blockquoteMatch[1]];
      let nextLineIndex = lineIndex + 1;
      while (nextLineIndex < lines.length) {
        const nextQuoteMatch = lines[nextLineIndex].match(/^ {0,3}>\s?(.*)$/);
        if (!nextQuoteMatch) {
          break;
        }
        quoteLines.push(nextQuoteMatch[1]);
        nextLineIndex += 1;
      }

      const quote = parseMarkdown(quoteLines.join('\n'), context);
      blocks.push(`<blockquote class="md-blockquote">${quote.html}</blockquote>`);
      lineIndex = nextLineIndex - 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      flushParagraph();
      flushList();
      blocks.push('<hr class="md-divider">');
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
      blocks.push(`<h${level} id="${id}" class="md-heading">${renderInline(text, context)}</h${level}>`);
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

  return { html: blocks.join('\n'), headings, citationGroups: context.citationGroups };
}

/** 记忆化的 Markdown 渲染 hook，返回 HTML 与标题目录。 */
export function useMarkdown(source: string): UseMarkdownReturn {
  return useMemo(() => parseMarkdown(source || ''), [source]);
}
