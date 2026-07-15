import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { MarkdownEditorPanel } from '@/components/markdown/MarkdownEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHead } from '@/components/layout/PageHead';
import { useToast } from '@/hooks/use-toast';
import { createPrompt, getPrompt, updatePrompt } from '@/api/prompts';
import { usePromptStore } from '@/stores/prompt';
import type { PromptPayload } from '@/types/domain';

const emptyForm: PromptPayload = {
  name: '',
  description: '',
  content: '',
  categoryId: null,
  tagIds: [],
  isFavorite: false
};

export function PromptEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const categories = usePromptStore((state) => state.categories);
  const tags = usePromptStore((state) => state.tags);
  const fetchCategories = usePromptStore((state) => state.fetchCategories);
  const fetchTags = usePromptStore((state) => state.fetchTags);

  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PromptPayload>(emptyForm);

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([fetchCategories(), fetchTags()]);

      if (isEdit && id) {
        const prompt = await getPrompt(id);
        setForm({
          name: prompt.name,
          description: prompt.description,
          content: prompt.content,
          categoryId: prompt.categoryId,
          tagIds: prompt.tags.map((tag) => tag.id),
          isFavorite: prompt.isFavorite
        });
      }
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTagsChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const tagIds = Array.from(event.target.selectedOptions, (option) => option.value);
    setForm((prev) => ({ ...prev, tagIds }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: '请输入 Prompt 名称', variant: 'destructive' });
      return;
    }

    if (!form.content.trim()) {
      toast({ title: '请输入 Prompt 内容', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: PromptPayload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId || null,
        tagIds: [...form.tagIds]
      };
      const prompt = isEdit && id ? await updatePrompt(id, payload) : await createPrompt(payload);
      toast({ title: 'Prompt 已保存', variant: 'success' });
      navigate(`/prompts/${prompt.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHead
        title={isEdit ? '编辑 Prompt' : '新建 Prompt'}
        subtitle="维护 Prompt 基础信息、分类、标签与正文内容。"
        back={isEdit && id ? `/prompts/${id}` : '/prompts'}
        actions={
          <Button disabled={saving} onClick={handleSubmit}>
            <Check className="h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        }
      />

      <div className="editor-layout">
        <div className="form-surface">
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">名称</span>
              <Input
                value={form.name}
                maxLength={160}
                placeholder="输入 Prompt 名称"
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.name.length}/160</span>
            </label>

            <label className="form-field">
              <span className="form-label">描述</span>
              <Textarea
                value={form.description}
                maxLength={1000}
                rows={5}
                placeholder="输入 Prompt 描述"
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.description.length}/1000</span>
            </label>

            <label className="form-field">
              <span className="form-label">分类</span>
              <select
                value={form.categoryId ?? ''}
                className="native-select w-full"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value || null }))
                }
              >
                <option value="">不设置分类</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span className="form-label">标签</span>
              <select value={form.tagIds} className="native-multi w-full" multiple onChange={handleTagsChange}>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">可按住 Ctrl 或 Shift 多选标签。</span>
            </label>

            <label className="checkbox-row">
              <input
                checked={form.isFavorite}
                className="h-4 w-4 accent-indigo-600"
                type="checkbox"
                onChange={(event) => setForm((prev) => ({ ...prev, isFavorite: event.target.checked }))}
              />
              <span>收藏该 Prompt</span>
            </label>
          </div>
        </div>

        <MarkdownEditorPanel
          title="Prompt 内容"
          value={form.content}
          onChange={(content) => setForm((prev) => ({ ...prev, content }))}
        />
      </div>
    </section>
  );
}
