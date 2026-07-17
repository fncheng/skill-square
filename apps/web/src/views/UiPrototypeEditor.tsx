import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Upload } from 'lucide-react';
import {
  createUiPrototype,
  getUiPrototype,
  getUiPrototypes,
  updateUiPrototype
} from '@/api/ui-prototypes';
import { PageHead } from '@/components/layout/PageHead';
import { UiPrototypeEditorPanel } from '@/components/ui-prototype/UiPrototypeEditorPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { UiPrototypePayload } from '@/types/domain';
import {
  formatFileSize,
  getUtf8ByteLength,
  UI_PROTOTYPE_MAX_BYTES
} from '@/utils/ui-prototype';

const emptyForm: UiPrototypePayload = {
  title: '',
  summary: '',
  html: '',
  category: '',
  tags: [],
  allowExternal: false
};

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function UiPrototypeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [tagsText, setTagsText] = useState('');
  const [form, setForm] = useState<UiPrototypePayload>(emptyForm);
  const htmlBytes = getUtf8ByteLength(form.html);

  useEffect(() => {
    const bootstrap = async () => {
      const list = await getUiPrototypes();
      setCategoryOptions(Array.from(new Set(list.map((item) => item.category).filter(Boolean))));

      if (isEdit && id) {
        const prototype = await getUiPrototype(id);
        setForm({
          title: prototype.title,
          summary: prototype.summary,
          html: prototype.html,
          category: prototype.category,
          tags: [...prototype.tags],
          allowExternal: prototype.allowExternal
        });
        setTagsText(prototype.tags.join(', '));
      }
    };
    void bootstrap();
  }, [id, isEdit]);

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (file.size > UI_PROTOTYPE_MAX_BYTES) {
      toast({ title: 'HTML 文件不能超过 2 MB', variant: 'destructive' });
      return;
    }

    const html = await file.text();
    setForm((prev) => ({
      ...prev,
      title: prev.title || file.name.replace(/\.html?$/i, ''),
      html
    }));
    toast({ title: 'HTML 文件已导入', variant: 'success' });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast({ title: '请输入原型名称', variant: 'destructive' });
      return;
    }

    if (!form.html.trim()) {
      toast({ title: '请输入 HTML 内容', variant: 'destructive' });
      return;
    }

    if (htmlBytes > UI_PROTOTYPE_MAX_BYTES) {
      toast({ title: 'HTML 内容不能超过 2 MB', variant: 'destructive' });
      return;
    }

    const tags = parseTags(tagsText);
    if (tags.length > 20) {
      toast({ title: '标签数量不能超过 20 个', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: UiPrototypePayload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        html: form.html,
        category: form.category.trim(),
        tags,
        allowExternal: form.allowExternal
      };
      const prototype =
        isEdit && id ? await updateUiPrototype(id, payload) : await createUiPrototype(payload);
      toast({ title: 'UI 原型已保存', variant: 'success' });
      navigate(`/ui-prototypes/${prototype.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <PageHead
        title={isEdit ? '编辑 UI 原型' : '新建 UI 原型'}
        subtitle="维护原型信息与完整单文件 HTML 源码，并在沙箱环境中预览。"
        back={isEdit && id ? `/ui-prototypes/${id}` : '/ui-prototypes'}
        actions={
          <>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept=".html,text/html"
              onChange={(event) => void handleImport(event)}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              导入 HTML
            </Button>
            <Button disabled={saving} onClick={handleSubmit}>
              <Check className="h-4 w-4" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </>
        }
      />

      <div className="editor-layout">
        <div className="form-surface">
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">名称</span>
              <Input
                value={form.title}
                maxLength={160}
                placeholder="例如：AI 智能体运营工作台"
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.title.length}/160</span>
            </label>

            <label className="form-field">
              <span className="form-label">描述</span>
              <Textarea
                value={form.summary}
                maxLength={500}
                rows={4}
                placeholder="简要说明原型的设计目标和适用场景"
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
              <span className="text-xs text-muted-foreground">{form.summary.length}/500</span>
            </label>

            <label className="form-field">
              <span className="form-label">分类</span>
              <Input
                value={form.category}
                maxLength={80}
                list="ui-prototype-category-options"
                placeholder="例如：后台系统、移动端"
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              />
              <datalist id="ui-prototype-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </label>

            <label className="form-field">
              <span className="form-label">标签</span>
              <Input
                value={tagsText}
                placeholder="Dashboard, SaaS, 响应式"
                onChange={(event) => setTagsText(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">使用中文或英文逗号分隔，最多 20 个。</span>
            </label>

            <label className="ui-prototype-external-field">
              <span className="ui-prototype-switch-copy">
                <strong>允许外部资源</strong>
                <span>允许加载 CDN、远程图片、字体和脚本。</span>
              </span>
              <input
                checked={form.allowExternal}
                type="checkbox"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, allowExternal: event.target.checked }))
                }
              />
            </label>

            <div className="ui-prototype-security-note">
              预览始终运行在独立源 `iframe` 沙箱中。关闭外部资源时，会额外阻止所有网络请求。
            </div>

            <div className="ui-prototype-html-size">
              <span>HTML 大小</span>
              <strong className={htmlBytes > UI_PROTOTYPE_MAX_BYTES ? 'is-invalid' : ''}>
                {formatFileSize(htmlBytes)} / 2 MB
              </strong>
            </div>
          </div>
        </div>

        <UiPrototypeEditorPanel
          title={form.title}
          value={form.html}
          allowExternal={form.allowExternal}
          onChange={(html) => setForm((prev) => ({ ...prev, html }))}
        />
      </div>
    </section>
  );
}
