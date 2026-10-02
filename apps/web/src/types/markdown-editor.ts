/** 全屏 Markdown 编辑器目录中的一个可定位标题。 */
export interface MarkdownEditorTocEntry {
  /** Markdown 渲染块的唯一标识，用于避免重复标题跳转到错误节点。 */
  blockId: string;
  /** 既有 Markdown 标题锚点，仅供展示语义保留，不用于编辑器定位。 */
  headingId: string;
  level: number;
  text: string;
  /** 标题在未过滤引用定义的原始 Markdown 中的行号。 */
  startLine: number;
  /** 生成目录时对应的完整 Markdown 快照，用于拦截过时跳转。 */
  source: string;
}

/** 窄屏隐藏栏恢复可见后需要执行的一次目录定位。 */
export interface MarkdownEditorPendingTocNavigation {
  entry: MarkdownEditorTocEntry;
  source: string;
  /** 编辑栏在点击目录时不可见，需要在 Monaco 完成布局后补做定位。 */
  pendingSource: boolean;
  /** 预览栏在点击目录时不可见，需要在恢复显示后补做定位。 */
  pendingPreview: boolean;
}
