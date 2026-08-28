import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeadProps {
  /** 主标题 */
  title: ReactNode;
  /** 副标题描述，可选 */
  subtitle?: ReactNode;
  /** 返回目标路径；传入后在标题左侧显示返回按钮 */
  back?: string;
  /** 右侧操作区内容，可选 */
  actions?: ReactNode;
  /** 详情页启用时避开固定顶栏吸顶，不影响列表与编辑页。 */
  sticky?: boolean;
}

/** 页面统一头部：左侧返回按钮 + 标题，右侧操作区，返回与操作同处一行。 */
export function PageHead({ title, subtitle, back, actions, sticky = false }: PageHeadProps) {
  return (
    <div className={sticky ? 'page-head page-head--sticky' : 'page-head'}>
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
  );
}
