import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, NotebookPen, Pencil, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useToast } from '@/hooks/use-toast';
import { useContentImport } from '@/hooks/use-content-transfer';
import { deleteNote, getNotes, importNote } from '@/api/notes';
import type { Note, NoteFilters } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

export function NoteList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<NoteFilters>({ search: '', category: '' });

  const loadNotes = async () => {
    setLoading(true);
    try {
      setNotes(await getNotes());
    } finally {
      setLoading(false);
    }
  };

  const { fileInputRef, importing, openFilePicker, importFile } = useContentImport({
    resourceType: 'NOTE',
    resourceLabel: '学习笔记',
    importer: importNote,
    onImported: loadNotes
  });

  useEffect(() => {
    void loadNotes();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(notes.map((item) => item.category).filter(Boolean))),
    [notes]
  );

  const filteredNotes = useMemo(() => {
    const keyword = filters.search.trim().toLowerCase();

    return notes.filter((item) => {
      const matchCategory = !filters.category || item.category === filters.category;
      const matchKeyword =
        !keyword ||
        item.title.toLowerCase().includes(keyword) ||
        item.summary.toLowerCase().includes(keyword) ||
        item.tags.some((tag) => tag.toLowerCase().includes(keyword));

      return matchCategory && matchKeyword;
    });
  }, [notes, filters]);

  const handleDelete = async (note: Note) => {
    const confirmed = await confirmDeletion({
      title: '删除笔记',
      description: `删除「${note.title}」后将同时删除其全部批注，该操作不可恢复。`,
      expectedText: note.title
    });

    if (!confirmed) {
      return;
    }

    await deleteNote(note.id);
    toast({ title: '笔记已删除', variant: 'success' });
    await loadNotes();
  };

  return (
    <section className="solution-home">
      <div className="page-head">
        <div>
          <h1 className="page-title">学习笔记</h1>
          <p className="page-subtitle">沉淀日常学习的知识点总结，以 Markdown 文档形式随时查阅。</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => void importFile(event)}
          />
          <Button variant="outline" disabled={importing} onClick={openFilePicker}>
            <Upload className="h-4 w-4" />
            {importing ? '正在导入...' : '导入'}
          </Button>
          <Button onClick={() => navigate('/notes/new')}>
            <Plus className="h-4 w-4" />
            新建笔记
          </Button>
        </div>
      </div>

      <div className="solution-toolbar">
        <label className="solution-search">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            type="text"
            placeholder="搜索标题、摘要、标签关键词..."
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          {filters.search ? (
            <button
              type="button"
              className="solution-search-clear"
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="category-chips">
          <button
            type="button"
            className={`category-chip${!filters.category ? ' active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, category: '' }))}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`category-chip${filters.category === category ? ' active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, category }))}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <section className="solution-grid relative min-h-[200px]">
        {loading ? <div className="loading-panel">正在加载笔记...</div> : null}

        {filteredNotes.map((item) => (
          <article
            key={item.id}
            className="solution-card"
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/notes/${item.id}`)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigate(`/notes/${item.id}`);
              }
            }}
          >
            <header className="solution-card-head">
              <span className="solution-card-icon">
                <NotebookPen className="h-4 w-4" />
              </span>
              <h2 className="solution-card-title">{item.title}</h2>
            </header>

            <p className="solution-card-desc">{item.summary || '暂无摘要'}</p>

            <div className="solution-card-tags">
              {item.category ? <span className="prompt-card-tag category">{item.category}</span> : null}
              {item.tags.map((tag) => (
                <span key={tag} className="prompt-card-tag muted">
                  {tag}
                </span>
              ))}
            </div>

            <footer className="solution-card-meta">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {formatShortDate(item.updatedAt)}
              </span>
              <div className="solution-card-actions" aria-label="笔记操作">
                <button
                  type="button"
                  title="编辑"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/notes/${item.id}/edit`);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="删除"
                  className="card-icon-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleDelete(item);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </article>
        ))}

        {!loading && filteredNotes.length === 0 ? (
          <div className="solution-empty">
            <div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8" />
              <p className="font-semibold">暂无匹配的笔记</p>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
