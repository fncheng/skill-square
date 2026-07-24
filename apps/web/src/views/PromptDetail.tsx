import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, Eye, Pencil, RotateCcw, X } from 'lucide-react';
import { PageHead } from '@/components/layout/PageHead';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { getPrompt, getPromptVersions, rollbackPrompt } from '@/api/prompts';
import { useAuthStore } from '@/stores/auth';
import type { Prompt, PromptVersion } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';
import { getTagStyle } from '@/utils/tag-style';

export function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const isAdmin = useAuthStore((state) => state.status === 'admin');

  const [prompt, setPrompt] = useState<Prompt>();
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion>();
  const [versionDialogVisible, setVersionDialogVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    try {
      const [promptData, versionData] = await Promise.all([getPrompt(id), getPromptVersions(id)]);
      setPrompt(promptData);
      setVersions(versionData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyContent = async () => {
    if (!prompt) {
      return;
    }
    await copyText(prompt.content);
    toast({ title: 'Prompt 内容已复制', variant: 'success' });
  };

  const openVersion = (version: PromptVersion) => {
    setSelectedVersion(version);
    setVersionDialogVisible(true);
  };

  const handleRollback = async (version: PromptVersion) => {
    if (!prompt) {
      return;
    }

    const confirmed = await confirm({
      title: '回滚版本',
      description: `确认回滚到 v${version.version}？回滚后会生成新的版本快照。`,
      confirmText: '回滚'
    });

    if (!confirmed) {
      return;
    }

    await rollbackPrompt(prompt.id, version.id);
    toast({ title: 'Prompt 已回滚', variant: 'success' });
    await load();
  };

  return (
    <section className="relative">
      {loading ? <div className="loading-panel">正在加载 Prompt...</div> : null}

      <PageHead
        title={prompt?.name || 'Prompt 详情'}
        subtitle={prompt?.description}
        back="/prompts"
        actions={
          <>
            <Button variant="outline" onClick={copyContent}>
              <Copy className="h-4 w-4" />
              一键复制
            </Button>
            {isAdmin ? (
              <Button onClick={() => navigate(`/prompts/${prompt?.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
            ) : null}
          </>
        }
      />

      {prompt ? (
        <div className="detail-grid">
          <div className="editor-surface">
            <div className="editor-head">
              <span>Prompt 内容</span>
              <div className="editor-head-actions">
                <Badge variant="outline">只读</Badge>
                <button type="button" className="editor-head-icon-button" title="复制内容" onClick={copyContent}>
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="editor-mode-panel">
              <PromptMonacoEditor value={prompt.content} readOnly />
            </div>
          </div>

          <aside className="detail-surface">
            <div className="detail-meta">
              <div className="meta-item">
                <span className="meta-label">分类</span>
                <span className="meta-value">{prompt.category?.name || '未分类'}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">标签</span>
                <div className="tag-list">
                  {prompt.tags.map((tag) => (
                    <span key={tag.id} className="prompt-card-tag" style={getTagStyle(tag.color)}>
                      {tag.name}
                    </span>
                  ))}
                  {prompt.tags.length === 0 ? <span className="meta-value">无标签</span> : null}
                </div>
              </div>

              <div className="meta-item">
                <span className="meta-label">收藏状态</span>
                <Badge variant={prompt.isFavorite ? 'secondary' : 'outline'}>
                  {prompt.isFavorite ? '已收藏' : '未收藏'}
                </Badge>
              </div>

              <div className="meta-item">
                <span className="meta-label">创建时间</span>
                <span className="meta-value">{formatDateTime(prompt.createdAt)}</span>
              </div>

              <div className="meta-item">
                <span className="meta-label">更新时间</span>
                <span className="meta-value">{formatDateTime(prompt.updatedAt)}</span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="table-surface mt-4">
        <div className="page-head mb-2">
          <div>
            <h2 className="text-lg font-black">版本历史</h2>
            <p className="page-subtitle">每次创建、编辑和回滚都会形成一个快照版本。</p>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>版本</th>
              <th>名称</th>
              <th>分类</th>
              <th>标签</th>
              <th>生成时间</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr key={version.id}>
                <td>
                  <Badge variant="outline">v{version.version}</Badge>
                </td>
                <td className="font-semibold">{version.name}</td>
                <td>{version.categoryName || '未分类'}</td>
                <td>
                  <div className="tag-list">
                    {version.tagNames.map((tagName) => (
                      <Badge key={tagName} variant="secondary">
                        {tagName}
                      </Badge>
                    ))}
                    {version.tagNames.length === 0 ? <span className="meta-value">无标签</span> : null}
                  </div>
                </td>
                <td>{formatDateTime(version.createdAt)}</td>
                <td>
                  <div className="table-actions">
                    <Button variant="outline" size="icon" title="查看版本" onClick={() => openVersion(version)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {isAdmin ? (
                      <Button variant="outline" size="icon" title="回滚" onClick={() => handleRollback(version)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {versions.length === 0 ? <div className="empty-state">暂无版本历史</div> : null}
      </div>

      {versionDialogVisible
        ? createPortal(
            <div className="dialog-overlay">
              <section className="dialog-panel max-w-3xl">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">版本内容</h2>
                    {selectedVersion ? (
                      <p className="text-sm text-muted-foreground">
                        v{selectedVersion.version} · {selectedVersion.categoryName || '未分类'}
                      </p>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setVersionDialogVisible(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {selectedVersion ? (
                  <>
                    <div className="grid gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
                      <div>
                        <span className="font-semibold">名称：</span>
                        {selectedVersion.name}
                      </div>
                      <div>
                        <span className="font-semibold">标签：</span>
                        {selectedVersion.tagNames.join('、') || '无标签'}
                      </div>
                    </div>
                    <pre className="version-content mt-3">{selectedVersion.content}</pre>
                  </>
                ) : null}
              </section>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
