import { FileText, ListTree, X } from 'lucide-react';
import type { MarkdownEditorTocEntry } from '@/types/markdown-editor';

interface MarkdownEditorTocProps {
  entries: MarkdownEditorTocEntry[];
  activeBlockId: string | null;
  isUpdating: boolean;
  onNavigate: (entry: MarkdownEditorTocEntry) => void;
  onClose: () => void;
}

/** 呈现全屏 Markdown 编辑器目录，定位和抽屉状态由宿主面板协调。 */
export function MarkdownEditorToc({
  entries,
  activeBlockId,
  isUpdating,
  onNavigate,
  onClose
}: MarkdownEditorTocProps) {
  return (
    <aside id="markdown-editor-toc" className="markdown-editor-toc" aria-labelledby="markdown-editor-toc-title">
      <header className="markdown-editor-toc-head">
        <ListTree className="h-4 w-4" aria-hidden="true" />
        <h2 id="markdown-editor-toc-title">文档目录</h2>
        <span className="markdown-editor-toc-count">{entries.length}</span>
        <button
          type="button"
          className="editor-head-icon-button"
          aria-label="收起目录"
          title="收起目录"
          onClick={onClose}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </header>
      <div className="markdown-editor-toc-scroll">
        {entries.length > 0 ? (
          <nav className="markdown-editor-toc-list" aria-label="文档章节" aria-busy={isUpdating}>
            {entries.map((entry) => (
              <button
                key={entry.blockId}
                type="button"
                className={`markdown-editor-toc-link level-${entry.level}`}
                aria-current={activeBlockId === entry.blockId ? 'location' : undefined}
                disabled={isUpdating}
                title={entry.text}
                onClick={() => onNavigate(entry)}
              >
                <span className="markdown-editor-toc-marker" aria-hidden="true" />
                <span>{entry.text}</span>
              </button>
            ))}
          </nav>
        ) : isUpdating ? (
          <div className="markdown-editor-toc-state" role="status">正在更新目录…</div>
        ) : (
          <div className="markdown-editor-toc-state">
            <FileText className="h-6 w-6" aria-hidden="true" />
            <strong>暂无目录</strong>
            <span>添加 Markdown 标题后将在这里显示。</span>
          </div>
        )}
        {isUpdating && entries.length > 0 ? (
          <p className="markdown-editor-toc-updating" role="status">正在更新目录…</p>
        ) : null}
      </div>
      <footer className="markdown-editor-toc-footer">
        当前章节
        <strong>{entries.find((entry) => entry.blockId === activeBlockId)?.text ?? '—'}</strong>
      </footer>
    </aside>
  );
}
