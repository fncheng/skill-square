<template>
  <section class="prompt-home">
    <section class="prompt-hero">
      <div class="hero-copy">
        <h1>发现优质 <span>Prompt</span></h1>
        <p>搜索、收藏、管理你的 AI 提示词，让 AI 帮你更高效地完成工作</p>

        <label class="hero-search">
          <Search class="h-5 w-5 text-slate-500" />
          <input
            v-model="store.filters.search"
            type="text"
            placeholder="搜索提示词，例如：代码优化、需求分析、单元测试..."
            @keyup.enter="handleSearch"
          />
          <button v-if="store.filters.search" type="button" class="hero-search-clear" @click="clearSearch">
            <X class="h-4 w-4" />
          </button>
        </label>

        <div class="hot-keywords">
          <b>热门搜索:</b>
          <button v-for="keyword in hotKeywords" :key="keyword" type="button" @click="applyKeyword(keyword)">
            {{ keyword }}
          </button>
        </div>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="art-search">
          <Search class="h-5 w-5" />
          <span />
        </div>
        <div class="art-card art-card-primary">
          <div class="art-thumb">&lt;/&gt;</div>
          <i />
          <i />
        </div>
        <div class="art-card">
          <div class="art-thumb">
            <FileText class="h-8 w-8" />
          </div>
          <i />
          <i />
        </div>
        <div class="art-card">
          <div class="art-thumb">
            <ChartPie class="h-8 w-8" />
          </div>
          <i />
          <i />
        </div>
      </div>
    </section>

    <section class="category-toolbar">
      <div class="category-main">
        <h2>分类</h2>
        <div class="category-chips">
          <button
            type="button"
            :class="['category-chip', { active: !store.filters.categoryId }]"
            @click="applyCategory('')"
          >
            全部
          </button>
          <button
            v-for="category in store.categories"
            :key="category.id"
            type="button"
            :class="['category-chip', { active: store.filters.categoryId === category.id }]"
            @click="applyCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </div>
      </div>

      <div class="card-view-tools">
        <select
          v-model="store.filters.favorite"
          class="native-select w-36"
          aria-label="收藏筛选"
          @change="handleSearch"
        >
          <option value="">全部收藏</option>
          <option value="true">已收藏</option>
          <option value="false">未收藏</option>
        </select>
        <select
          v-model="selectedTagId"
          class="native-select w-40"
          aria-label="标签筛选"
          @change="applyTagFilter"
        >
          <option value="">全部标签</option>
          <option v-for="tag in store.tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
        </select>
        <Button variant="outline" @click="handleReset">
          <RotateCcw class="h-4 w-4" />
          重置
        </Button>
      </div>
    </section>

    <section class="prompt-card-grid">
      <div v-if="store.loading" class="loading-panel">正在加载 Prompt...</div>

      <article
        v-for="prompt in store.prompts"
        :key="prompt.id"
        class="prompt-card"
        role="link"
        tabindex="0"
        @click="router.push(`/prompts/${prompt.id}`)"
        @keydown.enter="router.push(`/prompts/${prompt.id}`)"
      >
        <header class="prompt-card-head">
          <RouterLink class="prompt-card-title" :to="`/prompts/${prompt.id}`" @click.stop>{{ prompt.name }}</RouterLink>
          <button
            type="button"
            :title="prompt.isFavorite ? '取消收藏' : '收藏'"
            :class="['card-star-button', { active: prompt.isFavorite }]"
            @click.stop="handleFavorite(prompt)"
          >
            <Star class="h-4 w-4" :fill="prompt.isFavorite ? 'currentColor' : 'none'" />
          </button>
        </header>

        <p class="prompt-card-desc">{{ prompt.description || '暂无描述' }}</p>

        <div class="prompt-card-tags">
          <span v-if="prompt.category" class="prompt-card-tag category">{{ prompt.category.name }}</span>
          <span
            v-for="tag in prompt.tags"
            :key="tag.id"
            class="prompt-card-tag"
            :style="getTagStyle(tag.color)"
          >
            {{ tag.name }}
          </span>
          <span v-if="!prompt.category && prompt.tags.length === 0" class="prompt-card-tag muted">无标签</span>
        </div>

        <footer class="prompt-card-meta">
          <div class="prompt-card-owner">
            <span class="meta-avatar">A</span>
            <span>Admin</span>
            <span class="date">{{ formatShortDate(prompt.updatedAt) }}</span>
          </div>
          <div class="prompt-card-actions" aria-label="Prompt 操作">
            <button type="button" title="复制内容" class="card-icon-button" @click.stop="copyPrompt(prompt.content)">
              <Copy class="h-4 w-4" />
            </button>
            <button type="button" title="删除" class="card-icon-button" @click.stop="handleDelete(prompt)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </footer>
      </article>

      <div v-if="!store.loading && store.prompts.length === 0" class="prompt-card-empty">
        <div class="grid place-items-center gap-2 py-8 text-center text-muted-foreground">
          <Search class="h-8 w-8" />
          <p class="font-semibold">暂无匹配的 Prompt</p>
        </div>
      </div>
    </section>

    <div class="card-pagination">
      <span class="text-sm text-muted-foreground">共 {{ store.total }} 条</span>
      <select v-model.number="store.pageSize" class="native-select w-24" @change="handlePageSizeChange">
        <option :value="8">8 条</option>
        <option :value="12">12 条</option>
        <option :value="24">24 条</option>
        <option :value="48">48 条</option>
      </select>
      <Button variant="outline" size="sm" :disabled="store.page <= 1" @click="changePage(store.page - 1)">
        上一页
      </Button>
      <span class="text-sm font-semibold">第 {{ store.page }} / {{ totalPages }} 页</span>
      <Button variant="outline" size="sm" :disabled="store.page >= totalPages" @click="changePage(store.page + 1)">
        下一页
      </Button>
    </div>

    <button type="button" class="prompt-fab" title="新建 Prompt" @click="router.push('/prompts/new')">
      <Plus class="h-7 w-7" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import {
  ChartPie,
  Copy,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import { deletePrompt } from '@/api/prompts';
import { usePromptStore } from '@/stores/prompt';
import type { Prompt } from '@/types/domain';
import { copyText } from '@/utils/clipboard';

const store = usePromptStore();
const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const { confirm } = useConfirm();
const selectedTagId = ref('');

const hotKeywords = ['代码优化', '需求分析', '单元测试', '接口设计', '文档生成', 'Bug排查'];
const totalPages = computed(() => Math.max(1, Math.ceil(store.total / store.pageSize)));

onMounted(async () => {
  store.filters.favorite = route.query.favorite === 'true' ? 'true' : '';
  store.pageSize = 8;
  await store.bootstrap();
});

watch(
  () => route.query.favorite,
  async (value) => {
    store.filters.favorite = value === 'true' ? 'true' : '';
    store.page = 1;
    await store.fetchPrompts();
  }
);

async function handleSearch() {
  store.page = 1;
  await store.fetchPrompts();
}

async function clearSearch() {
  store.filters.search = '';
  await handleSearch();
}

async function applyKeyword(keyword: string) {
  store.filters.search = keyword;
  await handleSearch();
}

async function applyCategory(categoryId: string) {
  store.filters.categoryId = categoryId;
  await handleSearch();
}

async function applyTagFilter() {
  store.filters.tagIds = selectedTagId.value ? [selectedTagId.value] : [];
  await handleSearch();
}

async function handleReset() {
  store.resetFilters();
  selectedTagId.value = '';
  store.pageSize = 8;
  await router.replace('/prompts');
  await store.fetchPrompts();
}

async function handlePageSizeChange() {
  store.page = 1;
  await store.fetchPrompts();
}

async function changePage(page: number) {
  store.page = page;
  await store.fetchPrompts();
}

async function handleFavorite(prompt: Prompt) {
  await store.toggleFavorite(prompt);
}

async function handleDelete(prompt: Prompt) {
  const confirmed = await confirm({
    title: '删除 Prompt',
    description: `确认删除「${prompt.name}」？删除后将同时删除该 Prompt 的历史版本。`,
    confirmText: '删除',
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  await deletePrompt(prompt.id);
  toast({ title: 'Prompt 已删除', variant: 'success' });
  await store.fetchPrompts();
}

async function copyPrompt(content: string) {
  await copyText(content);
  toast({ title: 'Prompt 内容已复制', variant: 'success' });
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function getTagStyle(color: string) {
  return {
    color,
    backgroundColor: hexToRgba(color, 0.12)
  };
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;

  const value = Number.parseInt(fullHex, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
</script>
