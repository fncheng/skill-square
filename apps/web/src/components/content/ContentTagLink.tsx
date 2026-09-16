import { Link } from 'react-router-dom';
import { badgeVariants } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ContentTagLinkProps {
  tag: string;
}

/** 跳转到聚合标签结果页，并保留标签的紧凑展示样式。 */
export function ContentTagLink({ tag }: ContentTagLinkProps) {
  return (
    <Link
      className={cn(
        badgeVariants({ variant: 'secondary' }),
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      to={`/tag-articles?tag=${encodeURIComponent(tag)}`}
      aria-label={`查看标签 ${tag} 下的相关内容`}
    >
      {tag}
    </Link>
  );
}
