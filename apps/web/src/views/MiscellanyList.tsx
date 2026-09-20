import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, Clock, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { deleteMiscellany, getMiscellanies, importMiscellany } from '@/api/miscellanies';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useContentImport } from '@/hooks/use-content-transfer';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth';
import type { Miscellany, MiscellanyFilters } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

export function MiscellanyList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const isAdmin = useAuthStore((state) => state.status === 'admin');
  const [miscellanies, setMiscellanies] = useState<Miscellany[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<MiscellanyFilters>({ search: '', category: '' });

  const loadMiscellanies = async () => {
    setLoading(true);
    try { setMiscellanies(await getMiscellanies()); } finally { setLoading(false); }
  };

  const { fileInputRef, importing, openFilePicker, importFile } = useContentImport({
    resourceType: 'MISCELLANY', resourceLabel: '杂谈', importer: importMiscellany, onImported: loadMiscellanies
  });

  useEffect(() => { void loadMiscellanies(); }, []);
  const categories = useMemo(() => Array.from(new Set(miscellanies.map((item) => item.category).filter(Boolean))), [miscellanies]);
  const filteredMiscellanies = useMemo(() => {
    const keyword = filters.search.trim().toLocaleLowerCase('zh-CN');
    return miscellanies.filter((item) => {
      const matchesCategory = !filters.category || item.category === filters.category;
      const matchesKeyword = !keyword || item.title.toLocaleLowerCase('zh-CN').includes(keyword) || item.summary.toLocaleLowerCase('zh-CN').includes(keyword) || item.tags.some((tag) => tag.toLocaleLowerCase('zh-CN').includes(keyword));
      return matchesCategory && matchesKeyword;
    });
  }, [filters, miscellanies]);

  const handleDelete = async (miscellany: Miscellany) => {
    const confirmed = await confirmDeletion({ title: '删除杂谈', description: `删除「${miscellany.title}」后将同时删除其全部批注，该操作不可恢复。`, expectedText: miscellany.title });
    if (!confirmed) return;
    await deleteMiscellany(miscellany.id);
    toast({ title: '杂谈已删除', variant: 'success' });
    await loadMiscellanies();
  };

  return (
    <section className="solution-home">
      <div className="page-head">
        <div><h1 className="page-title">杂谈</h1><p className="page-subtitle">收录零散知识、经验片段、想法与不限定主题的 Markdown 笔记。</p></div>
        {isAdmin ? <div className="flex flex-wrap items-center justify-end gap-2">
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importFile(event)} />
          <Button variant="outline" disabled={importing} onClick={openFilePicker}><Upload className="h-4 w-4" />{importing ? '正在导入...' : '导入'}</Button>
          <Button onClick={() => navigate('/miscellanies/new')}><Plus className="h-4 w-4" />新建杂谈</Button>
        </div> : null}
      </div>
      <div className="solution-toolbar">
        <label className="solution-search"><Search className="h-4 w-4 text-slate-400" /><input value={filters.search} type="text" placeholder="搜索标题、摘要、标签关键词..." onChange={(event) => setFilters((previous) => ({ ...previous, search: event.target.value }))} />
          {filters.search ? <button type="button" className="solution-search-clear" onClick={() => setFilters((previous) => ({ ...previous, search: '' }))}><X className="h-4 w-4" /></button> : null}
        </label>
        <div className="category-chips"><button type="button" className={`category-chip${!filters.category ? ' active' : ''}`} onClick={() => setFilters((previous) => ({ ...previous, category: '' }))}>全部</button>
          {categories.map((category) => <button key={category} type="button" className={`category-chip${filters.category === category ? ' active' : ''}`} onClick={() => setFilters((previous) => ({ ...previous, category }))}>{category}</button>)}
        </div>
      </div>
      <section className="solution-grid relative min-h-[200px]">
        {loading ? <div className="loading-panel">正在加载杂谈...</div> : null}
        {filteredMiscellanies.map((item) => <article key={item.id} className="solution-card" role="link" tabIndex={0} onClick={() => navigate(`/miscellanies/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/miscellanies/${item.id}`); }}>
          <header className="solution-card-head"><span className="solution-card-icon"><BookOpenText className="h-4 w-4" /></span><h2 className="solution-card-title">{item.title}</h2></header>
          <p className="solution-card-desc">{item.summary || '暂无摘要'}</p>
          <div className="solution-card-tags">{item.category ? <span className="prompt-card-tag category">{item.category}</span> : null}{item.tags.map((tag) => <span key={tag} className="prompt-card-tag muted">{tag}</span>)}</div>
          <footer className="solution-card-meta"><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatShortDate(item.updatedAt)}</span>
            {isAdmin ? <div className="solution-card-actions" aria-label="杂谈操作"><button type="button" title="编辑" className="card-icon-button" onClick={(event) => { event.stopPropagation(); navigate(`/miscellanies/${item.id}/edit`); }}><Pencil className="h-4 w-4" /></button><button type="button" title="删除" className="card-icon-button" onClick={(event) => { event.stopPropagation(); void handleDelete(item); }}><Trash2 className="h-4 w-4" /></button></div> : null}
          </footer>
        </article>)}
        {!loading && filteredMiscellanies.length === 0 ? <div className="solution-empty"><div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground"><Search className="h-8 w-8" /><p className="font-semibold">暂无匹配的杂谈</p></div></div> : null}
      </section>
    </section>
  );
}
