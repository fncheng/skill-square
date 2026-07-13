import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  FileText,
  Lightbulb,
  NotebookPen,
  Plus,
  Sparkles,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPrompts } from '@/api/prompts';
import { getSolutions } from '@/api/solutions';
import { getNotes } from '@/api/notes';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';
import type { Note, Prompt, Solution } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

interface HomeStats {
  prompts: number;
  solutions: number;
  notes: number;
  categories: number;
  tags: number;
}

interface RecentEntry {
  id: string;
  title: string;
  meta?: string | null;
  time: string;
  href: string;
}

// 按更新时间倒序，用于「最近更新」列表
function sortByUpdated<T extends { updatedAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<HomeStats>({ prompts: 0, solutions: 0, notes: 0, categories: 0, tags: 0 });
  const [recentPrompts, setRecentPrompts] = useState<Prompt[]>([]);
  const [recentSolutions, setRecentSolutions] = useState<Solution[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const [promptRes, solutions, notes, categories, tags] = await Promise.all([
          getPrompts({ page: 1, pageSize: 5 }),
          getSolutions(),
          getNotes(),
          getCategories(),
          getTags()
        ]);

        if (!active) {
          return;
        }

        setStats({
          prompts: promptRes.total,
          solutions: solutions.length,
          notes: notes.length,
          categories: categories.length,
          tags: tags.length
        });
        setRecentPrompts(promptRes.items);
        setRecentSolutions(sortByUpdated(solutions).slice(0, 5));
        setRecentNotes(sortByUpdated(notes).slice(0, 5));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    { key: 'prompts', label: 'Prompt', value: stats.prompts, icon: FileText, tone: 'indigo', to: '/prompts', hint: '提示词资产' },
    { key: 'solutions', label: '解决方案', value: stats.solutions, icon: Lightbulb, tone: 'amber', to: '/solutions', hint: '问题沉淀' },
    { key: 'notes', label: '学习笔记', value: stats.notes, icon: NotebookPen, tone: 'emerald', to: '/notes', hint: '知识总结' },
    { key: 'meta', label: '分类 / 标签', value: `${stats.categories} / ${stats.tags}`, icon: Tags, tone: 'sky', to: '/categories', hint: '组织维度' }
  ] as const;

  const recentColumns: { title: string; to: string; icon: typeof FileText; items: RecentEntry[] }[] = [
    {
      title: '最近 Prompt',
      to: '/prompts',
      icon: FileText,
      items: recentPrompts.map((item) => ({
        id: item.id,
        title: item.name,
        meta: item.category?.name,
        time: item.updatedAt,
        href: `/prompts/${item.id}`
      }))
    },
    {
      title: '最近解决方案',
      to: '/solutions',
      icon: Lightbulb,
      items: recentSolutions.map((item) => ({
        id: item.id,
        title: item.title,
        meta: item.category,
        time: item.updatedAt,
        href: `/solutions/${item.id}`
      }))
    },
    {
      title: '最近学习笔记',
      to: '/notes',
      icon: NotebookPen,
      items: recentNotes.map((item) => ({
        id: item.id,
        title: item.title,
        meta: item.category,
        time: item.updatedAt,
        href: `/notes/${item.id}`
      }))
    }
  ];

  return (
    <section className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-badge">
            <Sparkles />
            工作台
          </span>
          <h1>
            集中管理你的 <span>AI Prompt</span> 与知识资产
          </h1>
          <p>搜索、收藏、沉淀提示词、解决方案与学习笔记，让每一次 AI 协作都有迹可循、随取随用。</p>
          <div className="home-hero-actions">
            <Button onClick={() => navigate('/prompts/new')}>
              <Plus className="h-4 w-4" />
              新建 Prompt
            </Button>
            <Button variant="outline" onClick={() => navigate('/prompts')}>
              浏览 Prompt 广场
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="home-hero-art" aria-hidden="true">
          <span className="home-hero-glow" />
          <div className="home-hero-orb">
            <Sparkles />
          </div>
          <div className="home-hero-chip chip-1">
            <FileText className="h-5 w-5" />
          </div>
          <div className="home-hero-chip chip-2">
            <Lightbulb className="h-5 w-5" />
          </div>
          <div className="home-hero-chip chip-3">
            <NotebookPen className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="home-stats">
        {statCards.map((card) => (
          <Link key={card.key} to={card.to} className={`stat-card ${card.tone}`}>
            <span className="stat-card-icon">
              <card.icon />
            </span>
            <div className="stat-card-body">
              <span className="stat-card-value">{loading ? '—' : card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
            <span className="stat-card-hint">{card.hint}</span>
            <ArrowUpRight className="stat-card-arrow" />
          </Link>
        ))}
      </section>

      <section className="home-recent">
        {recentColumns.map((column) => (
          <div key={column.title} className="recent-card">
            <header className="recent-head">
              <span className="recent-head-title">
                <column.icon />
                {column.title}
              </span>
              <Link to={column.to} className="recent-head-more">
                全部
                <ArrowRight />
              </Link>
            </header>
            <ul className="recent-list">
              {!loading && column.items.length === 0 ? <li className="recent-empty">暂无内容</li> : null}
              {column.items.map((item) => (
                <li key={item.id} className="recent-item">
                  <Link to={item.href} className="recent-item-link">
                    <span className="recent-item-title">{item.title}</span>
                    <span className="recent-item-meta">
                      {item.meta ? <span className="recent-item-tag">{item.meta}</span> : null}
                      <span className="recent-item-time">
                        <Clock />
                        {formatShortDate(item.time)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </section>
  );
}
