import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Maximize2 } from 'lucide-react';
import { createModelResponse, getModelResponse, getModelResponses, updateModelResponse } from '@/api/model-responses';
import { PageHead } from '@/components/layout/PageHead';
import { MarkdownEditorPanel } from '@/components/markdown/MarkdownEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { ModelResponsePayload } from '@/types/domain';

const emptyForm: ModelResponsePayload = { title: '', summary: '', content: '', category: '', tags: [], sourceProduct: '', modelName: '', originalPrompt: '' };
interface EditorNavigationState { fullscreen?: boolean; created?: { id: string; payload: ModelResponsePayload; tagsText: string }; }
/** 解析粘贴的标签，保持与学习笔记的标签去重语义一致。 */
function parseTags(value: string): string[] { return Array.from(new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))); }

export function ModelResponseEditor() {
  const { id } = useParams<{ id: string }>(); const location = useLocation(); const navigate = useNavigate(); const { toast } = useToast(); const isEdit = Boolean(id);
  const locationState = location.state as EditorNavigationState | null;
  const createdDraft = locationState?.created?.id === id ? locationState.created : undefined;
  const [saving, setSaving] = useState(false); const [categories, setCategories] = useState<string[]>([]); const [tagsText, setTagsText] = useState(() => createdDraft?.tagsText ?? ''); const tagsTextRef = useRef(tagsText); const [form, setForm] = useState<ModelResponsePayload>(() => createdDraft?.payload ?? emptyForm); const formRef = useRef(form); const [fullscreen, setFullscreen] = useState(() => locationState?.fullscreen === true);
  const updateTagsText = (value: string) => { tagsTextRef.current = value; setTagsText(value); };
  // 同步表单引用，确保保存请求等待期间的输入能随新建路由保留。
  const updateForm = (updater: (previous: ModelResponsePayload) => ModelResponsePayload) => { const nextForm = updater(formRef.current); formRef.current = nextForm; setForm(nextForm); };
  useEffect(() => {
    const bootstrap = async () => {
      const hasCreatedDraft = Boolean(isEdit && id && createdDraft);
      if (hasCreatedDraft) {
        // 新建导航状态仅用于首屏初始化，消费后避免刷新时恢复陈旧快照。
        navigate(location.pathname, { replace: true, state: null });
      }
      const list = await getModelResponses();
      setCategories(Array.from(new Set(list.map((item) => item.category).filter(Boolean))));
      if (isEdit && id) {
        if (hasCreatedDraft) return;
        const record = await getModelResponse(id);
        updateForm(() => ({ title: record.title, summary: record.summary, content: record.content, category: record.category, tags: record.tags, sourceProduct: record.sourceProduct, modelName: record.modelName, originalPrompt: record.originalPrompt }));
        updateTagsText(record.tags.join(', '));
      }
    };
    void bootstrap();
    // location.state 只为本次新建路由转换消费，清除后不应触发资源重新加载。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isEdit]);
  /** 全屏工作区保存后留在编辑页；普通页头保存继续进入详情页。 */
  const handleSubmit = async (keepFullscreen = false) => {
    if (!form.title.trim()) { toast({ title: '请输入标题', variant: 'destructive' }); return; }
    if (!form.content.trim()) { toast({ title: '请粘贴模型回答正文', variant: 'destructive' }); return; }
    const tags = parseTags(tagsText);
    if (!tags.length) { toast({ title: '请至少添加一个标签', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload: ModelResponsePayload = { ...form, title: form.title.trim(), summary: form.summary.trim(), category: form.category.trim(), tags, sourceProduct: form.sourceProduct.trim(), modelName: form.modelName.trim(), originalPrompt: form.originalPrompt.trim() };
      const record = isEdit && id ? await updateModelResponse(id, payload) : await createModelResponse(payload);
      toast({ title: '模型回答已保存', variant: 'success' });
      if (keepFullscreen) {
        setFullscreen(true);
        if (!isEdit) {
          navigate(`/model-responses/${record.id}/edit`, {
            replace: true,
            state: { fullscreen: true, created: { id: record.id, payload: formRef.current, tagsText: tagsTextRef.current } }
          });
        }
        return;
      }
      navigate(`/model-responses/${record.id}`);
    } finally { setSaving(false); }
  };
  return <section><PageHead title={isEdit ? '编辑模型回答' : '收录回答'} subtitle="粘贴模型回答正文，并可选记录来源产品、模型与原始 Prompt。" back={isEdit && id ? `/model-responses/${id}` : '/model-responses'} actions={<><Button type="button" variant="outline" onClick={() => setFullscreen(true)}><Maximize2 className="h-4 w-4" />全屏</Button><Button disabled={saving} onClick={() => void handleSubmit()}><Check className="h-4 w-4" />{saving ? '保存中...' : '保存'}</Button></>} /><MarkdownEditorPanel title="回答正文" value={form.content} onChange={(content) => updateForm((current) => ({ ...current, content }))} fullscreen={fullscreen} onFullscreenChange={setFullscreen} fullscreenTitle={form.title || '未命名模型回答'} onSave={() => void handleSubmit(true)} saving={saving} metadata={<><label className="form-field"><span className="form-label">标题 <span className="text-destructive">*</span></span><Input value={form.title} maxLength={200} placeholder="概括这份回答的主题" onChange={(event) => updateForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="form-field"><span className="form-label">摘要</span><Textarea value={form.summary} maxLength={500} rows={3} placeholder="用于列表快速识别的简短摘要" onChange={(event) => updateForm((current) => ({ ...current, summary: event.target.value }))} /></label><label className="form-field"><span className="form-label">来源产品</span><Input value={form.sourceProduct} maxLength={120} placeholder="例如 ChatGPT、Claude、Gemini" onChange={(event) => updateForm((current) => ({ ...current, sourceProduct: event.target.value }))} /></label><label className="form-field"><span className="form-label">模型名称</span><Input value={form.modelName} maxLength={120} placeholder="例如 GPT-5" onChange={(event) => updateForm((current) => ({ ...current, modelName: event.target.value }))} /></label><label className="form-field"><span className="form-label">分类</span><Input value={form.category} maxLength={80} list="model-response-category-options" placeholder="例如 前端、产品设计" onChange={(event) => updateForm((current) => ({ ...current, category: event.target.value }))} /><datalist id="model-response-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label><label className="form-field"><span className="form-label">标签 <span className="text-destructive">*</span></span><Input value={tagsText} placeholder="多个标签用逗号分隔" onChange={(event) => updateTagsText(event.target.value)} /><span className="text-xs text-muted-foreground">至少填写一个，最多 20 个，自动去重。</span></label><label className="form-field form-field-wide"><span className="form-label">原始 Prompt</span><Textarea value={form.originalPrompt} maxLength={50000} rows={4} placeholder="可选，记录生成该回答时的原始提问" onChange={(event) => updateForm((current) => ({ ...current, originalPrompt: event.target.value }))} /></label></>} /></section>;
}
