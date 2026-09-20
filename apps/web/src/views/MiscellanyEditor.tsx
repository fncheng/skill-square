import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { createMiscellany, getMiscellanies, getMiscellany, updateMiscellany } from '@/api/miscellanies';
import { PageHead } from '@/components/layout/PageHead';
import { MarkdownEditorPanel } from '@/components/markdown/MarkdownEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MiscellanyPayload } from '@/types/domain';

const emptyForm: MiscellanyPayload = { title: '', summary: '', content: '', category: '', tags: [] };

/** 将中英文逗号分隔的标签规范化为去重数组。 */
function parseTags(value: string): string[] { return Array.from(new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))); }

export function MiscellanyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [tagsText, setTagsText] = useState('');
  const [form, setForm] = useState<MiscellanyPayload>(emptyForm);
  useEffect(() => { const bootstrap = async () => { const list = await getMiscellanies(); setCategoryOptions(Array.from(new Set(list.map((item) => item.category).filter(Boolean)))); if (isEdit && id) { const miscellany = await getMiscellany(id); setForm({ title: miscellany.title, summary: miscellany.summary, content: miscellany.content, category: miscellany.category, tags: [...miscellany.tags] }); setTagsText(miscellany.tags.join(', ')); } }; void bootstrap(); }, [id, isEdit]);
  const handleSubmit = async () => { if (!form.title.trim()) { toast({ title: '请输入标题', variant: 'destructive' }); return; } if (!form.content.trim()) { toast({ title: '请输入正文内容', variant: 'destructive' }); return; } const tags = parseTags(tagsText); if (tags.length === 0) { toast({ title: '请至少添加一个标签', variant: 'destructive' }); return; } setSaving(true); try { const payload: MiscellanyPayload = { title: form.title.trim(), summary: form.summary.trim(), content: form.content, category: form.category.trim(), tags }; const miscellany = isEdit && id ? await updateMiscellany(id, payload) : await createMiscellany(payload); toast({ title: '杂谈已保存', variant: 'success' }); navigate(`/miscellanies/${miscellany.id}`); } finally { setSaving(false); } };
  return <section><PageHead title={isEdit ? '编辑杂谈' : '新建杂谈'} subtitle="维护标题、摘要、分类、标签与 Markdown 正文内容。" back={isEdit && id ? `/miscellanies/${id}` : '/miscellanies'} actions={<Button disabled={saving} onClick={handleSubmit}><Check className="h-4 w-4" />{saving ? '保存中...' : '保存'}</Button>} />
    <div className="editor-layout"><div className="form-surface"><div className="form-grid">
      <label className="form-field"><span className="form-label">标题</span><Input value={form.title} maxLength={200} placeholder="输入杂谈标题" onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} /><span className="text-xs text-muted-foreground">{form.title.length}/200</span></label>
      <label className="form-field"><span className="form-label">摘要</span><Textarea value={form.summary} maxLength={500} rows={4} placeholder="一句话概括该杂谈，展示在列表卡片上" onChange={(event) => setForm((previous) => ({ ...previous, summary: event.target.value }))} /><span className="text-xs text-muted-foreground">{form.summary.length}/500</span></label>
      <label className="form-field"><span className="form-label">分类</span><Input value={form.category} maxLength={80} placeholder="如 想法、协作、经验" list="miscellany-category-options" onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))} /><datalist id="miscellany-category-options">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist></label>
      <label className="form-field"><span className="form-label">标签 <span className="text-destructive">*</span></span><Input value={tagsText} placeholder="多个标签用逗号分隔，如 想法, 协作" onChange={(event) => setTagsText(event.target.value)} /><span className="text-xs text-muted-foreground">至少填写一个，使用中文或英文逗号分隔，自动去重。</span></label>
    </div></div><MarkdownEditorPanel title="正文内容" value={form.content} onChange={(content) => setForm((previous) => ({ ...previous, content }))} /></div>
  </section>;
}
