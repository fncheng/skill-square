import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Check,
  Edit3,
  Expand,
  Eye,
  EyeOff,
  Loader2,
  MessageSquareText,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react';
import { createAnnotation, deleteAnnotation, getAnnotations, updateAnnotation } from '@/api/annotations';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import type { MarkdownTextSelection } from '@/components/markdown/annotation-anchor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/hooks/use-confirm';
import { useMarkdown, type MarkdownCitationGroup } from '@/hooks/use-markdown';
import { useToast } from '@/hooks/use-toast';
import type { Annotation, AnnotationAnchor, AnnotationResourceType } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

interface MarkdownAnnotationSurfaceProps {
  html: string;
  citationGroups: MarkdownCitationGroup[];
  resourceType: AnnotationResourceType;
  resourceId: string;
  documentUpdatedAt: string;
  readOnly?: boolean;
  onCountChange?: (count: number) => void;
}

export interface MarkdownAnnotationSurfaceHandle {
  openList: () => void;
}

type DialogMode = 'list' | 'reader' | 'editor' | null;

const emptyDraft = '';
const popoverMaxWidth = 560;
const popoverMaxHeight = 620;

function markdownPreview(content: string): string {
  return content
    .replace(/^```.*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculatePopoverPosition(trigger: HTMLElement): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const width = Math.min(popoverMaxWidth, window.innerWidth - 28);
  const estimatedHeight = Math.min(popoverMaxHeight, window.innerHeight - 28);
  const gap = 12;
  let left = rect.right + gap;
  if (left + width > window.innerWidth - 14) {
    left = rect.left - width - gap;
  }

  return {
    left: Math.max(14, Math.min(left, window.innerWidth - width - 14)),
    top: Math.max(14, Math.min(rect.top - 18, window.innerHeight - estimatedHeight - 14))
  };
}

/** 在 Markdown 详情页中承载单人批注的加载、锚点、Popover 与编辑弹窗。 */
export const MarkdownAnnotationSurface = forwardRef<
  MarkdownAnnotationSurfaceHandle,
  MarkdownAnnotationSurfaceProps
>(function MarkdownAnnotationSurface(
  { html, citationGroups, resourceType, resourceId, documentUpdatedAt, readOnly = false, onCountChange },
  ref
) {
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const activeTriggerRef = useRef<HTMLElement | null>(null);
  const editorInputRef = useRef<HTMLTextAreaElement>(null);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [orphanIds, setOrphanIds] = useState<string[]>([]);
  const [marksHidden, setMarksHidden] = useState(false);
  const [selection, setSelection] = useState<MarkdownTextSelection | null>(null);
  const [reattachId, setReattachId] = useState('');
  const [activeAnnotationId, setActiveAnnotationId] = useState('');
  const [popoverPosition, setPopoverPosition] = useState<CSSProperties>({});
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dialogAnnotationId, setDialogAnnotationId] = useState('');
  const [draft, setDraft] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [editorAnchor, setEditorAnchor] = useState<AnnotationAnchor | null>(null);
  const [saving, setSaving] = useState(false);

  const activeAnnotation = annotations.find((annotation) => annotation.id === activeAnnotationId);
  const dialogAnnotation = annotations.find((annotation) => annotation.id === dialogAnnotationId);
  const orphanIdSet = useMemo(() => new Set(orphanIds), [orphanIds]);
  const { html: activeAnnotationHtml, citationGroups: activeAnnotationCitationGroups } = useMarkdown(activeAnnotation?.content ?? '');
  const { html: dialogAnnotationHtml, citationGroups: dialogAnnotationCitationGroups } = useMarkdown(dialogAnnotation?.content ?? '');
  const { html: draftHtml, citationGroups: draftCitationGroups } = useMarkdown(draft);

  const resizeEditorInput = useCallback(() => {
    const input = editorInputRef.current;
    if (!input || dialogMode !== 'editor' || previewing) {
      return;
    }

    const isMobile = window.matchMedia('(max-width: 760px)').matches;
    const preferredMinHeight = isMobile ? 240 : 380;
    const absoluteMaxHeight = isMobile ? 420 : 560;
    const viewportMaxHeight = window.innerHeight * (isMobile ? 0.52 : 0.58);
    const maxHeight = Math.max(220, Math.min(absoluteMaxHeight, viewportMaxHeight));
    const minHeight = Math.min(preferredMinHeight, maxHeight);

    input.style.minHeight = `${minHeight}px`;
    input.style.maxHeight = `${maxHeight}px`;
    input.style.height = 'auto';
    input.style.height = `${Math.max(minHeight, Math.min(input.scrollHeight, maxHeight))}px`;
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [dialogMode, previewing]);

  useLayoutEffect(() => {
    resizeEditorInput();
  }, [draft, resizeEditorInput]);

  useEffect(() => {
    if (dialogMode !== 'editor' || previewing) {
      return;
    }

    window.addEventListener('resize', resizeEditorInput);
    return () => window.removeEventListener('resize', resizeEditorInput);
  }, [dialogMode, previewing, resizeEditorInput]);

  useEffect(() => {
    let active = true;
    setAnnotations([]);
    setOrphanIds([]);
    setSelection(null);
    setActiveAnnotationId('');
    setDialogMode(null);
    setLoading(true);
    setLoadError(false);
    void getAnnotations(resourceType, resourceId)
      .then((items) => {
        if (active) {
          setAnnotations(items);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [resourceId, resourceType, reloadKey]);

  useEffect(() => {
    onCountChange?.(annotations.length);
  }, [annotations.length, onCountChange]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      surfaceRef.current?.querySelectorAll<HTMLElement>('[data-annotation-id]').forEach((element) => {
        const isActive = element.dataset.annotationId === activeAnnotationId;
        element.classList.toggle('is-active', isActive);
        element.setAttribute('aria-expanded', String(isActive));
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeAnnotationId, annotations, orphanIds]);

  const closePopover = useCallback(() => {
    setActiveAnnotationId('');
    activeTriggerRef.current = null;
  }, []);

  useEffect(() => {
    if (!activeAnnotationId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (popoverRef.current?.contains(target) || activeTriggerRef.current?.contains(target)) {
        return;
      }
      closePopover();
    };

    const handleResize = () => {
      const fallbackTrigger = surfaceRef.current?.querySelector<HTMLElement>(
        `[data-annotation-id="${activeAnnotationId}"]`
      );
      const trigger = activeTriggerRef.current?.isConnected ? activeTriggerRef.current : fallbackTrigger;
      if (trigger) {
        activeTriggerRef.current = trigger;
        setPopoverPosition(calculatePopoverPosition(trigger));
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeAnnotationId, closePopover]);

  useEffect(() => {
    if (!dialogMode && !activeAnnotationId) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      if (dialogMode) {
        setDialogMode(null);
      } else {
        closePopover();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeAnnotationId, closePopover, dialogMode]);

  useEffect(() => {
    if (!dialogMode) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [dialogMode]);

  useEffect(() => {
    if (!selection) {
      return;
    }
    const clearSelectionToolbar = () => setSelection(null);
    window.addEventListener('resize', clearSelectionToolbar);
    window.addEventListener('scroll', clearSelectionToolbar, true);
    return () => {
      window.removeEventListener('resize', clearSelectionToolbar);
      window.removeEventListener('scroll', clearSelectionToolbar, true);
    };
  }, [selection]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }
    setSelection(null);
    setReattachId('');
    if (dialogMode === 'editor') {
      setDialogMode(null);
    }
  }, [dialogMode, readOnly]);

  const handleAnnotationActivate = useCallback((annotationId: string, trigger: HTMLElement) => {
    if (!annotationId) {
      return;
    }
    activeTriggerRef.current = trigger;
    setActiveAnnotationId(annotationId);
    setPopoverPosition(calculatePopoverPosition(trigger));
    setSelection(null);
    setReattachId('');
  }, []);

  const handleSelection = useCallback(
    (nextSelection: MarkdownTextSelection | null) => {
      if (readOnly) {
        setSelection(null);
        return;
      }
      setSelection(nextSelection);
      if (nextSelection) {
        closePopover();
      }
    },
    [closePopover, readOnly]
  );

  const openList = useCallback(() => {
    closePopover();
    setDialogMode('list');
    setDialogAnnotationId('');
  }, [closePopover]);

  useImperativeHandle(ref, () => ({ openList }), [openList]);

  const openReader = (annotationId: string) => {
    closePopover();
    setDialogAnnotationId(annotationId);
    setDialogMode('reader');
  };

  const openEditor = (annotation?: Annotation, anchor?: AnnotationAnchor) => {
    if (readOnly) {
      return;
    }
    const isReattaching = Boolean(annotation && anchor && annotation.id === reattachId);
    if (!isReattaching) {
      setReattachId('');
    }
    closePopover();
    setDialogAnnotationId(annotation?.id ?? '');
    setEditorAnchor(anchor ?? (annotation ? {
      exact: annotation.exact,
      prefix: annotation.prefix,
      suffix: annotation.suffix,
      start: annotation.start,
      end: annotation.end
    } : null));
    setDraft(annotation?.content ?? emptyDraft);
    setPreviewing(false);
    setDialogMode('editor');
  };

  const beginReattach = (annotationId: string) => {
    if (readOnly) {
      return;
    }
    setReattachId(annotationId);
    setDialogMode(null);
    setSelection(null);
    toast({ title: '请重新选择批注对应的原文' });
  };

  const handleSelectionAction = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!selection) {
      return;
    }
    if (reattachId) {
      const annotation = annotations.find((item) => item.id === reattachId);
      if (annotation) {
        openEditor(annotation, selection.anchor);
      }
      return;
    }
    openEditor(undefined, selection.anchor);
  };

  const handleSave = async () => {
    if (readOnly) {
      return;
    }
    if (!draft.trim() || !editorAnchor) {
      toast({ title: !draft.trim() ? '请输入批注内容' : '批注原文定位信息缺失', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (dialogAnnotationId) {
        const updated = await updateAnnotation(dialogAnnotationId, {
          content: draft,
          ...editorAnchor,
          documentUpdatedAt
        });
        setAnnotations((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toast({ title: reattachId ? '批注已重新关联' : '批注已更新', variant: 'success' });
      } else {
        const created = await createAnnotation({
          resourceType,
          resourceId,
          content: draft,
          ...editorAnchor,
          documentUpdatedAt
        });
        setAnnotations((current) => [...current, created]);
        toast({ title: '批注已保存', description: 'Markdown 原文未被修改。', variant: 'success' });
      }

      window.getSelection()?.removeAllRanges();
      setDialogMode(null);
      setSelection(null);
      setReattachId('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (annotation: Annotation) => {
    if (readOnly) {
      return;
    }
    const confirmed = await confirmDeletion({
      title: '删除批注',
      description: `删除关联“${annotation.exact.slice(0, 80)}”的批注后无法恢复，Markdown 原文不会被修改。`,
      expectedText: '删除批注'
    });
    if (!confirmed) {
      return;
    }

    await deleteAnnotation(annotation.id);
    setAnnotations((current) => current.filter((item) => item.id !== annotation.id));
    setOrphanIds((current) => current.filter((id) => id !== annotation.id));
    setDialogMode(null);
    closePopover();
    toast({ title: '批注已删除', variant: 'success' });
  };

  const retryLoad = () => {
    setDialogMode(null);
    setReloadKey((current) => current + 1);
  };

  const selectionStyle: CSSProperties | undefined = selection
    ? {
        left: Math.max(82, Math.min(window.innerWidth - 82, selection.rect.left + selection.rect.width / 2)),
        top: Math.max(12, selection.rect.top - 44)
      }
    : undefined;

  const renderListContent = () => {
    if (loading) {
      return (
        <div className="md-annotation-dialog-state">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <strong>正在加载批注</strong>
        </div>
      );
    }
    if (loadError) {
      return (
        <div className="md-annotation-dialog-state">
          <AlertTriangle className="h-7 w-7 text-destructive" />
          <strong>批注加载失败</strong>
          <span>Markdown 正文仍可正常阅读。</span>
          <Button variant="outline" size="sm" onClick={retryLoad}>
            <RefreshCw className="h-4 w-4" />
            重新加载
          </Button>
        </div>
      );
    }
    if (annotations.length === 0) {
      return (
        <div className="md-annotation-dialog-state">
          <MessageSquareText className="h-7 w-7 text-primary" />
          <strong>这篇文档还没有批注</strong>
          <span>{readOnly ? '当前为访客只读模式。' : '关闭弹窗并选择正文内容，即可添加 Markdown 补充。'}</span>
        </div>
      );
    }

    return (
      <div className="md-annotation-list">
        {annotations.map((annotation) => {
          const orphaned = orphanIdSet.has(annotation.id);
          return (
            <article key={annotation.id} className="md-annotation-list-item">
              <button type="button" className="md-annotation-list-main" onClick={() => openReader(annotation.id)}>
                <span className="md-annotation-list-quote">“{annotation.exact}”</span>
                <span className="md-annotation-list-preview">{markdownPreview(annotation.content)}</span>
                <span className="md-annotation-list-time">更新于 {formatDateTime(annotation.updatedAt)}</span>
              </button>
              {orphaned && !readOnly ? (
                <div className="md-annotation-orphan-row">
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    待重新关联
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => beginReattach(annotation.id)}>
                    重新选择原文
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    );
  };

  const portalRoot = typeof document === 'undefined' ? null : document.body;

  return (
    <div
      ref={surfaceRef}
      className={`md-annotation-document${marksHidden ? ' md-annotation-marks-hidden' : ''}`}
    >
      <div className="md-annotation-toolbar">
        <div className="md-annotation-status">
          <span
            className={`md-annotation-status-dot${loadError ? ' is-error' : ''}${reattachId ? ' is-reattaching' : ''}`}
          />
          <span>
            {readOnly
              ? '访客只读模式，可查看已有批注'
              : reattachId
              ? '正在重新关联批注，请选择新的原文'
              : loading
                ? '正在加载批注...'
                : loadError
                  ? '批注加载失败'
                  : '原文与批注分别保存'}
          </span>
          {!readOnly && reattachId ? (
            <button type="button" className="md-annotation-reattach-cancel" onClick={() => setReattachId('')}>
              取消
            </button>
          ) : null}
        </div>
        <div className="md-annotation-toolbar-actions">
          <Button variant="ghost" size="sm" onClick={() => setMarksHidden((current) => !current)}>
            {marksHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {marksHidden ? '显示标记' : '隐藏标记'}
          </Button>
        </div>
      </div>

      <MarkdownContent
        html={html}
        citationGroups={citationGroups}
        className="md-annotation-main-content"
        annotations={annotations}
        onAnnotationActivate={handleAnnotationActivate}
        onAnnotationResolutionChange={setOrphanIds}
        onTextSelection={readOnly ? undefined : handleSelection}
      />

      {!readOnly && selection && !dialogMode ? (
        <div className="md-annotation-selection-toolbar" style={selectionStyle}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleSelectionAction}
          >
            <MessageSquareText className="h-4 w-4" />
            {reattachId ? '重新关联批注' : '添加批注'}
          </button>
        </div>
      ) : null}

      {portalRoot && activeAnnotation ?
        createPortal(
          <>
            <button
              type="button"
              className="md-annotation-popover-backdrop"
              aria-label="关闭批注"
              onClick={closePopover}
            />
            <aside
              ref={popoverRef}
              className="md-annotation-popover"
              style={popoverPosition}
              role="dialog"
              aria-modal="false"
              aria-label="批注内容"
            >
              <header className="md-annotation-popover-head">
                <div>
                  <strong>批注</strong>
                  <span>更新于 {formatDateTime(activeAnnotation.updatedAt)}</span>
                </div>
                <div className="md-annotation-popover-actions">
                  {!readOnly ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="编辑批注"
                      aria-label="编辑批注"
                      onClick={() => openEditor(activeAnnotation)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    title="展开查看"
                    aria-label="展开查看批注"
                    onClick={() => openReader(activeAnnotation.id)}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                  {!readOnly ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="删除批注"
                      aria-label="删除批注"
                      onClick={() => void handleDelete(activeAnnotation)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="icon" title="关闭" aria-label="关闭批注" onClick={closePopover}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <div className="md-annotation-popover-body">
                <div className="md-annotation-quote">
                  <strong>关联原文</strong>
                  <span>“{activeAnnotation.exact}”</span>
                </div>
                <MarkdownContent
                  html={activeAnnotationHtml}
                  citationGroups={activeAnnotationCitationGroups}
                  className="md-annotation-rendered-content"
                />
              </div>
            </aside>
          </>,
          portalRoot
        ) : null}

      {portalRoot && dialogMode ?
        createPortal(
          <div
            className="md-annotation-dialog-overlay"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !saving) {
                setDialogMode(null);
              }
            }}
          >
            <section className="md-annotation-dialog" role="dialog" aria-modal="true" aria-label="批注弹窗">
              <header className="md-annotation-dialog-head">
                <strong>
                  {dialogMode === 'list' ? '全部批注' : dialogMode === 'reader' ? '批注详情' : dialogAnnotation ? '编辑批注' : '新增批注'}
                </strong>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="关闭批注弹窗"
                  disabled={saving}
                  onClick={() => setDialogMode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </header>

              <div className="md-annotation-dialog-body">
                {dialogMode === 'list' ? renderListContent() : null}

                {dialogMode === 'reader' && dialogAnnotation ? (
                  <>
                    <div className="md-annotation-quote">
                      <strong>关联原文</strong>
                      <span>“{dialogAnnotation.exact}”</span>
                    </div>
                    <MarkdownContent
                      html={dialogAnnotationHtml}
                      citationGroups={dialogAnnotationCitationGroups}
                      className="md-annotation-dialog-preview"
                    />
                  </>
                ) : null}

                {dialogMode === 'editor' && editorAnchor ? (
                  <>
                    <div className="md-annotation-quote">
                      <strong>关联原文</strong>
                      <span>“{editorAnchor.exact}”</span>
                    </div>
                    <div className="md-annotation-editor-tabs" role="tablist">
                      <button
                        type="button"
                        role="tab"
                        className={!previewing ? 'is-active' : ''}
                        aria-selected={!previewing}
                        onClick={() => setPreviewing(false)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        role="tab"
                        className={previewing ? 'is-active' : ''}
                        aria-selected={previewing}
                        onClick={() => setPreviewing(true)}
                      >
                        预览
                      </button>
                    </div>
                    {previewing ? (
                      draft.trim() ? (
                        <MarkdownContent
                          html={draftHtml}
                          citationGroups={draftCitationGroups}
                          className="md-annotation-dialog-preview"
                        />
                      ) : (
                        <div className="md-annotation-preview-empty">暂无可预览的 Markdown 内容</div>
                      )
                    ) : (
                      <>
                        <Textarea
                          autoFocus
                          ref={editorInputRef}
                          className="md-annotation-editor-input"
                          value={draft}
                          maxLength={50000}
                          placeholder="使用 Markdown 补充异常情况、执行经验或相关说明..."
                          onChange={(event) => setDraft(event.target.value)}
                        />
                        <p className="md-annotation-editor-help">
                          支持与正文相同的 Markdown、代码高亮、代码复制和 Mermaid 渲染。
                        </p>
                      </>
                    )}
                  </>
                ) : null}
              </div>

              <footer className="md-annotation-dialog-footer">
                {dialogMode === 'reader' && dialogAnnotation ? (
                  <>
                    {!readOnly ? (
                      <Button variant="outline" onClick={() => void handleDelete(dialogAnnotation)}>
                        <Trash2 className="h-4 w-4" />
                        删除
                      </Button>
                    ) : null}
                    <span className="flex-1" />
                    <Button variant="outline" onClick={() => setDialogMode(null)}>关闭</Button>
                    {!readOnly ? (
                      <Button onClick={() => openEditor(dialogAnnotation)}>
                        <Edit3 className="h-4 w-4" />
                        编辑
                      </Button>
                    ) : null}
                  </>
                ) : null}
                {dialogMode === 'editor' ? (
                  <>
                    <Button variant="outline" disabled={saving} onClick={() => setDialogMode(null)}>取消</Button>
                    <Button disabled={saving || !draft.trim()} onClick={() => void handleSave()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      {saving ? '保存中...' : '保存批注'}
                    </Button>
                  </>
                ) : null}
                {dialogMode === 'list' ? (
                  <Button variant="outline" onClick={() => setDialogMode(null)}>关闭</Button>
                ) : null}
              </footer>
            </section>
          </div>,
          portalRoot
        ) : null}
    </div>
  );
});

MarkdownAnnotationSurface.displayName = 'MarkdownAnnotationSurface';
