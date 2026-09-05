import { useState } from 'react';
import { Eye, PencilLine } from 'lucide-react';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarkdown } from '@/hooks/use-markdown';

interface MarkdownEditorPanelProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
}

function MarkdownPreview({ source }: { source: string }) {
  const { html, citationGroups } = useMarkdown(source);

  if (!source.trim()) {
    return <div className="editor-preview-empty">暂无可预览的 Markdown 内容</div>;
  }

  return (
    <div className="editor-preview-scroll">
      <MarkdownContent html={html} citationGroups={citationGroups} className="editor-preview-content" />
    </div>
  );
}

/** 统一承载 Markdown 编辑器及预览模式，切换时保留 Monaco 的编辑状态。 */
export function MarkdownEditorPanel({ title, value, onChange }: MarkdownEditorPanelProps) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="editor-surface">
      <div className="editor-head">
        <span>{title}</span>
        <div className="editor-head-actions">
          <Badge variant="outline">Markdown</Badge>
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
        </div>
      </div>

      <div className="editor-mode-panel" hidden={previewing}>
        <PromptMonacoEditor value={value} onChange={onChange} />
      </div>

      {previewing ? <MarkdownPreview source={value} /> : null}
    </div>
  );
}
