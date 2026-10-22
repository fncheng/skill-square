import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { getMarkdownImagePolicy } from '@/api/markdown-image-policy';
import type { MarkdownImagePolicy } from '@/types/domain';

export type MarkdownImagePolicyStatus = 'loading' | 'ready' | 'failed';

interface MarkdownImagePolicyContextValue {
  status: MarkdownImagePolicyStatus;
  allowedHosts: ReadonlySet<string>;
  policy: MarkdownImagePolicy | null;
  refresh: () => Promise<MarkdownImagePolicy | null>;
}

const emptyHosts = new Set<string>();
const defaultContext: MarkdownImagePolicyContextValue = {
  status: 'failed',
  allowedHosts: emptyHosts,
  policy: null,
  refresh: async () => null
};
const MarkdownImagePolicyContext = createContext<MarkdownImagePolicyContextValue>(defaultContext);

/**
 * 应用级图片策略来源。策略尚未就绪或读取失败时保留空 Host 集合，
 * 让所有 Markdown 入口都默认不创建外部图片元素。
 */
export function MarkdownImagePolicyProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<MarkdownImagePolicyStatus>('loading');
  const [policy, setPolicy] = useState<MarkdownImagePolicy | null>(null);
  const refreshSequenceRef = useRef(0);

  const refresh = useCallback(async (): Promise<MarkdownImagePolicy | null> => {
    const refreshSequence = ++refreshSequenceRef.current;
    setStatus('loading');
    try {
      const nextPolicy = await getMarkdownImagePolicy();
      if (refreshSequence !== refreshSequenceRef.current) {
        return null;
      }
      setPolicy(nextPolicy);
      setStatus('ready');
      return nextPolicy;
    } catch {
      if (refreshSequence !== refreshSequenceRef.current) {
        return null;
      }
      setPolicy(null);
      setStatus('failed');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [refresh]);

  const value = useMemo<MarkdownImagePolicyContextValue>(
    () => ({
      status,
      policy,
      allowedHosts: status === 'ready' && policy ? new Set(policy.allowedHosts) : emptyHosts,
      refresh
    }),
    [policy, refresh, status]
  );

  return <MarkdownImagePolicyContext.Provider value={value}>{children}</MarkdownImagePolicyContext.Provider>;
}

/** 未挂载 Provider 的独立渲染也以失败状态回退，避免误放行图片。 */
export function useMarkdownImagePolicy(): MarkdownImagePolicyContextValue {
  return useContext(MarkdownImagePolicyContext);
}
