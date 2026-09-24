import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react';
import { Eye, Minimize2, PanelRightOpen, PencilLine, X } from 'lucide-react';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMarkdown } from '@/hooks/use-markdown';

interface MarkdownEditorPanelProps {
  /** 正文区标题。 */
  title: string;
  /** 当前 Markdown 源码，由所属页面维护。 */
  value: string;
  onChange: (value: string) => void;
  /** 与正文同属一份表单状态的元数据字段。 */
  metadata?: ReactNode;
  /** 是否以覆盖应用布局的沉浸式工作区显示。 */
  fullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  /** 全屏工具栏展示的实时文档标题。 */
  fullscreenTitle?: string;
  /** 复用页面原有保存校验和请求逻辑。 */
  onSave?: () => void;
  saving?: boolean;
}

interface MarkdownPreviewProps {
  source: string;
}

const MIN_LEFT_PANE_PERCENT = 35;
const MAX_LEFT_PANE_PERCENT = 70;
const DEFAULT_LEFT_PANE_PERCENT = 50;

/** 预览保持与详情页一致的 Markdown 解析和引用呈现链路。 */
function MarkdownPreview({ source }: MarkdownPreviewProps) {
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

/** 将分栏比例限制在工作区可读性边界内。 */
function clampPanePercent(value: number): number {
  return Math.min(MAX_LEFT_PANE_PERCENT, Math.max(MIN_LEFT_PANE_PERCENT, value));
}

/**
 * 统一承载 Markdown 编辑、预览与沉浸式工作区。
 * 全屏时仅改变既有编辑器的容器布局，避免 Monaco 因组件重建丢失光标和滚动位置。
 */
export function MarkdownEditorPanel({
  title,
  value,
  onChange,
  metadata,
  fullscreen = false,
  onFullscreenChange,
  fullscreenTitle,
  onSave,
  saving = false
}: MarkdownEditorPanelProps) {
  const [previewing, setPreviewing] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);
  const [leftPanePercent, setLeftPanePercent] = useState(DEFAULT_LEFT_PANE_PERCENT);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const metadataRef = useRef<HTMLElement>(null);
  const metadataButtonRef = useRef<HTMLButtonElement>(null);
  const deferredValue = useDeferredValue(value);
  const previewVisible = fullscreen || previewing;
  const workspaceTitle = fullscreenTitle?.trim() || '未命名 Markdown 文档';
  const metadataInactive = fullscreen && !metadataOpen;

  /** 关闭侧板后将焦点返回到触发按钮，避免键盘焦点停留在不可见表单中。 */
  const closeMetadata = useCallback(() => {
    setMetadataOpen(false);
    metadataButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!fullscreen) {
      setMetadataOpen(false);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    // 全屏覆盖应用布局时，让被覆盖的导航和页头退出键盘焦点顺序。
    const backgroundElements = Array.from(
      document.querySelectorAll<HTMLElement>('.app-topbar, .app-sidebar, .page-head')
    );
    const previousStates = backgroundElements.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute('aria-hidden')
    }));

    backgroundElements.forEach((element) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    return () => {
      previousStates.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
    };
  }, [fullscreen]);

  useEffect(() => {
    const metadataPanel = metadataRef.current;
    if (metadataPanel) {
      metadataPanel.inert = metadataInactive;
    }
  }, [metadataInactive]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        (event.target instanceof Element && event.target.closest('[role="dialog"]')) ||
        document.querySelector('.md-citation-popover')
      ) {
        return;
      }

      event.preventDefault();
      if (metadataOpen) {
        closeMetadata();
        return;
      }
      onFullscreenChange?.(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMetadata, fullscreen, metadataOpen, onFullscreenChange]);

  useEffect(() => {
    if (!metadataOpen) {
      return;
    }

    const firstField = metadataRef.current?.querySelector<HTMLElement>(
      '.form-grid input, .form-grid textarea, .form-grid select'
    );
    firstField?.focus();
  }, [metadataOpen]);

  const updatePaneWidth = (clientX: number) => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const bounds = workspace.getBoundingClientRect();
    if (!bounds.width) {
      return;
    }

    setLeftPanePercent(clampPanePercent(((clientX - bounds.left) / bounds.width) * 100));
  };

  /** 分隔条拖动只影响当前工作区，不会写入表单草稿。 */
  const handleDividerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePaneWidth(event.clientX);
  };

  const handleDividerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updatePaneWidth(event.clientX);
    }
  };

  const handleDividerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current - 5));
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setLeftPanePercent((current) => clampPanePercent(current + 5));
    }
  };

  const workspaceStyle = {
    '--markdown-editor-left-pane': `${leftPanePercent}%`
  } as CSSProperties;

  return (
    <div className={`markdown-editor-workspace${fullscreen ? ' is-fullscreen' : ''}`}>
      <div className="markdown-editor-fullscreen-toolbar" aria-hidden={!fullscreen}>
        <div className="markdown-editor-toolbar-title" title={workspaceTitle}>{workspaceTitle}</div>
        <div className="markdown-editor-toolbar-actions">
          {metadata ? (
            <Button
              ref={metadataButtonRef}
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={metadataOpen}
              aria-controls="markdown-editor-metadata"
              onClick={() => setMetadataOpen((current) => !current)}
            >
              <PanelRightOpen className="h-4 w-4" />
              元数据
            </Button>
          ) : null}
          {onSave ? (
            <Button type="button" size="sm" disabled={saving} onClick={onSave}>
              {saving ? '保存中...' : '保存'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="退出全屏双栏编辑"
            onClick={() => onFullscreenChange?.(false)}
          >
            <Minimize2 className="h-4 w-4" />
            退出
          </Button>
        </div>
      </div>

      {metadata && fullscreen && metadataOpen ? (
        <button
          className="markdown-editor-metadata-backdrop"
          type="button"
          aria-label="关闭元数据面板"
          onClick={closeMetadata}
        />
      ) : null}

      <div className="editor-layout markdown-editor-workspace-body">
        {metadata ? (
          <aside
            ref={metadataRef}
            id="markdown-editor-metadata"
            className={`form-surface markdown-editor-metadata${metadataOpen ? ' is-open' : ''}`}
            aria-label="文档元数据"
            aria-hidden={metadataInactive}
          >
            {fullscreen ? (
              <div className="markdown-editor-metadata-head">
                <strong>元数据</strong>
                <button
                  type="button"
                  className="editor-head-icon-button"
                  aria-label="关闭元数据面板"
                  onClick={closeMetadata}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <div className="form-grid">{metadata}</div>
          </aside>
        ) : null}

        <div className="editor-surface">
          <div className="editor-head">
            <span>{title}</span>
            <div className="editor-head-actions">
              <Badge variant="outline">Markdown</Badge>
              {!fullscreen ? (
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
              ) : null}
            </div>
          </div>

          {fullscreen ? (
            <div className="markdown-editor-mobile-tabs" role="tablist" aria-label="Markdown 工作区视图">
              <button
                type="button"
                role="tab"
                aria-selected={!previewing}
                className={!previewing ? 'is-active' : ''}
                onClick={() => setPreviewing(false)}
              >
                编辑
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewing}
                className={previewing ? 'is-active' : ''}
                onClick={() => setPreviewing(true)}
              >
                预览
              </button>
            </div>
          ) : null}

          <div
            ref={workspaceRef}
            className="markdown-editor-panes"
            data-mobile-view={previewing ? 'preview' : 'edit'}
            style={workspaceStyle}
          >
            <div className={`editor-mode-panel markdown-editor-source-pane${!fullscreen && previewing ? ' is-hidden' : ''}`}>
              <PromptMonacoEditor value={value} onChange={onChange} />
            </div>

            {fullscreen ? (
              <button
                type="button"
                role="separator"
                className="markdown-editor-divider"
                aria-label="调整编辑和预览列宽"
                aria-orientation="vertical"
                aria-valuemin={MIN_LEFT_PANE_PERCENT}
                aria-valuemax={MAX_LEFT_PANE_PERCENT}
                aria-valuenow={Math.round(leftPanePercent)}
                onPointerDown={handleDividerPointerDown}
                onPointerMove={handleDividerPointerMove}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onKeyDown={handleDividerKeyDown}
              />
            ) : null}

            {previewVisible ? (
              <div className="markdown-editor-preview-pane">
                <MarkdownPreview source={fullscreen ? deferredValue : value} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
