import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CategoryPayload
} from '@/api/categories';
import type { Category } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

const emptyForm: CategoryPayload = { name: '', description: '' };

export function CategoryManage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState<CategoryPayload>(emptyForm);

  const loadCategories = async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  const openCreateDialog = () => {
    setEditingId(undefined);
    setForm(emptyForm);
    setDialogVisible(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingId(category.id);
    setForm({ name: category.name, description: category.description });
    setDialogVisible(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: '请输入分类名称', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: CategoryPayload = {
        name: form.name.trim(),
        description: form.description.trim()
      };

      if (editingId) {
        await updateCategory(editingId, payload);
      } else {
        await createCategory(payload);
      }
      toast({ title: '分类已保存', variant: 'success' });
      setDialogVisible(false);
      await loadCategories();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = await confirm({
      title: '删除分类',
      description: `确认删除分类「${category.name}」？相关 Prompt 将变为未分类。`,
      confirmText: '删除',
      destructive: true
    });

    if (!confirmed) {
      return;
    }

    await deleteCategory(category.id);
    toast({ title: '分类已删除', variant: 'success' });
    await loadCategories();
  };

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">分类管理</h1>
          <p className="page-subtitle">维护 Prompt 的一级业务分类。</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          新建分类
        </Button>
      </div>

      <div className="manage-surface relative">
        {loading ? <div className="loading-panel">正在加载分类...</div> : null}
        <table className="data-table">
          <thead>
            <tr>
              <th>分类名称</th>
              <th>描述</th>
              <th>创建时间</th>
              <th>更新时间</th>
              <th className="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="font-semibold">{category.name}</td>
                <td>{category.description || '暂无描述'}</td>
                <td>{formatDateTime(category.createdAt)}</td>
                <td>{formatDateTime(category.updatedAt)}</td>
                <td>
                  <div className="table-actions">
                    <Button variant="outline" size="icon" title="编辑" onClick={() => openEditDialog(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="删除" onClick={() => handleDelete(category)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && categories.length === 0 ? <div className="empty-state">暂无分类</div> : null}
      </div>

      {dialogVisible
        ? createPortal(
            <div className="dialog-overlay">
              <section className="dialog-panel">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black">{editingId ? '编辑分类' : '新建分类'}</h2>
                    <p className="text-sm text-muted-foreground">分类用于快速筛选和组织 Prompt。</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setDialogVisible(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="form-grid">
                  <label className="form-field">
                    <span className="form-label">分类名称</span>
                    <Input
                      value={form.name}
                      maxLength={80}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </label>
                  <label className="form-field">
                    <span className="form-label">描述</span>
                    <Textarea
                      value={form.description}
                      maxLength={500}
                      rows={4}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
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
