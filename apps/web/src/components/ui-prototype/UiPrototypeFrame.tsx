import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { UiPrototype } from '@/types/domain';
import { cn } from '@/lib/utils';
import { buildUiPrototypeDocument } from '@/utils/ui-prototype';

interface UiPrototypeFrameProps {
  prototype: Pick<UiPrototype, 'title' | 'html' | 'allowExternal'>;
  className?: string;
  style?: CSSProperties;
  interactive?: boolean;
  reloadKey?: number;
}

/** 使用独立源沙箱渲染 HTML，防止原型脚本读取或修改主应用页面。 */
export function UiPrototypeFrame({
  prototype,
  className,
  style,
  interactive = true,
  reloadKey = 0
}: UiPrototypeFrameProps) {
  const source = useMemo(
    () => buildUiPrototypeDocument(prototype.html, prototype.allowExternal),
    [prototype.allowExternal, prototype.html]
  );

  return (
    <iframe
      key={reloadKey}
      className={cn('ui-prototype-frame', className)}
      style={style}
      title={`${prototype.title}预览`}
      srcDoc={source}
      loading="lazy"
      sandbox={interactive ? 'allow-scripts' : ''}
      tabIndex={interactive ? 0 : -1}
    />
  );
}

interface UiPrototypeThumbnailProps {
  prototype: Pick<UiPrototype, 'title' | 'html' | 'allowExternal'>;
}

/** 将固定 1280×720 桌面画布按卡片宽度等比缩放，保证列表缩略图视角稳定。 */
export function UiPrototypeThumbnail({ prototype }: UiPrototypeThumbnailProps) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    const updateScale = () => setScale(shell.clientWidth / 1280);
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={shellRef} className="ui-prototype-thumbnail">
      <UiPrototypeFrame
        prototype={prototype}
        interactive={false}
        className="ui-prototype-thumbnail-frame"
        style={{ transform: `scale(${scale})` }}
      />
    </div>
  );
}
