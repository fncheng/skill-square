<template>
  <section class="solution-home">
    <div class="page-head">
      <div>
        <h1 class="page-title">解决方案</h1>
        <p class="page-subtitle">沉淀常见问题的处理方式，以 Markdown 文档形式供随时查阅。</p>
      </div>
      <Button @click="router.push('/solutions/new')">
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

    <section class="solution-grid relative min-h-[200px]">
      <div v-if="loading" class="loading-panel">正在加载解决方案...</div>

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

        <p class="solution-card-desc">{{ item.summary || '暂无摘要' }}</p>

        <div class="solution-card-tags">
          <span v-if="item.category" class="prompt-card-tag category">{{ item.category }}</span>
          <span v-for="tag in item.tags" :key="tag" class="prompt-card-tag muted">{{ tag }}</span>
        </div>

        <footer class="solution-card-meta">
          <span class="flex items-center gap-1.5">
            <Clock class="h-3.5 w-3.5" />
            {{ formatShortDate(item.updatedAt) }}
          </span>
          <div class="solution-card-actions" aria-label="解决方案操作">
            <button type="button" title="编辑" class="card-icon-button" @click.stop="router.push(`/solutions/${item.id}/edit`)">
              <Pencil class="h-4 w-4" />
            </button>
            <button type="button" title="删除" class="card-icon-button" @click.stop="handleDelete(item)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </footer>
      </article>

      <div v-if="!loading && filteredSolutions.length === 0" class="solution-empty">
        <div class="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
          <Search class="h-8 w-8" />
          <p class="font-semibold">暂无匹配的解决方案</p>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Clock, Lightbulb, Pencil, Plus, Search, Trash2, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import { deleteSolution, getSolutions } from '@/api/solutions';
import type { Solution, SolutionFilters } from '@/types/domain';

const router = useRouter();
const { toast } = useToast();
const { confirm } = useConfirm();

const solutions = ref<Solution[]>([]);
const loading = ref(false);

const filters = reactive<SolutionFilters>({
  search: '',
  category: ''
});

onMounted(loadSolutions);

async function loadSolutions() {
  loading.value = true;
  try {
    solutions.value = await getSolutions();
  } finally {
    loading.value = false;
  }
}

const categories = computed(() => Array.from(new Set(solutions.value.map((item) => item.category).filter(Boolean))));

const filteredSolutions = computed(() => {
  const keyword = filters.search.trim().toLowerCase();

  return solutions.value.filter((item) => {
    const matchCategory = !filters.category || item.category === filters.category;
    const matchKeyword =
      !keyword ||
      item.title.toLowerCase().includes(keyword) ||
      item.summary.toLowerCase().includes(keyword) ||
      item.tags.some((tag) => tag.toLowerCase().includes(keyword));

    return matchCategory && matchKeyword;
  });
});

async function handleDelete(solution: Solution) {
  const confirmed = await confirm({
    title: '删除解决方案',
    description: `确认删除「${solution.title}」？该操作不可恢复。`,
    confirmText: '删除',
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  await deleteSolution(solution.id);
  toast({ title: '解决方案已删除', variant: 'success' });
  await loadSolutions();
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}
</script>
