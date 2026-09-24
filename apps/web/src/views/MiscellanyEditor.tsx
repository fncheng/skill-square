import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Maximize2 } from 'lucide-react';
import { createMiscellany, getMiscellanies, getMiscellany, updateMiscellany } from '@/api/miscellanies';
import { PageHead } from '@/components/layout/PageHead';
import { MarkdownEditorPanel } from '@/components/markdown/MarkdownEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { MiscellanyPayload } from '@/types/domain';

const emptyForm: MiscellanyPayload = { title: '', summary: '', content: '', category: '', tags: [] };
interface EditorNavigationState { fullscreen?: boolean; created?: { id: string; payload: MiscellanyPayload; tagsText: string }; }

/** 将中英文逗号分隔的标签规范化为去重数组。 */
function parseTags(value: string): string[] { return Array.from(new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))); }

export function MiscellanyEditor() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const locationState = location.state as EditorNavigationState | null;
  const createdDraft = locationState?.created?.id === id ? locationState.created : undefined;
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [tagsText, setTagsText] = useState(() => createdDraft?.tagsText ?? '');
  const tagsTextRef = useRef(tagsText);
  const updateTagsText = (value: string) => {
    tagsTextRef.current = value;
    setTagsText(value);
  };
  const [form, setForm] = useState<MiscellanyPayload>(() => createdDraft?.payload ?? emptyForm);
  const formRef = useRef(form);
  // 同步表单引用，确保保存请求等待期间的输入能随新建路由保留。
  const updateForm = (updater: (previous: MiscellanyPayload) => MiscellanyPayload) => {
    const nextForm = updater(formRef.current);
    formRef.current = nextForm;
    setForm(nextForm);
  };
  const [fullscreen, setFullscreen] = useState(() => locationState?.fullscreen === true);
  useEffect(() => {
    const bootstrap = async () => {
      const hasCreatedDraft = Boolean(isEdit && id && createdDraft);
      if (hasCreatedDraft) {
        // 新建导航状态仅用于首屏初始化，消费后避免刷新时恢复陈旧快照。
        navigate(location.pathname, { replace: true, state: null });
      }
      const list = await getMiscellanies();
      setCategoryOptions(Array.from(new Set(list.map((item) => item.category).filter(Boolean))));
      if (isEdit && id) {
        if (hasCreatedDraft) return;
        const miscellany = await getMiscellany(id);
        updateForm(() => ({ title: miscellany.title, summary: miscellany.summary, content: miscellany.content, category: miscellany.category, tags: [...miscellany.tags] }));
        updateTagsText(miscellany.tags.join(', '));
      }
    };
    void bootstrap();
    // location.state 只为本次新建路由转换消费，清除后不应触发资源重新加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);
  /** 全屏工作区保存后留在编辑页；普通页头保存继续进入详情页。 */
  const handleSubmit = async (keepFullscreen = false) => {
    if (!form.title.trim()) { toast({ title: '请输入标题', variant: 'destructive' }); return; }
    if (!form.content.trim()) { toast({ title: '请输入正文内容', variant: 'destructive' }); return; }
    const tags = parseTags(tagsText);
    if (tags.length === 0) { toast({ title: '请至少添加一个标签', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: MiscellanyPayload = { title: form.title.trim(), summary: form.summary.trim(), content: form.content, category: form.category.trim(), tags };
      const miscellany = isEdit && id ? await updateMiscellany(id, payload) : await createMiscellany(payload);
      toast({ title: '杂谈已保存', variant: 'success' });
      if (keepFullscreen) {
        setFullscreen(true);
        if (!isEdit) {
          navigate(`/miscellanies/${miscellany.id}/edit`, {
            replace: true,
            state: { fullscreen: true, created: { id: miscellany.id, payload: formRef.current, tagsText: tagsTextRef.current } }
          });
        }
        return;
      }
      navigate(`/miscellanies/${miscellany.id}`);
    } finally { setSaving(false); }
  };
  return <section><PageHead title={isEdit ? '编辑杂谈' : '新建杂谈'} subtitle="维护标题、摘要、分类、标签与 Markdown 正文内容。" back={isEdit && id ? `/miscellanies/${id}` : '/miscellanies'} actions={<><Button type="button" variant="outline" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" />全屏</Button><Button disabled={saving} onClick={() => void handleSubmit()}><Check className="h-4 w-4" />{saving ? '保存中...' : '保存'}</Button></>} />
    <MarkdownEditorPanel title="正文内容" value={form.content} onChange={(content) => updateForm((previous) => ({ ...previous, content }))} fullscreen={fullscreen} onFullscreenChange={setFullscreen} fullscreenTitle={form.title || '未命名杂谈'} onSave={() => void handleSubmit(true)} saving={saving} metadata={<>
      <label className="form-field"><span className="form-label">标题</span><Input value={form.title} maxLength={200} placeholder="输入杂谈标题" onChange={(event) => updateForm((previous) => ({ ...previous, title: event.target.value }))} /><span className="text-xs text-muted-foreground">{form.title.length}/200</span></label>
      <label className="form-field"><span className="form-label">摘要</span><Textarea value={form.summary} maxLength={500} rows={4} placeholder="一句话概括该杂谈，展示在列表卡片上" onChange={(event) => updateForm((previous) => ({ ...previous, summary: event.target.value }))} /><span className="text-xs text-muted-foreground">{form.summary.length}/500</span></label>
      <label className="form-field"><span className="form-label">分类</span><Input value={form.category} maxLength={80} placeholder="如 想法、协作、经验" list="miscellany-category-options" onChange={(event) => updateForm((previous) => ({ ...previous, category: event.target.value }))} /><datalist id="miscellany-category-options">{categoryOptions.map((category) => <option key={category} value={category} />)}</datalist></label>
      <label className="form-field"><span className="form-label">标签 <span className="text-destructive">*</span></span><Input value={tagsText} placeholder="多个标签用逗号分隔，如 想法, 协作" onChange={(event) => updateTagsText(event.target.value)} /><span className="text-xs text-muted-foreground">至少填写一个，使用中文或英文逗号分隔，自动去重。</span></label>
    </>} />
  </section>;
}
