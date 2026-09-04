import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BotMessageSquare, Clock, Lock, MessageSquareText, Pencil, Plus, Search, Trash2, Upload, X
} from 'lucide-react';
import { deleteModelResponse, getModelResponses, importModelResponse } from '@/api/model-responses';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/hooks/use-confirm';
import { useContentImport } from '@/hooks/use-content-transfer';
import { useToast } from '@/hooks/use-toast';
import type { ModelResponse, ModelResponseFilters } from '@/types/domain';
import { formatShortDate } from '@/utils/date';

export function ModelResponseList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirmDeletion } = useConfirm();
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ModelResponseFilters>({ search: '', category: '' });

  const loadResponses = async () => {
    setLoading(true);
    try {
      setResponses(await getModelResponses());
    } finally {
      setLoading(false);
    }
  };

  const { fileInputRef, importing, openFilePicker, importFile } = useContentImport({
    resourceType: 'MODEL_RESPONSE', resourceLabel: '模型回答', importer: importModelResponse, onImported: loadResponses
  });

  useEffect(() => {
    void loadResponses();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(responses.map((item) => item.category).filter(Boolean))),
    [responses]
  );
  const filteredResponses = useMemo(() => {
    const keyword = filters.search.trim().toLocaleLowerCase();
    return responses.filter((item) => {
      const haystack = [item.title, item.summary, item.category, item.sourceProduct, item.modelName, item.originalPrompt, ...item.tags].join(' ').toLocaleLowerCase();
      return (!filters.category || item.category === filters.category) && (!keyword || haystack.includes(keyword));
    });
  }, [filters, responses]);

  const handleDelete = async (response: ModelResponse) => {
    const confirmed = await confirmDeletion({ title: '删除模型回答', description: `删除「${response.title}」后将同时删除其全部批注，该操作不可恢复。`, expectedText: response.title });
    if (!confirmed) return;
    await deleteModelResponse(response.id);
    toast({ title: '模型回答已删除', variant: 'success' });
    await loadResponses();
  };

  return (
    <section className="model-response-home">
      <div className="page-head">
        <div>
          <div className="model-response-title-row">
            <h1 className="page-title">模型回答</h1>
            <span className="model-response-private-badge"><Lock className="h-3.5 w-3.5" />仅登录可见</span>
          </div>
          <p className="page-subtitle">收录值得复用的 AI 回答与原始提问。</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void importFile(event)} />
          <Button variant="outline" disabled={importing} onClick={openFilePicker}><Upload className="h-4 w-4" />{importing ? '正在导入...' : '导入'}</Button>
          <Button onClick={() => navigate('/model-responses/new')}><Plus className="h-4 w-4" />收录回答</Button>
        </div>
      </div>
      <div className="model-response-toolbar">
        <label className="solution-search">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={filters.search} placeholder="搜索标题、摘要、标签或原始问题..." onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          {filters.search ? <button type="button" className="solution-search-clear" aria-label="清空搜索" onClick={() => setFilters((current) => ({ ...current, search: '' }))}><X className="h-4 w-4" /></button> : null}
        </label>
        <div className="category-chips">
          <button type="button" className={`category-chip${!filters.category ? ' active' : ''}`} onClick={() => setFilters((current) => ({ ...current, category: '' }))}>全部</button>
          {categories.map((category) => <button key={category} type="button" className={`category-chip${filters.category === category ? ' active' : ''}`} onClick={() => setFilters((current) => ({ ...current, category }))}>{category}</button>)}
        </div>
        <span className="model-response-result-count">共 {filteredResponses.length} 个</span>
      </div>
      <section className="model-response-grid relative min-h-[230px]">
        {loading ? <div className="loading-panel">正在加载模型回答...</div> : null}
        {filteredResponses.map((item) => (
          <article key={item.id} className="model-response-card" role="link" tabIndex={0} onClick={() => navigate(`/model-responses/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/model-responses/${item.id}`); }}>
            <header className="model-response-card-head"><span className="model-response-card-icon"><BotMessageSquare className="h-4 w-4" /></span><div className="min-w-0 flex-1"><h2 className="model-response-card-title">{item.title}</h2>{item.sourceProduct || item.modelName ? <p className="model-response-source">{[item.sourceProduct, item.modelName].filter(Boolean).join(' · ')}</p> : null}</div></header>
            <p className="model-response-card-desc">{item.summary || '暂无摘要'}</p>
            <div className="solution-card-tags">{item.category ? <span className="prompt-card-tag category">{item.category}</span> : null}{item.tags.slice(0, 3).map((tag) => <span key={tag} className="prompt-card-tag muted">{tag}</span>)}</div>
            <footer className="solution-card-meta"><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{formatShortDate(item.updatedAt)}</span><span className="model-response-annotation-total"><MessageSquareText className="h-3.5 w-3.5" />{item.annotationCount}</span><div className="solution-card-actions" aria-label="模型回答操作"><button type="button" title="编辑" className="card-icon-button" onClick={(event) => { event.stopPropagation(); navigate(`/model-responses/${item.id}/edit`); }}><Pencil className="h-4 w-4" /></button><button type="button" title="删除" className="card-icon-button" onClick={(event) => { event.stopPropagation(); void handleDelete(item); }}><Trash2 className="h-4 w-4" /></button></div></footer>
          </article>
        ))}
        {!loading && filteredResponses.length === 0 ? (
          <div className="solution-empty">
            <div className="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
              <BotMessageSquare className="h-8 w-8" />
              <p className="font-semibold">暂无匹配的模型回答</p>
              <Button size="sm" onClick={() => navigate('/model-responses/new')}>
                <Plus className="h-4 w-4" />
                收录回答
              </Button>
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}
