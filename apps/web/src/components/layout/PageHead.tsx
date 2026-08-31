import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const APP_TOPBAR_HEIGHT = 64;

interface PageHeadProps {
  /** 主标题 */
  title: ReactNode;
  /** 副标题描述，可选 */
  subtitle?: ReactNode;
  /** 返回目标路径；传入后在标题左侧显示返回按钮 */
  back?: string;
  /** 右侧操作区内容，可选 */
  actions?: ReactNode;
  /** 原操作区离开视口后显示的详情页轻量操作，可选 */
  compactActions?: ReactNode;
}

/** 页面统一头部：左侧返回按钮 + 标题，右侧操作区，返回与操作同处一行。 */
export function PageHead({ title, subtitle, back, actions, compactActions }: PageHeadProps) {
  const pageHeadRef = useRef<HTMLDivElement>(null);
  const [compactVisible, setCompactVisible] = useState(false);
  const hasCompactActions = compactActions !== undefined && compactActions !== null && compactActions !== false;

  useEffect(() => {
    const pageHead = pageHeadRef.current;
    if (!hasCompactActions || !pageHead) {
      setCompactVisible(false);
      return;
    }

    // 原始页头完全滚过固定顶栏后，才显示轻量操作条，避免页面顶部出现重复操作。
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCompactVisible(!entry.isIntersecting && entry.boundingClientRect.bottom <= APP_TOPBAR_HEIGHT);
      },
      {
        rootMargin: `-${APP_TOPBAR_HEIGHT}px 0px 0px 0px`,
        threshold: 0
      }
    );

    observer.observe(pageHead);
    return () => observer.disconnect();
  }, [hasCompactActions]);

  return (
    <>
      <div ref={pageHeadRef} className="page-head">
        <div className="page-head-main">
          {back ? (
            <Link className="app-main-back" to={back} title="返回上级" aria-label="返回上级">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : null}
          <div>
            <h1 className="page-title">{title}</h1>
            {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {actions ? <div className="table-actions">{actions}</div> : null}
      </div>

      {compactVisible ? (
        <div className="detail-compact-action-bar" role="region" aria-label="详情页快捷操作">
          <div className="detail-compact-action-bar-inner">
            {back ? (
              <Link className="app-main-back" to={back} title="返回上级" aria-label="返回上级">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            ) : null}
            <div className="detail-compact-action-title">{title}</div>
            <div className="detail-compact-action-buttons">{compactActions}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
