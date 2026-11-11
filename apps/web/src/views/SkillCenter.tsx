import axios from 'axios';
import { DiffEditor } from '@monaco-editor/react';
import { ArrowLeft, ArrowLeftRight, Download, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { skillsApi } from '@/api/skills';
import { PromptMonacoEditor } from '@/components/prompt/PromptMonacoEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import type { Skill, SkillCandidate, SkillFile, SkillVersion } from '@/types/skill';

// getRandomValues 在 HTTP 局域网环境也可用，用于为一次保存生成 UUID。
function requestUuid() {
  const value = crypto.getRandomValues(new Uint8Array(16));
  value[6] = (value[6] & 15) | 64;
  value[8] = (value[8] & 63) | 128;
  const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
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
  manual,
  close,
  saved
}: {
  target?: Skill;
  existing: Skill[];
  manual: boolean;
  close: () => void;
  saved: (version: SkillVersion) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const epoch = useRef(0);
  const requestId = useRef(requestUuid());
  const [file, setFile] = useState<File>();
  const [candidate, setCandidate] = useState<SkillCandidate>();
  const [source, setSource] = useState(starter);
  const [name, setName] = useState(target?.versions[0].name ?? '');
  const [description, setDescription] = useState(target?.versions[0].description ?? '');
  const [duplicateAccepted, setDuplicateAccepted] = useState(false);
  const duplicate = !target && existing.some((item) => item.versions[0].name.trim() === name.trim());
  const [note, setNote] = useState(target ? '' : '首次上传');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
    return () => {
      epoch.current++;
    };
  }, []);
  const choose = async (next?: File) => {
    const current = ++epoch.current;
    setFile(next);
    setCandidate(undefined);
    setError('');
    setAccepted(false);
    if (!next) return;
    setBusy(true);
    try {
      const parsed = await skillsApi.inspect(next);
      if (current !== epoch.current) return;
      setCandidate(parsed);
      if (!target) {
        setName(parsed.name);
        setDescription(parsed.description);
      }
    } catch (err) {
      if (current === epoch.current) setError(errorMessage(err));
    } finally {
      if (current === epoch.current) setBusy(false);
    }
  };
  const replacing = target?.versions[0].format === 'ZIP' && candidate?.format === 'MD';
  const submit = async () => {
    setError('');
    if (!name.trim() || !note.trim()) return setError('请填写展示名称和变更说明。');
    if (duplicate && !duplicateAccepted) return setError('已有同名 SKILL，请确认另建，或前往已有资源上传新版本。');
    if (replacing && !accepted) return setError('请确认单文件替换目录包的影响。');
    setBusy(true);
    try {
      const upload = manual ? new File([source], 'SKILL.md', { type: 'text/markdown' }) : file;
      if (!upload) return setError('请选择文件。');
      const version = await skillsApi.save(
        {
          file: upload,
          name,
          description,
          note,
          requestId: requestId.current,
          expectedVersionId: target?.versions[0].id
        },
        target?.id
      );
      saved(version);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
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
        <header className="relative border-b px-6 py-5">
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
            {target ? '上传新版本' : manual ? '新增 SKILL' : '上传 SKILL'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {target
              ? `更新 ${target.versions[0].name} · 当前 v${target.versions[0].number}`
              : '将本地 SKILL 保存到个人仓库。'}
          </p>
        </header>
        <div className="space-y-4 overflow-auto px-6 py-5">
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
                展示名称
                <Input
                  className="mt-1"
                  value={name}
                  maxLength={200}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                简介
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
                    <PromptMonacoEditor value={source} onChange={setSource} />
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
        </div>
        <footer className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" disabled={busy} onClick={close}>
            取消
          </Button>
          <Button disabled={busy || (!manual && !candidate)} onClick={() => void submit()}>
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

export function SkillCenter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [list, setList] = useState<Skill[]>([]);
  const [skill, setSkill] = useState<Skill>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState('');
  const [format, setFormat] = useState('ALL');
  const [dialog, setDialog] = useState<'upload' | 'manual' | null>(null);
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
  const [path, setPath] = useState('SKILL.md');
  const load = useCallback(async () => {
    const run = ++generation.current;
    setLoading(true);
    setFailed(false);
    setTexts({});
    setTextErrors({});
    pending.current.clear();
    try {
      if (id) {
        const result = await skillsApi.detail(id);
        if (run !== generation.current) return;
        setSkill(result);
        setSelected(result.versions[0].id);
        setLeft(result.versions[1]?.id ?? result.versions[0].id);
        setRight(result.versions[0].id);
        setPath('SKILL.md');
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
  }, [id]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const remove = async (item: Skill) => {
    if (
      !(await confirm({
        title: '删除 SKILL',
        description: `确认删除 ${item.versions[0].name} 及其全部 ${item._count?.versions ?? item.versions.length} 个版本？删除后无法从界面恢复。`,
        confirmText: '确认删除',
        destructive: true
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
  const download = (item: Skill, version: SkillVersion) => {
    void skillsApi.download(item.id, version).catch(() => undefined);
  };
  const filtered = list.filter(
    (item) =>
      `${item.versions[0]?.name} ${item.versions[0]?.description}`.toLowerCase().includes(search.toLowerCase()) &&
      (format === 'ALL' || item.versions[0]?.format === format)
  );
  const version = skill?.versions.find((item) => item.id === selected);
  const old = skill?.versions.find((item) => item.id === left);
  const current = skill?.versions.find((item) => item.id === right);
  const paths = Array.from(
    new Set([...(old?.files ?? []).map((file) => file.path), ...(current?.files ?? []).map((file) => file.path)])
  ).sort();
  const comparePath = paths.includes(path) ? path : paths[0];
  const oldFile = old?.files.find((file) => file.path === comparePath);
  const newFile = current?.files.find((file) => file.path === comparePath);
  const change = (a?: SkillFile, b?: SkillFile) => (!a ? '新增' : !b ? '删除' : a.hash === b.hash ? '未变' : '修改');
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
  const retry = (files: Array<SkillFile | undefined>) =>
    setTextErrors((state) => {
      const next = { ...state };
      files.forEach((file) => {
        if (file?.id) delete next[file.id];
      });
      return next;
    });
  const loadError = (file?: SkillFile) => Boolean(file?.id && textErrors[file.id]);
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 p-6">
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
                  {['名称', '格式', '当前版本', '文件', '更新时间', '操作'].map((label) => (
                    <th key={label} className="px-4 py-3 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const v = item.versions[0];
                  return (
                    <tr key={item.id} className="border-t">
                      <td className="px-4 py-4">
                        <Link className="font-medium text-indigo-700 hover:underline" to={`/skills/${item.id}`}>
                          {v.name}
                        </Link>
                        <p className="mt-1 max-w-md truncate text-slate-500">{v.description}</p>
                      </td>
                      <td className="px-4">{v.format === 'MD' ? '单文件' : '目录包'}</td>
                      <td className="px-4">v{v.number}</td>
                      <td className="px-4">{v.files.length}</td>
                      <td className="px-4 text-slate-500">{date(item.updatedAt)}</td>
                      <td className="px-4">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="下载当前版本"
                            aria-label="下载当前版本"
                            onClick={() => download(item, v)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
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
              <h1 className="text-2xl font-semibold">{version.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{version.description}</p>
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
              <Button variant="outline" onClick={() => setDialog('upload')}>
                <Upload className="mr-2 h-4 w-4" />
                上传新版本
              </Button>
              <Button onClick={() => download(skill, version)}>
                <Download className="mr-2 h-4 w-4" />
                下载 v{version.number}
              </Button>
            </div>
          </header>
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
            <div className="overflow-hidden rounded-lg border bg-white">
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
              <div className="grid min-h-[450px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
                <aside className="max-h-[600px] overflow-auto border-b bg-slate-50 p-2 md:border-b-0 md:border-r">
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
                <div className="min-w-0">
                  <div className="flex justify-between border-b p-3 text-sm">
                    <strong className="break-all">{chosenFile?.path}</strong>
                    <span className="text-slate-500">{chosenFile && bytes(chosenFile.size)} · 只读</span>
                  </div>
                  {loadError(chosenFile) ? (
                    <div className="p-8 text-sm">
                      文件加载失败。
                      <Button variant="outline" onClick={() => retry([chosenFile])}>
                        重试
                      </Button>
                    </div>
                  ) : fileText(chosenFile) === undefined ? (
                    <p className="p-8 text-sm text-slate-500">正在加载文件…</p>
                  ) : fileText(chosenFile) !== null ? (
                    <div className="flex h-[450px] flex-col">
                      <PromptMonacoEditor
                        value={fileText(chosenFile) ?? ''}
                        readOnly
                        language={chosenFile?.path.endsWith('.md') ? 'markdown' : 'plaintext'}
                      />
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
                              title={`下载 v${v.number}`}
                              aria-label={`下载 v${v.number}`}
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
                <span className="text-sm">旧版</span>
                <VersionSelect versions={skill.versions} value={left} change={setLeft} />
                <Button
                  variant="outline"
                  size="icon"
                  title="交换对比方向"
                  aria-label="交换对比方向"
                  onClick={() => {
                    setLeft(right);
                    setRight(left);
                  }}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                <span className="text-sm">新版</span>
                <VersionSelect versions={skill.versions} value={right} change={setRight} />
              </div>
              {left === right ? (
                <div className="rounded-lg border bg-white p-12 text-center text-sm text-slate-500">
                  所选版本相同，请选择不同版本。
                </div>
              ) : (
                <div className="grid min-h-[500px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] overflow-hidden rounded-lg border bg-white">
                  <aside className="max-h-[600px] overflow-auto border-b bg-slate-50 p-2 md:border-b-0 md:border-r">
                    {paths.map((p) => {
                      const state = change(
                        old.files.find((f) => f.path === p),
                        current.files.find((f) => f.path === p)
                      );
                      return (
                        <button
                          key={p}
                          onClick={() => setPath(p)}
                          className={`flex w-full gap-2 rounded px-3 py-2 text-left text-sm ${comparePath === p ? 'bg-indigo-100' : 'hover:bg-slate-100'}`}
                        >
                          <span className="shrink-0 text-slate-500">{state}</span>
                          <span className="break-all">{p}</span>
                        </button>
                      );
                    })}
                  </aside>
                  <div className="min-w-0">
                    <div className="border-b p-3 text-sm font-medium">
                      {comparePath} · {change(oldFile, newFile)}
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
                          旧版：
                          {oldFile ? `${bytes(oldFile.size)} · ${oldFile.hash}` : '不存在'}
                        </p>
                        <p>
                          新版：
                          {newFile ? `${bytes(newFile.size)} · ${newFile.hash}` : '不存在'}
                        </p>
                      </div>
                    ) : (
                      <div className="h-[500px]">
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
          <p className="text-xs text-slate-500">
            下载保留所选版本的原始文件；在其他设备使用前请自行备份并替换本地目录。
          </p>
        </>
      ) : null}
      {dialog && (
        <UploadDialog
          target={id ? skill : undefined}
          existing={list}
          manual={dialog === 'manual'}
          close={() => setDialog(null)}
          saved={(v) => {
            setDialog(null);
            toast({ title: `已保存 v${v.number}`, variant: 'success' });
            if (id) void load();
            else navigate(`/skills/${v.skillId}`);
          }}
        />
      )}
    </div>
  );
}
