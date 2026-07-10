import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { createTag, deleteTag, getTags, updateTag, type TagPayload } from '@/api/tags';
import type { Tag } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

const emptyForm: TagPayload = { name: '', color: '#3b82f6' };

export function TagManage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<TagPayload>(emptyForm);

  const loadTags = async () => {
    setLoading(true);
    try {
      setTags(await getTags());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const openCreateDialog = () => {
    setEditingId(undefined);
    setForm(emptyForm);
    setDialogVisible(true);
  };

  const openEditDialog = (tag: Tag) => {
    setEditingId(tag.id);
    setForm({ name: tag.name, color: tag.color });
    setDialogVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: '请输入标签名称', variant: 'destructive' });
      return;
    }

    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.color)) {
      toast({ title: '请输入合法的 HEX 颜色', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: TagPayload = {
        name: form.name.trim(),
        color: form.color
      };

      if (editingId) {
        await updateTag(editingId, payload);
      } else {
        await createTag(payload);
      }
      toast({ title: '标签已保存', variant: 'success' });
      setDialogVisible(false);
      await loadTags();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    const confirmed = await confirm({
      title: '删除标签',
      description: `确认删除标签「${tag.name}」？Prompt 与该标签的关联将被删除。`,
      confirmText: '删除',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    await deleteTag(tag.id);
    toast({ title: '标签已删除', variant: 'success' });
    await loadTags();
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">标签管理</h1>
          <p className="page-subtitle">维护可复用的 Prompt 标签与颜色。</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          新建标签
        </Button>
      </div>

      <div className="manage-surface relative">
        {loading ? <div className="loading-panel">正在加载标签...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>标签名称</th>
              <th>颜色</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id}>
                <td className="font-semibold">
                  <span className="color-chip mr-2" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </td>
                <td>{tag.color}</td>
                <td>{formatDateTime(tag.createdAt)}</td>
                <td>{formatDateTime(tag.updatedAt)}</td>
                <td>
                  <div className="table-actions">
                    <Button variant="outline" size="icon" title="编辑" onClick={() => openEditDialog(tag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="删除" onClick={() => handleDelete(tag)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && tags.length === 0 ? <div className="empty-state">暂无标签</div> : null}
      </div>

      {dialogVisible
        ? createPortal(
            <div className="dialog-overlay">
              <section className="dialog-panel">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">{editingId ? '编辑标签' : '新建标签'}</h2>
                    <p className="text-sm text-muted-foreground">标签颜色会用于 Prompt 卡片和详情展示。</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDialogVisible(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span className="form-label">标签名称</span>
                    <Input
                      value={form.name}
                      maxLength={80}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">颜色</span>
                    <div className="flex items-center gap-3">
                      <input
                        value={form.color}
                        className="h-9 w-12 rounded-md border bg-background p-1"
                        type="color"
                        onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                      />
                      <Input
                        value={form.color}
                        className="w-40"
                        maxLength={7}
                        onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                      />
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogVisible(false)}>
                    取消
                  </Button>
                  <Button disabled={saving} onClick={handleSubmit}>
                    {saving ? '保存中...' : '保存'}
                  </Button>
                </div>
              </section>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
