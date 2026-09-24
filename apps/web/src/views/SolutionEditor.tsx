import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Check, Maximize2 } from 'lucide-react';
import { MarkdownEditorPanel } from '@/components/markdown/MarkdownEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PageHead } from '@/components/layout/PageHead';
import { useToast } from '@/hooks/use-toast';
import { createSolution, getSolution, getSolutions, updateSolution } from '@/api/solutions';
import type { SolutionPayload } from '@/types/domain';

const emptyForm: SolutionPayload = {
  title: '',
  summary: '',
  content: '',
  category: '',
  tags: []
};

interface EditorNavigationState {
  fullscreen?: boolean;
  created?: { id: string; payload: SolutionPayload; tagsText: string };
}

/** 解析逗号分隔的标签文本，去重并去空。 */
function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function SolutionEditor() {
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
  const [form, setForm] = useState<SolutionPayload>(() => createdDraft?.payload ?? emptyForm);
  const formRef = useRef(form);
  // 同步表单引用，确保保存请求等待期间的输入能随新建路由保留。
  const updateForm = (updater: (previous: SolutionPayload) => SolutionPayload) => {
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

      const list = await getSolutions();
      setCategoryOptions(Array.from(new Set(list.map((item) => item.category).filter(Boolean))));

      if (isEdit && id) {
        if (hasCreatedDraft) return;
        const solution = await getSolution(id);
        updateForm(() => ({
          title: solution.title,
          summary: solution.summary,
          content: solution.content,
          category: solution.category,
          tags: [...solution.tags]
        }));
        updateTagsText(solution.tags.join(', '));
      }
    };
    void bootstrap();
    // 路由 ID 变化时消费一次导航表单；清除 location.state 后不重复加载以免覆盖编辑内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** 全屏工作区保存后留在编辑页；普通页头保存继续进入详情页。 */
  const handleSubmit = async (keepFullscreen = false) => {
    if (!form.title.trim()) {
      toast({ title: '请输入标题', variant: 'destructive' });
      return;
    }

    if (!form.content.trim()) {
      toast({ title: '请输入正文内容', variant: 'destructive' });
      return;
    }

    const tags = parseTags(tagsText);
    if (tags.length === 0) {
      toast({ title: '请至少添加一个标签', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: SolutionPayload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        content: form.content,
        category: form.category.trim(),
        tags
      };

      const solution = isEdit && id ? await updateSolution(id, payload) : await createSolution(payload);
      toast({ title: '解决方案已保存', variant: 'success' });
      if (keepFullscreen) {
        setFullscreen(true);
        if (!isEdit) {
          navigate(`/solutions/${solution.id}/edit`, {
            replace: true,
            state: { fullscreen: true, created: { id: solution.id, payload: formRef.current, tagsText: tagsTextRef.current } }
          });
        }
        return;
      }
      navigate(`/solutions/${solution.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHead
        title={isEdit ? '编辑解决方案' : '新建解决方案'}
        subtitle="维护标题、摘要、分类、标签与 Markdown 正文内容。"
        back={isEdit && id ? `/solutions/${id}` : '/solutions'}
        actions={<>
          <Button type="button" variant="outline" onClick={() => setFullscreen(true)}>
            <Maximize2 className="h-4 w-4" />
            全屏
          </Button>
          <Button disabled={saving} onClick={() => void handleSubmit()}>
            <Check className="h-4 w-4" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </>}
      />

      <MarkdownEditorPanel
        title="正文内容"
        value={form.content}
        onChange={(content) => updateForm((prev) => ({ ...prev, content }))}
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        fullscreenTitle={form.title || '未命名解决方案'}
        onSave={() => void handleSubmit(true)}
        saving={saving}
        metadata={<>
            <label className="form-field">
              <span className="form-label">标题</span>
              <Input
                value={form.title}
                maxLength={200}
                placeholder="输入解决方案标题"
                onChange={(event) => updateForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.title.length}/200</span>
            </label>

            <label className="form-field">
              <span className="form-label">摘要</span>
              <Textarea
                value={form.summary}
                maxLength={500}
                rows={4}
                placeholder="一句话概括该方案，展示在列表卡片上"
                onChange={(event) => updateForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.summary.length}/500</span>
            </label>

            <label className="form-field">
              <span className="form-label">分类</span>
              <Input
                value={form.category}
                maxLength={80}
                placeholder="如 Codex、部署、环境"
                list="solution-category-options"
                onChange={(event) => updateForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <datalist id="solution-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label className="form-field">
              <span className="form-label">标签 <span className="text-destructive">*</span></span>
              <Input
                value={tagsText}
                placeholder="多个标签用逗号分隔，如 Codex, CLAUDE.md"
                onChange={(event) => updateTagsText(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">至少填写一个，使用中文或英文逗号分隔，自动去重。</span>
            </label>
        </>}
      />
    </section>
  );
}
