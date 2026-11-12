import axios from 'axios';
import { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, ArrowLeftRight, Download, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { skillsApi } from '@/api/skills';
import { MarkdownContent } from '@/components/markdown/MarkdownContent';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useConfirm } from '@/hooks/use-confirm';
import { useMarkdown } from '@/hooks/use-markdown';
import { useToast } from '@/hooks/use-toast';
import type { Skill, SkillCandidate, SkillFile, SkillVersion, SkillTool, SkillVariant, SkillSummary, SkillVersionSummary } from '@/types/skill';
import { skillRequestId } from './skill-request-id';

// getRandomValues 在 HTTP 局域网环境也可用，用于为一次保存生成 UUID。
function requestUuid() {
  const value = crypto.getRandomValues(new Uint8Array(16));
  value[6] = (value[6] & 15) | 64;
  value[8] = (value[8] & 63) | 128;
  const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
const toolLabel = (tool: SkillTool) => ({ codex: 'Codex', 'claude-code': 'Claude Code', unspecified: '未指定工具' })[tool];
const tools: SkillTool[] = ['codex', 'claude-code', 'unspecified'];
const starter = '---\nname: my-skill\ndescription: 描述这个 SKILL 的用途\n---\n\n# My Skill\n';
const date = (value: string) => new Date(value).toLocaleString();
const bytes = (value: number) => (value < 1024 ? `${value} B` : `${(value / 1024).toFixed(1)} KiB`);
const errorMessage = (error: unknown) => {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join('；') : message || error.message;
  }
  return error instanceof Error ? error.message : '操作失败';
};

