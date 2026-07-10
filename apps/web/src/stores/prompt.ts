import { create } from 'zustand';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';
import { favoritePrompt, getPrompts, unfavoritePrompt } from '@/api/prompts';
import type { Category, Prompt, Tag } from '@/types/domain';

export type FavoriteFilter = '' | 'true' | 'false';

export interface PromptFilters {
  search: string;
  categoryId: string;
  tagIds: string[];
  favorite: FavoriteFilter;
}

interface PromptState {
  prompts: Prompt[];
  categories: Category[];
  tags: Tag[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  filters: PromptFilters;
  bootstrap: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchPrompts: () => Promise<void>;
  setFilters: (partial: Partial<PromptFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
  toggleFavorite: (prompt: Prompt) => Promise<void>;
}

const initialFilters: PromptFilters = {
  search: '',
  categoryId: '',
  tagIds: [],
  favorite: ''
};

export const usePromptStore = create<PromptState>((set, get) => ({
  prompts: [],
  categories: [],
  tags: [],
  total: 0,
  page: 1,
  pageSize: 10,
  loading: false,
  filters: { ...initialFilters },

  async bootstrap() {
    await Promise.all([get().fetchCategories(), get().fetchTags(), get().fetchPrompts()]);
  },

  async fetchCategories() {
    set({ categories: await getCategories() });
  },

  async fetchTags() {
    set({ tags: await getTags() });
  },

  async fetchPrompts() {
    set({ loading: true });
    try {
      const { page, pageSize, filters } = get();
      const data = await getPrompts({
        page,
        pageSize,
        search: filters.search || undefined,
        categoryId: filters.categoryId || undefined,
        tagIds: filters.tagIds,
        favorite: filters.favorite === '' ? undefined : filters.favorite === 'true'
      });
      set({ prompts: data.items, total: data.total, page: data.page, pageSize: data.pageSize });
    } finally {
      set({ loading: false });
    }
  },

  setFilters(partial) {
    set((state) => ({ filters: { ...state.filters, ...partial } }));
  },

  setPage(page) {
    set({ page });
  },

  setPageSize(pageSize) {
    set({ pageSize });
  },

  resetFilters() {
    set({ filters: { ...initialFilters }, page: 1 });
  },

  async toggleFavorite(prompt) {
    const updated = prompt.isFavorite ? await unfavoritePrompt(prompt.id) : await favoritePrompt(prompt.id);
    set((state) => ({ prompts: state.prompts.map((item) => (item.id === prompt.id ? updated : item)) }));
  }
}));
