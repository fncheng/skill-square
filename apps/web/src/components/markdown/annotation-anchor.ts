import type { Annotation, AnnotationAnchor } from '@/types/domain';

const ignoredSelector = [
  '.md-code-copy',
  '.md-citation-chip',
  '.md-mermaid-controls',
  '.md-mermaid-preview',
  '.md-annotation-pin-stack'
].join(',');
const blockSelector = 'p,li,blockquote,td,th,.md-code-block';
const contextLength = 64;

interface IndexedTextNode {
  node: Text;
  start: number;
  end: number;
}

interface TextIndex {
  text: string;
  nodes: IndexedTextNode[];
}

interface ResolvedAnnotation {
  annotation: Annotation;
  start: number;
  end: number;
}

export interface MarkdownTextSelection {
  anchor: AnnotationAnchor;
  rect: DOMRect;
}

function closestElement(node: Node): Element | null {
  return node instanceof Element ? node : node.parentElement;
}

function buildTextIndex(container: HTMLElement): TextIndex {
  const nodes: IndexedTextNode[] = [];
  const chunks: string[] = [];
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.textContent ?? '';
      const parent = node.parentElement;
      if (!text || !parent || parent.closest(ignoredSelector)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  let current = walker.nextNode();
  while (current) {
    const text = current.textContent ?? '';
    nodes.push({ node: current as Text, start: offset, end: offset + text.length });
    chunks.push(text);
    offset += text.length;
    current = walker.nextNode();
  }

  return { text: chunks.join(''), nodes };
}

function commonSuffixLength(actual: string, expected: string): number {
  const limit = Math.min(actual.length, expected.length);
  let length = 0;
  while (length < limit && actual[actual.length - length - 1] === expected[expected.length - length - 1]) {
    length += 1;
  }
  return length;
}

function commonPrefixLength(actual: string, expected: string): number {
  const limit = Math.min(actual.length, expected.length);
  let length = 0;
  while (length < limit && actual[length] === expected[length]) {
    length += 1;
  }
  return length;
}

function resolvePosition(text: string, annotation: Annotation): { start: number; end: number } | null {
  if (text.slice(annotation.start, annotation.end) === annotation.exact) {
    return { start: annotation.start, end: annotation.end };
  }

  const candidates: Array<{ start: number; score: number }> = [];
  let position = text.indexOf(annotation.exact);
  while (position >= 0) {
    const prefix = text.slice(Math.max(0, position - annotation.prefix.length), position);
    const suffix = text.slice(position + annotation.exact.length, position + annotation.exact.length + annotation.suffix.length);
    candidates.push({
      start: position,
      score: commonSuffixLength(prefix, annotation.prefix) + commonPrefixLength(suffix, annotation.suffix)
    });
    position = text.indexOf(annotation.exact, position + 1);
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((left, right) => right.score - left.score);
  if (candidates.length > 1 && candidates[0].score === candidates[1].score) {
    return null;
  }

  return {
    start: candidates[0].start,
    end: candidates[0].start + annotation.exact.length
  };
}

function findBoundary(
  nodes: IndexedTextNode[],
  offset: number,
  preference: 'start' | 'end'
): { node: Text; offset: number } | null {
  const matches = nodes.filter((item) => offset >= item.start && offset <= item.end);
  if (matches.length === 0) {
    return null;
  }

  const item = preference === 'start' ? matches[matches.length - 1] : matches[0];
  return { node: item.node, offset: offset - item.start };
}

function createAnnotationPin(annotation: Annotation): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'md-annotation-pin';
  button.dataset.annotationId = annotation.id;
  button.dataset.annotationStart = String(annotation.start);
  button.setAttribute('aria-label', `查看批注：${annotation.exact.slice(0, 24)}`);
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path><path d="M8 9h8M8 13h5"></path></svg>';
  return button;
}

function appendPin(mark: HTMLElement, annotation: Annotation) {
  const block = mark.closest<HTMLElement>(blockSelector);
  if (!block) {
    return;
  }

  block.classList.add('md-annotation-anchor-block');
  let stack = block.querySelector<HTMLElement>(':scope > .md-annotation-pin-stack');
  if (!stack) {
    stack = document.createElement('span');
    stack.className = 'md-annotation-pin-stack';
    block.appendChild(stack);
  }
  stack.appendChild(createAnnotationPin(annotation));
}

export function clearMarkdownAnnotations(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>('.md-annotation-mark').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    mark.remove();
    parent.normalize();
  });
  container.querySelectorAll('.md-annotation-pin-stack').forEach((stack) => stack.remove());
  container.querySelectorAll('.md-annotation-anchor-block').forEach((block) => {
    block.classList.remove('md-annotation-anchor-block');
  });
}

