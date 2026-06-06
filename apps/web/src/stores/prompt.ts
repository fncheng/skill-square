import { defineStore } from 'pinia';
import { getCategories } from '@/api/categories';
import { getTags } from '@/api/tags';
import { favoritePrompt, getPrompts, unfavoritePrompt } from '@/api/prompts';
import type { Category, Prompt, Tag } from '@/types/domain';

type FavoriteFilter = '' | 'true' | 'false';

export const usePromptStore = defineStore('prompt', {
  state: () => ({
    prompts: [] as Prompt[],
    categories: [] as Category[],
    tags: [] as Tag[],
    total: 0,
    page: 1,
    pageSize: 10,
    loading: false,
    filters: {
      search: '',
      categoryId: '',
      tagIds: [] as string[],
      favorite: '' as FavoriteFilter
    }
  }),

  actions: {
    async bootstrap() {
      await Promise.all([this.fetchCategories(), this.fetchTags(), this.fetchPrompts()]);
    },

    async fetchCategories() {
      this.categories = await getCategories();
    },

    async fetchTags() {
      this.tags = await getTags();
    },

    async fetchPrompts() {
      this.loading = true;
      try {
        const data = await getPrompts({
          page: this.page,
          pageSize: this.pageSize,
          search: this.filters.search || undefined,
          categoryId: this.filters.categoryId || undefined,
          tagIds: this.filters.tagIds,
          favorite: this.filters.favorite === '' ? undefined : this.filters.favorite === 'true'
        });
        this.prompts = data.items;
        this.total = data.total;
        this.page = data.page;
        this.pageSize = data.pageSize;
      } finally {
        this.loading = false;
      }
    },

    resetFilters() {
      this.filters.search = '';
      this.filters.categoryId = '';
      this.filters.tagIds = [];
      this.filters.favorite = '';
      this.page = 1;
    },

    async toggleFavorite(prompt: Prompt) {
      const updated = prompt.isFavorite ? await unfavoritePrompt(prompt.id) : await favoritePrompt(prompt.id);
      const index = this.prompts.findIndex((item) => item.id === prompt.id);
      if (index >= 0) {
        this.prompts[index] = updated;
      }
    }
  }
});
