import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

// 使用本地打包的 monaco，避免默认从 CDN 加载，保证离线部署可用。
window.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker();
  }
};

loader.config({ monaco });

interface PromptMonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

export function PromptMonacoEditor({
  value,
  onChange,
  language = 'markdown',
  readOnly = false
}: PromptMonacoEditorProps) {
  return (
    <div className="monaco-host">
      <Editor
        value={value}
        language={language}
        height="100%"
        onChange={(next) => onChange?.(next ?? '')}
        options={{
          readOnly,
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          fontSize: 14,
          lineHeight: 22,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'line',
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
          }
        }}
      />
    </div>
  );
}
