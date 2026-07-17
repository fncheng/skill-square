import { useState } from 'react';
import { Code2, Eye } from 'lucide-react';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { UiPrototypeFrame } from '@/components/ui-prototype/UiPrototypeFrame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UiPrototypeEditorPanelProps {
  title: string;
  value: string;
  allowExternal: boolean;
  onChange: (value: string) => void;
}

/** 统一承载 HTML 源码编辑与沙箱预览，切换时保留 Monaco 编辑状态。 */
export function UiPrototypeEditorPanel({
  title,
  value,
  allowExternal,
  onChange
}: UiPrototypeEditorPanelProps) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <div className="editor-surface ui-prototype-editor-surface">
      <div className="editor-head">
        <span>HTML 内容</span>
        <div className="editor-head-actions">
          <Badge variant="outline">HTML</Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={previewing ? '切换到源码编辑模式' : '预览 UI 原型'}
            onClick={() => setPreviewing((current) => !current)}
          >
            {previewing ? <Code2 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {previewing ? '编辑' : '预览'}
          </Button>
        </div>
      </div>

      <div className="editor-mode-panel" hidden={previewing}>
        <PromptMonacoEditor value={value} language="html" onChange={onChange} />
      </div>

      {previewing ? (
        value.trim() ? (
          <div className="ui-prototype-editor-preview">
            <UiPrototypeFrame
              prototype={{
                title: title.trim() || '未命名 UI 原型',
                html: value,
                allowExternal
              }}
            />
          </div>
        ) : (
          <div className="editor-preview-empty">暂无可预览的 HTML 内容</div>
        )
      ) : null}
    </div>
  );
}
