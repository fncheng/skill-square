import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ExternalLink,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Monitor
} from 'lucide-react';
import { deleteUiPrototype, getUiPrototype } from '@/api/ui-prototypes';
import { PageHead } from '@/components/layout/PageHead';
import { UiPrototypeFrame } from '@/components/ui-prototype/UiPrototypeFrame';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { UiPrototype } from '@/types/domain';
import { formatDateTime } from '@/utils/date';
import { openUiPrototypeWindow } from '@/utils/ui-prototype';

type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const deviceLabels: Record<PreviewDevice, string> = {
  desktop: '自适应桌面视口',
  tablet: '820px 平板视口',
  mobile: '390px 手机视口'
};

export function UiPrototypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();

  const [prototype, setPrototype] = useState<UiPrototype>();
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!id) {
        return;
      }
      setLoading(true);
      try {
        setPrototype(await getUiPrototype(id));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const handleDelete = async () => {
    if (!prototype) {
      return;
    }

    const confirmed = await confirmDeletion({
      title: '删除 UI 原型',
      description: `删除「${prototype.title}」后无法恢复。`,
      expectedText: prototype.title
    });

    if (!confirmed) {
      return;
    }

    await deleteUiPrototype(prototype.id);
    toast({ title: 'UI 原型已删除', variant: 'success' });
    navigate('/ui-prototypes');
  };

  return (
    <section className="relative">
      {loading ? <div className="loading-panel">正在加载 UI 原型...</div> : null}

      <PageHead
        title={prototype?.title || 'UI 原型'}
        subtitle={prototype?.summary}
        back="/ui-prototypes"
        actions={
          prototype ? (
            <>
              <Button
                variant="outline"
                onClick={() => openUiPrototypeWindow(prototype.html, prototype.allowExternal)}
              >
                <ExternalLink className="h-4 w-4" />
                新窗口打开
              </Button>
              <Button variant="outline" onClick={() => navigate(`/ui-prototypes/${prototype.id}/edit`)}>
                <Pencil className="h-4 w-4" />
                编辑
              </Button>
              <Button variant="outline" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
                删除
              </Button>
            </>
          ) : null
        }
      />

      {prototype ? (
        <div className="ui-prototype-detail">
          <header className="ui-prototype-preview-toolbar">
            <div className="ui-prototype-device-switch" aria-label="预览尺寸">
              <button
                type="button"
                className={device === 'desktop' ? 'active' : ''}
                title="桌面端"
                aria-label="切换到桌面端预览"
                onClick={() => setDevice('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={device === 'tablet' ? 'active' : ''}
                title="平板"
                aria-label="切换到平板预览"
                onClick={() => setDevice('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={device === 'mobile' ? 'active' : ''}
                title="手机"
                aria-label="切换到手机预览"
                onClick={() => setDevice('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            <span className="ui-prototype-viewport-label">{deviceLabels[device]}</span>

            <Button variant="outline" size="sm" onClick={() => setReloadKey((current) => current + 1)}>
              <RefreshCw className="h-4 w-4" />
              重新加载
            </Button>
          </header>

          <div className="ui-prototype-preview-stage">
            <div className={cn('ui-prototype-preview-device', device)}>
              <UiPrototypeFrame prototype={prototype} reloadKey={reloadKey} />
            </div>
          </div>

          <footer className="ui-prototype-preview-footer">
            <span className="ui-prototype-security-status">
              <ShieldCheck className="h-4 w-4" />
              {prototype.allowExternal ? '沙箱隔离 · 已允许外部资源' : '沙箱隔离 · 已阻止外部资源'}
            </span>
            <span>更新于 {formatDateTime(prototype.updatedAt)}</span>
            <div className="ui-prototype-detail-tags">
              {prototype.category ? <Badge variant="outline">{prototype.category}</Badge> : null}
              {prototype.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </footer>
        </div>
      ) : !loading ? (
        <div className="empty-state">未找到该 UI 原型</div>
      ) : null}
    </section>
  );
}