export function decorateMarkdownAnnotations(container: HTMLElement, annotations: Annotation[]): string[] {
  clearMarkdownAnnotations(container);
  if (annotations.length === 0) {
    return [];
  }

  const index = buildTextIndex(container);
  const orphanIds: string[] = [];
  const resolved: ResolvedAnnotation[] = [];

  annotations.forEach((annotation) => {
    const position = resolvePosition(index.text, annotation);
    if (!position) {
      orphanIds.push(annotation.id);
      return;
    }
    resolved.push({ annotation, ...position });
  });

  resolved
    .sort((left, right) => right.start - left.start)
    .forEach(({ annotation, start, end }) => {
      const startBoundary = findBoundary(index.nodes, start, 'start');
      const endBoundary = findBoundary(index.nodes, end, 'end');
      if (!startBoundary || !endBoundary) {
        orphanIds.push(annotation.id);
        return;
      }

      try {
        const range = document.createRange();
        range.setStart(startBoundary.node, startBoundary.offset);
        range.setEnd(endBoundary.node, endBoundary.offset);
        const mark = document.createElement('mark');
        mark.className = 'md-annotation-mark';
        mark.dataset.annotationId = annotation.id;
        mark.tabIndex = 0;
        mark.setAttribute('role', 'button');
        mark.setAttribute('aria-label', `查看批注：${annotation.exact.slice(0, 24)}`);
        mark.setAttribute('aria-expanded', 'false');
        mark.appendChild(range.extractContents());
        range.insertNode(mark);
        appendPin(mark, annotation);
      } catch {
        orphanIds.push(annotation.id);
      }
    });

  return Array.from(new Set(orphanIds));
}

export function getMarkdownTextSelection(
  container: HTMLElement,
  selection: Selection
): MarkdownTextSelection | null {
  if (selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) {
    return null;
  }

  const startElement = closestElement(range.startContainer);
  const endElement = closestElement(range.endContainer);
  const startBlock = startElement?.closest(blockSelector);
  const endBlock = endElement?.closest(blockSelector);
  if (!startBlock || startBlock !== endBlock || startElement?.closest(ignoredSelector) || endElement?.closest(ignoredSelector)) {
    return null;
  }

  if (startElement?.closest('.md-annotation-mark') || endElement?.closest('.md-annotation-mark')) {
    return null;
  }

  const cloned = range.cloneContents();
  if (cloned.querySelector?.('.md-annotation-mark')) {
    return null;
  }

  if (!(range.startContainer instanceof Text) || !(range.endContainer instanceof Text)) {
    return null;
  }

  const index = buildTextIndex(container);
  const startNode = index.nodes.find((item) => item.node === range.startContainer);
  const endNode = index.nodes.find((item) => item.node === range.endContainer);
  if (!startNode || !endNode) {
    return null;
  }

  const start = startNode.start + range.startOffset;
  const end = endNode.start + range.endOffset;
  const exact = index.text.slice(start, end);
  if (!exact.trim() || exact.length > 500 || end <= start) {
    return null;
  }

  return {
    anchor: {
      exact,
      prefix: index.text.slice(Math.max(0, start - contextLength), start),
      suffix: index.text.slice(end, end + contextLength),
      start,
      end
    },
    rect: range.getBoundingClientRect()
  };
}
