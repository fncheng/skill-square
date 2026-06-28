<template>
  <section class="solution-home">
    <div class="page-head">
      <div>
        <h1 class="page-title">解决方案</h1>
        <p class="page-subtitle">沉淀常见问题的处理方式，以 Markdown 文档形式供随时查阅。</p>
      </div>
      <Button @click="handleCreate">
        <Plus class="h-4 w-4" />
        新建方案
      </Button>
    </div>

    <div class="solution-toolbar">
      <label class="solution-search">
        <Search class="h-4 w-4 text-slate-400" />
        <input
          v-model="filters.search"
          type="text"
          placeholder="搜索标题、摘要、标签关键词..."
        />
        <button v-if="filters.search" type="button" class="solution-search-clear" @click="filters.search = ''">
          <X class="h-4 w-4" />
        </button>
      </label>

      <div class="category-chips">
        <button
          type="button"
          :class="['category-chip', { active: !filters.category }]"
          @click="filters.category = ''"
        >
          全部
        </button>
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          :class="['category-chip', { active: filters.category === category }]"
          @click="filters.category = category"
        >
          {{ category }}
        </button>
      </div>
    </div>

    <section class="solution-grid">
      <article
        v-for="item in filteredSolutions"
        :key="item.id"
        class="solution-card"
        role="link"
        tabindex="0"
        @click="router.push(`/solutions/${item.id}`)"
        @keydown.enter="router.push(`/solutions/${item.id}`)"
      >
        <header class="solution-card-head">
          <span class="solution-card-icon">
            <Lightbulb class="h-4 w-4" />
          </span>
          <h2 class="solution-card-title">{{ item.title }}</h2>
        </header>

        <p class="solution-card-desc">{{ item.summary }}</p>

        <div class="solution-card-tags">
          <span class="prompt-card-tag category">{{ item.category }}</span>
          <span v-for="tag in item.tags" :key="tag" class="prompt-card-tag muted">{{ tag }}</span>
        </div>

        <footer class="solution-card-meta">
          <span class="flex items-center gap-1.5">
            <Clock class="h-3.5 w-3.5" />
            {{ formatShortDate(item.updatedAt) }}
          </span>
          <span class="solution-card-readmore">
            查看
            <ArrowRight class="h-3.5 w-3.5" />
          </span>
        </footer>
      </article>

      <div v-if="filteredSolutions.length === 0" class="solution-empty">
        <div class="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
          <Search class="h-8 w-8" />
          <p class="font-semibold">暂无匹配的解决方案</p>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Clock, Lightbulb, Plus, Search, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/composables/use-toast';
import { solutions } from '@/data/solutions';
import type { SolutionFilters } from '@/types/domain';

const router = useRouter();
const { toast } = useToast();

function handleCreate() {
  toast({ title: '录入功能开发中', description: '当前为演示数据，接入后端后可在线编写方案。' });
}

const filters = reactive<SolutionFilters>({
  search: '',
  category: ''
});

const categories = computed(() => Array.from(new Set(solutions.map((item) => item.category))));

const filteredSolutions = computed(() => {
  const keyword = filters.search.trim().toLowerCase();

  return solutions.filter((item) => {
    const matchCategory = !filters.category || item.category === filters.category;
    const matchKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.summary.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword));

    return matchCategory && matchKeyword;
  });
});

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}
</script>