/** 上传窗口保留候选文件与请求标识，重试不会重复创建版本。 */
function UploadDialog({
  target,
  existing,
  activeVariantId,
  newVariant,
  manual,
  close,
  saved
}: {
  target?: Skill;
  existing: SkillSummary[];
  activeVariantId?: string;
  newVariant: boolean;
  manual: boolean;
  close: () => void;
  saved: (version: SkillVersion, tool: SkillTool) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const epoch = useRef(0);
  // 相同保存内容复用请求标识；修改内容后使用新标识，避免与已提交的请求冲突。
  const lastRequest = useRef<{ payload: string; id: string }>();
  // 请求发出前同步上锁，避免按钮禁用生效前再次提交或重选文件。
  const savingRef = useRef(false);
  const [baseline, setBaseline] = useState(target?.versions[0]);
  const [toolKey, setToolKey] = useState<SkillTool>(
    newVariant ? tools.find((tool) => !target?.variants.some((item) => item.toolKey === tool)) ?? 'unspecified' : 'unspecified'
  );
  const [file, setFile] = useState<File>();
  const [candidate, setCandidate] = useState<SkillCandidate>();
  const [source, setSource] = useState(starter);
  const [name, setName] = useState(newVariant ? '' : target?.versions[0].name ?? '');
  const [description, setDescription] = useState(newVariant ? '' : target?.versions[0].description ?? '');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const duplicate = !target && existing.some((item) => item.name.trim() === name.trim());
  const [note, setNote] = useState(target ? '' : '首次上传');
  const [accepted, setAccepted] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = inspecting || saving;
  const [error, setError] = useState('');
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => {
      epoch.current++;
    };
  }, []);
  const choose = async (next?: File) => {
    if (savingRef.current) return;
    const current = ++epoch.current;
    setFile(next);
    setCandidate(undefined);
    setError('');
    setAccepted(false);
    setInspecting(Boolean(next));
    if (!next) return;
    try {
      const parsed = await skillsApi.inspect(next);
      if (current !== epoch.current) return;
      setCandidate(parsed);
      if (!target || newVariant) {
        setName(parsed.name);
        setDuplicateAccepted(false);
        setDescription(parsed.description);
      }
    } catch (err) {
      if (current === epoch.current) setError(errorMessage(err));
    } finally {
      if (current === epoch.current) setInspecting(false);
    }
  };
  const targetTool = target?.variants.find((item) => item.id === activeVariantId)?.toolKey ?? 'unspecified';
  const replacing = !newVariant && baseline?.format === 'ZIP' && candidate?.format === 'MD';
  const submit = async () => {
    if (savingRef.current || inspecting || (!manual && !candidate) || (target && !newVariant && !baseline)) return;
    setError('');
    if (!name.trim() || !note.trim()) return setError('请填写展示名称和变更说明。');
    if (duplicate && !duplicateAccepted) return setError('已有同名 SKILL，请确认另建，或前往已有资源上传新版本。');
    if (replacing && !accepted) return setError('请确认单文件替换目录包的影响。');
    savingRef.current = true;
    const saveEpoch = epoch.current;
    setSaving(true);
    try {
      const upload = manual ? new File([source], 'SKILL.md', { type: 'text/markdown' }) : file;
      if (!upload) return setError('请选择文件。');
      const payload = JSON.stringify([
        manual ? source : candidate?.artifactHash,
        name.trim(),
        description.trim(),
        note.trim(),
        target?.id,
        !target || newVariant ? toolKey : activeVariantId,
        target ? (newVariant ? 'variant' : 'append') : 'create',
        manual ? 'SKILL.md' : file?.name,
        newVariant ? null : baseline?.id
      ]);
      lastRequest.current = skillRequestId(lastRequest.current, payload, requestUuid);
      const version = await skillsApi.save(
        {
          file: upload,
          name,
          description,
          note,
          requestId: lastRequest.current.id,
          expectedVersionId: newVariant ? undefined : baseline?.id,
          variantId: target && !newVariant ? activeVariantId : undefined,
          toolKey: !target || newVariant ? toolKey : undefined
        },
        target?.id,
        newVariant
      );
      if (saveEpoch !== epoch.current) return;
      saved(version, target && !newVariant ? target.variants.find((item) => item.id === activeVariantId)?.toolKey ?? 'unspecified' : toolKey);
    } catch (err) {
      if (saveEpoch !== epoch.current) return;
      if (axios.isAxiosError(err) && err.response?.status === 409 && target && !newVariant && activeVariantId) {
        try {
          const refreshed = await skillsApi.variant(target.id, activeVariantId);
          if (saveEpoch !== epoch.current) return;
          setBaseline(refreshed.versions[0]);
          setError(`${errorMessage(err)} 当前基线已刷新为 v${refreshed.versions[0].number}，请检查后再次提交。`);
        } catch {
          if (saveEpoch !== epoch.current) return;
          setBaseline(undefined);
          setError('刷新当前版本失败，请关闭窗口后重试。');
        }
      } else setError(errorMessage(err));
    } finally {
      savingRef.current = false;
      if (saveEpoch === epoch.current) setSaving(false);
    }
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby="skill-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
      className="w-[min(680px,calc(100vw-32px))] rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
    >
      <div className="flex max-h-[85vh] flex-col">
        <header className="relative shrink-0 border-b px-6 py-5">
          <button
            type="button"
            aria-label="关闭"
            disabled={busy}
            onClick={close}
            className="absolute right-5 top-5 rounded p-1 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 id="skill-dialog-title" className="text-lg font-semibold">
            {newVariant ? '新增工具适配' : target ? '上传新版本' : manual ? '新增 SKILL' : '上传 SKILL'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {target
              ? `${target.name} · ${newVariant ? '新增适配' : `${toolLabel(targetTool)} · 当前 v${baseline?.number}`}`
              : '将本地 SKILL 保存到个人仓库。'}
          </p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <fieldset disabled={saving} className="min-w-0 space-y-4 px-6 py-5">
            {(!target || newVariant) && (
              <label className="block text-sm font-medium">
                工具
                <Select
                  ariaLabel="选择工具"
                  className="ml-3 w-40 max-w-[calc(100%-3rem)]"
                  value={toolKey}
                  onValueChange={setToolKey}
                  options={tools.map((tool) => ({
                    value: tool,
                    label: toolLabel(tool),
                    disabled: newVariant && Boolean(target?.variants.some((item) => item.toolKey === tool))
                  }))}
                />
              </label>
            )}
            {!manual && (
              <label className="block rounded-lg border border-dashed border-slate-300 p-5 text-sm">
                <span className="mb-2 block font-medium">选择 SKILL.md 或 ZIP 完整目录包</span>
                <input type="file" accept=".md,.zip" onChange={(event) => void choose(event.target.files?.[0])} />
                <span className="mt-2 block text-slate-500">上传不超过 10 MiB，解压不超过 50 MiB，最多 500 个文件。</span>
              </label>
            )}
            {candidate && (
              <div className="rounded-md bg-slate-50 p-3 text-sm">
                <strong>
                  {file?.name} · {candidate.files.length} 个文件
                </strong>
                <div className="mt-2 max-h-28 space-y-1 overflow-auto text-slate-600">
                  {candidate.files.map((item) => (
                    <div key={item.path} className="break-all">
                      {item.path} · {bytes(item.size)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(manual || candidate) && (
              <>
                <label className="block text-sm font-medium">
                  版本展示名称
                  <Input
                    className="mt-1"
                    value={name}
                    maxLength={200}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      if (nextName.trim() !== name.trim()) setDuplicateAccepted(false);
                      setName(nextName);
                    }}
                  />
                </label>
                <label className="block text-sm font-medium">
                  版本简介
                  <Input
                    className="mt-1"
                    value={description}
                    maxLength={500}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium">
                  变更说明
                  <Input
                    className="mt-1"
                    value={note}
                    maxLength={500}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                {manual && (
                  <div>
                    <span className="text-sm font-medium">SKILL.md 内容</span>
                    <div className="mt-1 flex h-64 flex-col overflow-hidden rounded-md border">
                      <PromptMonacoEditor value={source} onChange={setSource} readOnly={saving} />
                    </div>
                  </div>
                )}
                {duplicate && (
                  <label className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    <input
                      type="checkbox"
                      checked={duplicateAccepted}
                      onChange={(event) => setDuplicateAccepted(event.target.checked)}
                    />
                    已有同名 SKILL，我确认另建资源。
                  </label>
                )}
                {replacing && (
                  <label className="flex gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
                    <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                    单文件将替换目录包，新版本不再包含其他文件，历史版本仍保留。
                  </label>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
          </fieldset>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" disabled={busy} onClick={close}>
            取消
          </Button>
          <Button disabled={busy || (!manual && !candidate) || Boolean(target && !newVariant && !baseline)} onClick={() => void submit()}>
            {busy ? '处理中…' : '保存'}
          </Button>
        </footer>
      </div>
    </dialog>
  );
}

function VersionSelect({
  versions,
  value,
  change
}: {
  versions: SkillVersion[];
  value: string;
  change: (value: string) => void;
}) {
  return (
    <Select
      ariaLabel="选择版本"
      className="w-32"
      value={value}
      onValueChange={change}
      options={versions.map((version, index) => ({
        value: version.id,
        label: `v${version.number}${index === 0 ? ' · 当前' : ''}`
      }))}
    />
  );
}

/** 渲染正文时跳过开头的 frontmatter，源码视图仍显示完整文件。 */
function SkillMarkdownPreview({ source, isEntry }: { source: string; isEntry: boolean }) {
  const body = isEntry ? source.replace(/^\uFEFF?---[ \t]*\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/, '') : source;
  const { html, citationGroups } = useMarkdown(body);

  if (!body.trim()) return <div className="editor-preview-empty">暂无可预览的 Markdown 内容</div>;

  return (
    <div className="editor-preview-scroll">
      <MarkdownContent html={html} citationGroups={citationGroups} className="editor-preview-content break-words" />
    </div>
  );
}

/** 使用原生模态框，避免下载选项被表格滚动容器裁切。 */
function DownloadChoice({
  item,
  download
}: {
  item: SkillSummary;
  download: (item: SkillSummary, version: SkillVersionSummary) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Button variant="outline" onClick={() => dialog.current?.showModal()}>
        下载…
      </Button>
      <dialog
        ref={dialog}
        aria-label={`下载 ${item.name}`}
        className="w-[min(420px,calc(100vw-32px))] rounded-xl border border-slate-200 p-0 shadow-xl backdrop:bg-slate-950/40"
      >
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">选择工具适配</h2>
            <Button variant="ghost" size="icon" aria-label="关闭" onClick={() => dialog.current?.close()}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {item.variants.map((variant) => (
            <Button
              key={variant.id}
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                download(item, variant.versions[0]);
                dialog.current?.close();
              }}
            >
              {toolLabel(variant.toolKey)} · v{variant.versions[0].number} · {variant.versions[0].format}
            </Button>
          ))}
        </div>
      </dialog>
    </>
  );
}

export function SkillCenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const activeVariantId = params.get('variant') ?? undefined;
  const { confirmDeletion } = useConfirm();
  const { toast } = useToast();
  const [list, setList] = useState<SkillSummary[]>([]);
  const [skill, setSkill] = useState<Skill>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('ALL');
  const [toolFilter, setToolFilter] = useState('ALL');
  const [dialog, setDialog] = useState<'upload' | 'manual' | 'variant' | 'variant-manual' | null>(null);
  const [texts, setTexts] = useState<Record<string, string | null>>({});
  const [textErrors, setTextErrors] = useState<Record<string, boolean>>({});
  const pending = useRef(new Set<string>());
  const generation = useRef(0);
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 768px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [tab, setTab] = useState<'files' | 'history' | 'compare'>('files');
  const [selected, setSelected] = useState('');
  const [left, setLeft] = useState('');
  const [right, setRight] = useState('');
  const compareGeneration = useRef(0);
  const [compareVariant, setCompareVariant] = useState<SkillVariant>();
  const [compareLeft, setCompareLeft] = useState<SkillVariant>();
  const [crossCompare, setCrossCompare] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [path, setPath] = useState('SKILL.md');
  const [previewMode, setPreviewMode] = useState<'text' | 'markdown'>('text');
  const load = useCallback(async (options?: { openDialog?: 'upload' | 'variant' | 'variant-manual' }) => {
    const run = ++generation.current;
    setDialog(null);
    setLoading(true);
    setFailed(false);
    compareGeneration.current++;
    setCompareVariant(undefined);
    setCompareLeft(undefined);
    setCrossCompare(false);
    setCompareLoading(false);
    setTexts({});
    setTextErrors({});
    pending.current.clear();
    try {
      if (id) {
        const result = await skillsApi.detail(id, activeVariantId);
        if (run !== generation.current) return;
        setSkill(result);
        setSelected(result.versions[0].id);
        setLeft(result.versions[1]?.id ?? result.versions[0].id);
        setRight(result.versions[0].id);
        setPath('SKILL.md');
        // 详情刷新成功后再打开弹窗，避免用缓存的版本作为提交基线。
        if (options?.openDialog) {
          if (options.openDialog !== 'upload' && result.variants.length >= tools.length) {
            toast({ title: '所有工具适配均已存在。', variant: 'destructive' });
          } else {
            setDialog(options.openDialog);
          }
        }
      } else {
        const result = await skillsApi.list();
        if (run !== generation.current) return;
        setList(result);
        setSkill(undefined);
      }
    } catch {
      if (run === generation.current) setFailed(true);
    } finally {
      if (run === generation.current) setLoading(false);
    }
  }, [id, activeVariantId, toast]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const remove = async (item: SkillSummary) => {
    const versionCount = item.variants.reduce((sum, variant) => sum + variant._count.versions, 0);
    if (
      !(await confirmDeletion({
        title: '删除 SKILL',
        description: `确认删除 ${item.name}、${item.variants.length} 个工具适配及其 ${versionCount} 个版本？删除后无法从界面恢复。`,
        expectedText: item.name
      }))
    )
      return;
    try {
      await skillsApi.remove(item.id);
      toast({ title: 'SKILL 及全部历史已删除', variant: 'success' });
      if (id) navigate('/skills');
      else await load();
    } catch {
      /* 全局错误提示 */
    }
  };
  const download = (item: SkillSummary, version: SkillVersion | SkillVersionSummary) => {
    const tool = item.variants.find((entry) => entry.id === version.variantId)?.toolKey ?? 'unspecified';
    void skillsApi.download(item.id, version, item.name, tool).catch(() => undefined);
  };
  const filtered = list.filter((item) => {
    const searchable = [
      item.name,
      item.description,
      ...item.variants.flatMap((entry) => [entry.versions[0]?.name ?? '', entry.versions[0]?.description ?? ''])
    ];
    const matchesSearch = searchable.some((value) => value.toLowerCase().includes(search.toLowerCase()));
    const matchesVariant = item.variants.some(
      (entry) =>
        (toolFilter === 'ALL' || entry.toolKey === toolFilter) &&
        (format === 'ALL' || entry.versions[0]?.format === format)
    );
    return matchesSearch && matchesVariant;
  });
  const version = skill?.versions.find((item) => item.id === selected);
  const old = (crossCompare ? compareLeft?.versions : skill?.versions)?.find((item) => item.id === left);
  const current = (crossCompare ? compareVariant?.versions : skill?.versions)?.find((item) => item.id === right);
  const paths = Array.from(
    new Set([...(old?.files ?? []).map((file) => file.path), ...(current?.files ?? []).map((file) => file.path)])
  ).sort();
  const comparePath = paths.includes(path) ? path : paths[0];
  const oldFile = old?.files.find((file) => file.path === comparePath);
  const newFile = current?.files.find((file) => file.path === comparePath);
  const change = (a?: SkillFile, b?: SkillFile): '新增' | '删除' | '未变' | '修改' =>
    !a ? '新增' : !b ? '删除' : a.hash === b.hash ? '未变' : '修改';
  const changeLabel = (a?: SkillFile, b?: SkillFile) => {
    const state = change(a, b);
    const crossLabels = { 新增: '仅右侧', 删除: '仅左侧', 未变: '相同', 修改: '内容不同' };
    return crossCompare ? crossLabels[state] : state;
  };
  const chosenFile = version?.files.find((file) => file.path === path) ?? version?.files[0];
  useEffect(() => {
    if (!id || !skill) return;
    const needed =
      tab === 'files'
        ? [chosenFile && { file: chosenFile, versionId: selected }]
        : tab === 'compare'
          ? [oldFile && { file: oldFile, versionId: left }, newFile && { file: newFile, versionId: right }]
          : [];
    for (const entry of needed) {
      if (
        !entry?.file.id ||
        Object.prototype.hasOwnProperty.call(texts, entry.file.id) ||
        textErrors[entry.file.id] ||
        pending.current.has(entry.file.id)
      )
        continue;
      const fileId = entry.file.id;
      const run = generation.current;
      pending.current.add(fileId);
      void skillsApi
        .file(id, entry.versionId, fileId)
        .then((result) => {
          if (run === generation.current)
            setTexts((state) =>
              Object.fromEntries([
                ...Object.entries(state)
                  .filter(([key]) => key !== fileId)
                  .slice(-7),
                [fileId, result.text]
              ])
            );
        })
        .catch(() => {
          if (run === generation.current) setTextErrors((state) => ({ ...state, [fileId]: true }));
        })
        .finally(() => {
          if (run === generation.current) pending.current.delete(fileId);
        });
    }
  }, [id, skill, tab, chosenFile, oldFile, newFile, selected, left, right, texts, textErrors]);
  const fileText = (file?: SkillFile) => (file?.id ? texts[file.id] : undefined);
  const chosenFileText = fileText(chosenFile);
  const isMarkdownFile = /\.(?:md|markdown)$/i.test(chosenFile?.path ?? '');
  const retry = (files: Array<SkillFile | undefined>) =>
    setTextErrors((state) => {
      const next = { ...state };
      files.forEach((file) => {
        if (file?.id) delete next[file.id];
      });
      return next;
    });
  const loadError = (file?: SkillFile) => Boolean(file?.id && textErrors[file.id]);
  // 以代次丢弃已切换资源或目标后的旧对比请求。
  const loadCompareVariant = async (variantId: string, side: 'left' | 'right' | 'initial') => {
    if (!skill || !version) return;
    const run = ++compareGeneration.current;
    setCompareLoading(true);
    try {
      const result = await skillsApi.variant(skill.id, variantId);
      if (run !== compareGeneration.current) return;
      if (side === 'initial') {
        const active = skill.variants.find((entry) => entry.id === version.variantId);
        if (!active) throw new Error('当前工具适配不存在。');
        setCompareLeft({ ...active, versions: skill.versions });
        setCompareVariant(result);
        setCrossCompare(true);
        setLeft(skill.versions[0].id);
        setRight(result.versions[0].id);
      } else if (side === 'left') {
        setCompareLeft(result);
        setLeft(result.versions[0].id);
      } else {
        setCompareVariant(result);
        setRight(result.versions[0].id);
      }
    } catch (err) {
      if (run === compareGeneration.current) toast({ title: errorMessage(err), variant: 'destructive' });
    } finally {
      if (run === compareGeneration.current) setCompareLoading(false);
    }
  };
  const changeCompareScope = (scope: string) => {
    if (!skill || !version) return;
    if (scope === 'history') {
      compareGeneration.current++;
      setCompareLoading(false);
      setCrossCompare(false);
      setLeft(skill.versions[1]?.id ?? skill.versions[0].id);
      setRight(skill.versions[0].id);
      return;
    }
    const other = skill.variants.find((entry) => entry.id !== version.variantId);
    if (other) void loadCompareVariant(other.id, 'initial');
  };
  return (
    <div className={id && skill && version ? 'flex min-h-[calc(100dvh-128px)] flex-col gap-5' : 'space-y-5'}>
      {loading ? (
        <p className="text-sm text-slate-500">正在加载…</p>
      ) : failed ? (
        <div className="space-y-3">
          <p>加载失败，请重试。</p>
          <Button variant="outline" onClick={() => void load()}>
            重试
          </Button>
        </div>
      ) : !id ? (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">SKILL center</h1>
              <p className="mt-1 text-sm text-slate-500">
                管理个人 SKILL，在不同设备下载完整版本 · {list.length} 个资源
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialog('manual')}>
                <Plus className="mr-2 h-4 w-4" />
                新增
              </Button>
              <Button onClick={() => setDialog('upload')}>
                <Upload className="mr-2 h-4 w-4" />
                上传 SKILL
              </Button>
            </div>
          </header>
          <div className="flex flex-wrap gap-3">
            <Input
              className="max-w-xs"
              placeholder="搜索名称或简介"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              ariaLabel="筛选工具"
              className="w-40"
              value={toolFilter}
              onValueChange={setToolFilter}
              options={[{ value: 'ALL', label: '全部工具' }, ...tools.map((tool) => ({ value: tool, label: toolLabel(tool) }))]}
            />
            <Select
              ariaLabel="筛选格式"
              className="w-32"
              value={format}
              onValueChange={setFormat}
              options={[
                { value: 'ALL', label: '全部格式' },
                { value: 'MD', label: '单文件' },
                { value: 'ZIP', label: '目录包' }
              ]}
            />
          </div>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['名称', '工具适配', '更新时间', '操作'].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-4">
                        <Link className="font-medium text-indigo-700 hover:underline" to={`/skills/${item.id}`}>
                          {item.name}
                        </Link>
                        <p className="mt-1 max-w-md truncate text-slate-500">{item.description}</p>
                      </td>
                      <td className="px-4">
                        <div className="flex flex-wrap gap-2">
                          {item.variants.map((variant) => (
                            <Link
                              key={variant.id}
                              className="text-indigo-700 hover:underline"
                              to={`/skills/${item.id}?variant=${variant.id}`}
                            >
                              {toolLabel(variant.toolKey)} · v{variant.versions[0].number} · {variant.versions[0].format}
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 text-slate-500">{date(item.updatedAt)}</td>
                      <td className="px-4">
                        <div className="flex gap-1">
                          <DownloadChoice item={item} download={download} />
                          <Button
                            variant="ghost"
                            size="icon"
                            title="删除"
                            aria-label="删除"
                            onClick={() => void remove(item)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="p-12 text-center text-sm text-slate-500">
                {list.length ? '没有匹配的 SKILL，请调整筛选条件。' : '还没有 SKILL，上传文件或手动新增。'}
              </div>
            )}
          </div>
        </>
      ) : skill && version ? (
        <>
          <Link to="/skills" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-700">
            <ArrowLeft className="h-4 w-4" />
            返回 SKILL 列表
          </Link>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{skill.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{skill.description}</p>
              <p className="mt-2 text-xs text-slate-500">
                {version.format === 'MD' ? '单文件' : '完整目录包'} · v{version.number} · {date(version.createdAt)} ·
                仅管理员可见
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="icon"
                title="删除 SKILL"
                aria-label="删除 SKILL"
                onClick={() => void remove(skill)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
              <Button variant="outline" onClick={() => void load({ openDialog: 'upload' })}>
                <Upload className="mr-2 h-4 w-4" />
                上传新版本
              </Button>
              <Button onClick={() => download(skill, version)}>
                <Download className="mr-2 h-4 w-4" />
                下载 v{version.number}
              </Button>
            </div>
          </header>
          <div className="flex flex-wrap gap-2">
            <Select
              ariaLabel="当前工具适配"
              value={version.variantId}
              onValueChange={(value) => setParams({ variant: value })}
              options={skill.variants.map((entry) => ({ value: entry.id, label: toolLabel(entry.toolKey) }))}
            />
            <Button
              variant="outline"
              disabled={skill.variants.length >= tools.length}
              onClick={() => void load({ openDialog: 'variant' })}
            >
              上传工具适配
            </Button>
            <Button
              variant="outline"
              disabled={skill.variants.length >= tools.length}
              onClick={() => void load({ openDialog: 'variant-manual' })}
            >
              手动新增适配
            </Button>
            {skill.variants.find((entry) => entry.id === version.variantId)?.toolKey === 'unspecified' &&
              tools
                .filter((tool) => tool !== 'unspecified' && !skill.variants.some((entry) => entry.toolKey === tool))
                .map((tool) => (
                  <Button
                    key={tool}
                    variant="outline"
                    onClick={() =>
                      void skillsApi.classify(skill.id, version.variantId, tool)
                        .then(() => load())
                        .catch((err) => toast({ title: errorMessage(err), variant: 'destructive' }))
                    }
                  >
                    归类为 {toolLabel(tool)}
                  </Button>
                ))}
          </div>
          {version.id !== skill.versions[0].id && (
            <div className="flex items-center justify-between rounded-md bg-indigo-50 p-3 text-sm text-indigo-800">
              正在查看历史版本 v{version.number}，当前最新为 v{skill.versions[0].number}。
              <Button variant="outline" onClick={() => setSelected(skill.versions[0].id)}>
                回到当前版本
              </Button>
            </div>
          )}
          <nav className="flex gap-6 border-b" aria-label="SKILL 详情">
            {(
              [
                ['files', '文件'],
                ['history', `版本历史 · ${skill.versions.length}`],
                ['compare', '版本对比']
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`border-b-2 px-1 py-3 text-sm ${tab === key ? 'border-indigo-600 font-medium text-indigo-700' : 'border-transparent text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          {tab === 'files' && (
            <div className="flex flex-1 flex-col overflow-hidden rounded-lg border bg-white">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <strong>版本文件</strong>
                  <VersionSelect
                    versions={skill.versions}
                    value={selected}
                    change={(value) => {
                      setSelected(value);
                      setPath('SKILL.md');
                    }}
                  />
                </div>
                <span className="text-sm text-slate-500">{version.files.length} 个文件</span>
              </div>
              <div className="grid min-h-[450px] flex-1 grid-cols-1 bg-slate-50 md:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="max-h-[600px] overflow-auto border-b p-2 md:border-b-0">
                  {version.files.map((file) => (
                    <button
                      key={file.path}
                      onClick={() => setPath(file.path)}
                      className={`block w-full break-all rounded px-3 py-2 text-left text-sm ${chosenFile?.path === file.path ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-100'}`}
                    >
                      {file.path}
                    </button>
                  ))}
                </aside>
                <div className="flex min-w-0 flex-col bg-white md:border-l">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm">
                    <strong className="break-all">{chosenFile?.path}</strong>
                    <div className="flex flex-wrap items-center gap-2">
                      {isMarkdownFile && typeof chosenFileText === 'string' && (
                        <div role="group" aria-label="文件预览模式" className="flex gap-1 rounded-md bg-slate-50 p-1">
                          {(['text', 'markdown'] as const).map((mode) => (
                            <Button
                              key={mode}
                              type="button"
                              size="sm"
                              variant={previewMode === mode ? 'outline' : 'ghost'}
                              aria-pressed={previewMode === mode}
                              onClick={() => setPreviewMode(mode)}
                            >
                              {mode === 'text' ? '纯文本' : 'Markdown'}
                            </Button>
                          ))}
                        </div>
                      )}
                      <span className="text-slate-500">{chosenFile && bytes(chosenFile.size)} · 只读</span>
                    </div>
                  </div>
                  {loadError(chosenFile) ? (
                    <div className="p-8 text-sm">
                      文件加载失败。
                      <Button variant="outline" onClick={() => retry([chosenFile])}>
                        重试
                      </Button>
                    </div>
                  ) : chosenFileText === undefined ? (
                    <p className="p-8 text-sm text-slate-500">正在加载文件…</p>
                  ) : chosenFileText !== null ? (
                    <div className="flex min-h-[450px] flex-1 flex-col">
                      {isMarkdownFile && previewMode === 'markdown' ? (
                        <SkillMarkdownPreview
                          key={chosenFile?.id}
                          source={chosenFileText}
                          isEntry={chosenFile?.path === 'SKILL.md'}
                        />
                      ) : (
                        <PromptMonacoEditor
                          value={chosenFileText}
                          readOnly
                          language={isMarkdownFile ? 'markdown' : 'plaintext'}
                        />
                      )}
                    </div>
                  ) : (
                    <p className="p-8 text-sm text-slate-500">二进制或超过 1 MiB 的文件无法在线预览，请下载完整包。</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === 'history' && (
            <div className="overflow-x-auto rounded-lg border bg-white">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    {['版本', '变更说明', '时间', '操作'].map((x) => (
                      <th key={x} className="p-4 font-medium">
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {skill.versions.map((v, index) => {
                    const previous = skill.versions[index + 1];
                    const pathsForHistory = new Set([
                      ...v.files.map((f) => f.path),
                      ...(previous?.files.map((f) => f.path) ?? [])
                    ]);
                    const counts = ['新增', '修改', '删除']
                      .map(
                        (state) =>
                          `${
                            Array.from(pathsForHistory).filter(
                              (p) =>
                                change(
                                  previous?.files.find((f) => f.path === p),
                                  v.files.find((f) => f.path === p)
                                ) === state
                            ).length
                          } ${state}`
                      )
                      .join(' · ');
                    return (
                      <tr key={v.id} className="border-t">
                        <td className="p-4">
                          v{v.number}
                          {index === 0 ? ' · 当前' : ''}
                          <p className="text-slate-500">
                            {v.format} · {v.files.length} 个文件
                          </p>
                        </td>
                        <td className="p-4">
                          {v.note}
                          <p className="text-slate-500">
                            {previous ? counts : '首次创建'} · {v.originalName}
                          </p>
                        </td>
                        <td className="p-4 text-slate-500">{date(v.createdAt)}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelected(v.id);
                                setPath('SKILL.md');
                                setTab('files');
                              }}
                            >
                              查看
                            </Button>
                            <Button
                              variant="outline"
                              disabled={!previous}
                              onClick={() => {
                                changeCompareScope('history');
                                setLeft(previous.id);
                                setRight(v.id);
                                setPath('SKILL.md');
                                setTab('compare');
                              }}
                            >
                              对比前版
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={`下载 ${toolLabel(skill.variants.find((item) => item.id === v.variantId)?.toolKey ?? 'unspecified')} v${v.number}`}
                              aria-label={`下载 ${toolLabel(skill.variants.find((item) => item.id === v.variantId)?.toolKey ?? 'unspecified')} v${v.number}`}
                              onClick={() => download(skill, v)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'compare' && old && current && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  ariaLabel="对比范围"
                  value={crossCompare ? 'cross' : 'history'}
                  onValueChange={changeCompareScope}
                  options={[
                    { value: 'history', label: '历史版本对比' },
                    { value: 'cross', label: '跨工具对比', disabled: skill.variants.length < 2 }
                  ]}
                />
                <span className="text-sm">左侧</span>
                {crossCompare && (
                  <Select
                    ariaLabel="左侧工具"
                    value={compareLeft?.id ?? ''}
                    disabled={compareLoading}
                    onValueChange={(value) => void loadCompareVariant(value, 'left')}
                    options={skill.variants
                      .filter((entry) => entry.id !== compareVariant?.id)
                      .map((entry) => ({ value: entry.id, label: toolLabel(entry.toolKey) }))}
                  />
                )}
                <VersionSelect
                  versions={crossCompare ? compareLeft?.versions ?? [] : skill.versions}
                  value={left}
                  change={setLeft}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={compareLoading}
                  title="交换对比方向"
                  aria-label="交换对比方向"
                  onClick={() => {
                    setLeft(right);
                    setRight(left);
                    if (crossCompare) {
                      setCompareLeft(compareVariant);
                      setCompareVariant(compareLeft);
                    }
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                <span className="text-sm">右侧</span>
                {crossCompare && (
                  <Select
                    ariaLabel="右侧工具"
                    value={compareVariant?.id ?? ''}
                    disabled={compareLoading}
                    onValueChange={(value) => void loadCompareVariant(value, 'right')}
                    options={skill.variants
                      .filter((entry) => entry.id !== compareLeft?.id)
                      .map((entry) => ({ value: entry.id, label: toolLabel(entry.toolKey) }))}
                  />
                )}
                <VersionSelect
                  versions={crossCompare ? compareVariant?.versions ?? [] : skill.versions}
                  value={right}
                  change={setRight}
                />
              </div>
              {compareLoading ? <p className="text-sm text-slate-500">正在加载比较目标…</p> : left === right ? (
                <div className="rounded-lg border bg-white p-12 text-center text-sm text-slate-500">
                  所选版本相同，请选择不同版本。
                </div>
              ) : (
                <div className="grid min-h-[500px] flex-1 grid-cols-1 overflow-hidden rounded-lg border bg-slate-50 md:grid-cols-[240px_minmax(0,1fr)]">
                  <aside className="max-h-[600px] overflow-auto border-b p-2 md:border-b-0">
                    {paths.map((p) => {
                      const state = changeLabel(
                        old.files.find((f) => f.path === p),
                        current.files.find((f) => f.path === p)
                      );
                      return (
                        <button
                          key={p}
                          onClick={() => setPath(p)}
                          className={`flex w-full gap-2 rounded px-3 py-2 text-left text-sm ${comparePath === p ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}
                        >
                          <span className="shrink-0 text-slate-500">
                            {state}
                          </span>
                          <span className="break-all">{p}</span>
                        </button>
                      );
                    })}
                  </aside>
                  <div className="flex min-w-0 flex-col bg-white md:border-l">
                    <div className="border-b p-3 text-sm font-medium">
                      {comparePath} · {changeLabel(oldFile, newFile)}
                    </div>
                    {loadError(oldFile) || loadError(newFile) ? (
                      <div className="p-8 text-sm">
                        文件加载失败。
                        <Button variant="outline" onClick={() => retry([oldFile, newFile])}>
                          重试
                        </Button>
                      </div>
                    ) : (oldFile && fileText(oldFile) === undefined) || (newFile && fileText(newFile) === undefined) ? (
                      <p className="p-8 text-sm text-slate-500">正在加载文件…</p>
                    ) : (oldFile && fileText(oldFile) === null) || (newFile && fileText(newFile) === null) ? (
                      <div className="space-y-2 p-8 text-sm text-slate-500">
                        <p>二进制或过大文件无法在线对比，请下载对应版本。</p>
                        <p>
                          左侧：
                          {oldFile ? `${bytes(oldFile.size)} · ${oldFile.hash}` : '不存在'}
                        </p>
                        <p>
                          右侧：
                          {newFile ? `${bytes(newFile.size)} · ${newFile.hash}` : '不存在'}
                        </p>
                      </div>
                    ) : (
                      <div className="min-h-[500px] flex-1">
                        <DiffEditor
                          original={fileText(oldFile) ?? ''}
                          modified={fileText(newFile) ?? ''}
                          language="plaintext"
                          options={{
                            readOnly: true,
                            originalEditable: false,
                            automaticLayout: true,
                            minimap: { enabled: false },
                            renderSideBySide: !narrow,
                            scrollBeyondLastLine: false,
                            maxComputationTime: 3000
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : null}
      {dialog && (
        <UploadDialog
          target={id ? skill : undefined}
          existing={list}
          activeVariantId={skill?.versions[0]?.variantId}
          newVariant={dialog === 'variant' || dialog === 'variant-manual'}
          manual={dialog === 'manual' || dialog === 'variant-manual'}
          close={() => setDialog(null)}
          saved={(v, savedTool) => {
            setDialog(null);
            toast({ title: `已保存 ${toolLabel(savedTool)} v${v.number}`, variant: 'success' });
            if (id) { if (activeVariantId === v.variantId || (!activeVariantId && v.variantId === skill?.versions[0]?.variantId)) void load(); else setParams({ variant: v.variantId }); }
            else navigate(`/skills/${v.skillId}?variant=${v.variantId}`);
          }}
        />
      )}
    </div>
  );
}
