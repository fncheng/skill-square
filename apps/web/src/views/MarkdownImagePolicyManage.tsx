import { useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { CheckCircle2, Image, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { updateMarkdownImagePolicy } from '@/api/markdown-image-policy';
import { useMarkdownImagePolicy } from '@/components/markdown/MarkdownImagePolicyProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { getAllowedMarkdownImageUrl, normalizeMarkdownImageHost } from '@/utils/markdown-image-host';
import { formatDateTime } from '@/utils/date';
import type { MarkdownImagePolicy } from '@/types/domain';

function sameHosts(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((host, index) => host === right[index]);
}

interface ApiErrorBody {
  message?: string | string[];
}

function getSaveErrorMessage(error: unknown): string {
  if (isAxiosError<ApiErrorBody>(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join('；') : message ?? '图床白名单保存失败，请稍后重试。';
  }
  return '图床白名单保存失败，请稍后重试。';
}

/** 管理员以版本条件维护 Markdown 外部图片精确 Host 白名单。 */
export function MarkdownImagePolicyManage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { status, policy, refresh } = useMarkdownImagePolicy();
  const [draftHosts, setDraftHosts] = useState<string[]>([]);
  const [draftVersion, setDraftVersion] = useState<number | null>(null);
  const [newHost, setNewHost] = useState('');
  const [testUrl, setTestUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const lastPolicyRef = useRef<MarkdownImagePolicy | null>(null);

  useEffect(() => {
    if (!policy) {
      return;
    }
    const previousPolicy = lastPolicyRef.current;
    const hasLocalDraft = Boolean(
      previousPolicy &&
        draftVersion !== null &&
        (draftVersion !== previousPolicy.version || !sameHosts(draftHosts, previousPolicy.allowedHosts))
    );
    if (!hasLocalDraft) {
      setDraftHosts(policy.allowedHosts);
      setDraftVersion(policy.version);
    }
    lastPolicyRef.current = policy;
  }, [draftHosts, draftVersion, policy]);

  const hasChanges = useMemo(
    () => Boolean(policy && draftVersion !== null && (!sameHosts(draftHosts, policy.allowedHosts) || draftVersion !== policy.version)),
    [draftHosts, draftVersion, policy]
  );

  const testResult = useMemo(() => {
    if (!testUrl.trim()) {
      return null;
    }
    try {
      const url = new URL(testUrl.trim());
      const hostname = url.hostname.toLowerCase();
      const allowed = getAllowedMarkdownImageUrl(testUrl.trim(), new Set(draftHosts)) !== null;
      return { hostname: hostname || '无 Host', allowed };
    } catch {
      return { hostname: 'URL 格式无效', allowed: false };
    }
  }, [draftHosts, testUrl]);

  const addHost = () => {
    const normalizedHost = normalizeMarkdownImageHost(newHost);
    if (!normalizedHost) {
      toast({ title: '请输入合法的精确 Host', description: '仅允许公网 DNS Host，不可包含协议、端口、路径或通配符。', variant: 'destructive' });
      return;
    }
    if (draftHosts.includes(normalizedHost)) {
      toast({ title: '该 Host 已在白名单中', variant: 'destructive' });
      return;
    }
    setDraftHosts((current) => [...current, normalizedHost].sort((left, right) => left.localeCompare(right)));
    setNewHost('');
  };

  const removeHost = async (host: string) => {
    const confirmed = await confirm({
      title: '移除图床 Host',
      description: `移除「${host}」后，历史 Markdown 中来自该 Host 的图片会立即停止展示。`,
      confirmText: '确认移除',
      destructive: true
    });
    if (confirmed) {
      setDraftHosts((current) => current.filter((item) => item !== host));
    }
  };

  const clearHosts = async () => {
    const confirmed = await confirm({
      title: '清空图床白名单',
      description: '清空后所有历史 Markdown 外部图片都会停止展示。此操作需要保存后才会生效。',
      confirmText: '确认清空',
      destructive: true,
      verification: {
        expectedText: '清空白名单',
        instruction: '请输入“清空白名单”以确认。'
      }
    });
    if (confirmed) {
      setDraftHosts([]);
    }
  };

  const reloadRemotePolicy = async () => {
    const latestPolicy = await refresh();
    if (!latestPolicy) {
      toast({ title: '策略加载失败', description: '当前仍会拒绝所有外部 Markdown 图片，请稍后重试。', variant: 'destructive' });
      return;
    }
    setDraftHosts(latestPolicy.allowedHosts);
    setDraftVersion(latestPolicy.version);
    toast({ title: '已加载最新策略', variant: 'success' });
  };

  const saveChanges = async () => {
    if (draftVersion === null || saving) {
      return;
    }
    setSaving(true);
    try {
      const updatedPolicy = await updateMarkdownImagePolicy({ allowedHosts: draftHosts, expectedVersion: draftVersion });
      setDraftHosts(updatedPolicy.allowedHosts);
      setDraftVersion(updatedPolicy.version);
      await refresh();
      toast({ title: '图床白名单已保存', variant: 'success' });
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast({
          title: '保存冲突',
          description: '其他管理员已更新策略；本地草稿已保留，请重新加载后决定如何合并。',
          variant: 'destructive'
        });
      } else {
        toast({ title: '保存失败', description: getSaveErrorMessage(error), variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  const isLoading = status === 'loading' && draftVersion === null;
  const isFailed = status === 'failed';

  return (
    <section>
      <div className="page-head">
        <div>
          <h1 className="page-title">图床白名单</h1>
          <p className="page-subtitle">仅精确匹配 HTTPS Host；不支持通配符。移除 Host 后，历史 Markdown 对应图片会停止展示。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={saving} onClick={() => void reloadRemotePolicy()}>
            <RefreshCw className="h-4 w-4" />
            重新加载
          </Button>
          <Button disabled={!hasChanges || saving || draftVersion === null} onClick={() => void saveChanges()}>
            {saving ? '保存中...' : '保存变更'}
          </Button>
        </div>
      </div>

      <div className="mb-5 grid gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex gap-2">
          <Image className="mt-0.5 h-4 w-4 shrink-0" />
          <p>只接受如 <code>cdn.example.com</code> 的精确公网 Host。输入不会立即生效，需统一保存；无策略、加载中或读取失败时，Markdown 不会请求外部图片。</p>
        </div>
        {policy?.updatedAt ? <p className="text-xs text-amber-800">当前策略最近更新于 {formatDateTime(policy.updatedAt)}，版本 {policy.version}。</p> : null}
      </div>

      <div className="manage-surface mb-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <Input
            value={newHost}
            disabled={saving}
            maxLength={253}
            placeholder="例如 images.unsplash.com"
            aria-label="新增图床 Host"
            onChange={(event) => setNewHost(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addHost();
              }
            }}
          />
          <Button disabled={saving || !newHost.trim()} onClick={addHost}>
            <Plus className="h-4 w-4" />
            加入草稿
          </Button>
          <Button variant="outline" disabled={saving || draftHosts.length === 0} onClick={() => void clearHosts()}>
            清空全部
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table min-w-[540px]">
            <thead>
              <tr>
                <th className="w-20">序号</th>
                <th>精确 Host</th>
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {draftHosts.map((host, index) => (
                <tr key={host}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="block max-w-[38rem] truncate font-mono text-xs" title={host}>{host}</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Button variant="outline" size="icon" title={`移除 ${host}`} disabled={saving} onClick={() => void removeHost(host)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isLoading ? <div className="py-12 text-center text-sm text-muted-foreground">正在加载图床白名单...</div> : null}
        {!isLoading && draftHosts.length === 0 ? <div className="empty-state">当前未允许任何外部图床，Markdown 图片将默认不展示。</div> : null}
        {isFailed ? <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">策略读取失败。为保护访问者，所有外部 Markdown 图片当前均被拒绝。</div> : null}
      </div>

      <div className="manage-surface">
        <h2 className="mb-1 text-base font-black">测试图片 URL</h2>
        <p className="mb-4 text-sm text-muted-foreground">此工具只解析 URL 和白名单，不会加载图片或发起网络请求。</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={testUrl} placeholder="https://images.example.com/demo.png" aria-label="测试图片 URL" onChange={(event) => setTestUrl(event.target.value)} />
          {testResult ? (
            <div className="flex min-h-9 items-center gap-1.5 whitespace-nowrap text-sm">
              <CheckCircle2 className={testResult.allowed ? 'h-4 w-4 text-emerald-600' : 'h-4 w-4 text-slate-400'} />
              <span>{testResult.hostname}：{testResult.allowed ? '允许' : '拒绝'}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
