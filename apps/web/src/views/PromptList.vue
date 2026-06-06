<template>
  <section class="prompt-home">
    <section class="prompt-hero">
      <div class="hero-copy">
        <h1>发现优质 <span>Prompt</span></h1>
        <p>搜索、收藏、管理你的 AI 提示词，让 AI 帮你更高效地完成工作</p>

        <label class="hero-search">
          <el-icon><Search /></el-icon>
          <input
            v-model="store.filters.search"
            type="text"
            placeholder="搜索提示词，例如：代码优化、需求分析、单元测试..."
            @keyup.enter="handleSearch"
          />
          <button v-if="store.filters.search" type="button" class="hero-search-clear" @click="clearSearch">
            <el-icon><Close /></el-icon>
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
          <el-icon><Search /></el-icon>
          <span />
        </div>
        <div class="art-card art-card-primary">
          <div class="art-thumb">&lt;/&gt;</div>
          <i />
          <i />
        </div>
        <div class="art-card">
          <div class="art-thumb">
            <el-icon><Document /></el-icon>
          </div>
          <i />
          <i />
        </div>
        <div class="art-card">
          <div class="art-thumb">
            <el-icon><TrendCharts /></el-icon>
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
        <el-select
          v-model="store.filters.tagIds"
          multiple
          clearable
          collapse-tags
          collapse-tags-tooltip
          filterable
          placeholder="标签筛选"
          @change="handleSearch"
        >
          <el-option v-for="tag in store.tags" :key="tag.id" :label="tag.name" :value="tag.id">
            <span class="color-chip" :style="{ backgroundColor: tag.color }" />
            <span>{{ tag.name }}</span>
          </el-option>
        </el-select>
        <el-select v-model="store.filters.favorite" placeholder="收藏筛选" @change="handleSearch">
          <el-option label="全部" value="" />
          <el-option label="已收藏" value="true" />
          <el-option label="未收藏" value="false" />
        </el-select>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </section>

    <section v-loading="store.loading" class="prompt-card-grid">
      <article v-for="prompt in store.prompts" :key="prompt.id" class="prompt-card">
        <header class="prompt-card-head">
          <RouterLink class="prompt-card-title" :to="`/prompts/${prompt.id}`">{{ prompt.name }}</RouterLink>
          <el-tooltip :content="prompt.isFavorite ? '取消收藏' : '收藏'">
            <button
              type="button"
              :class="['card-star-button', { active: prompt.isFavorite }]"
              @click="handleFavorite(prompt)"
            >
              <el-icon><component :is="prompt.isFavorite ? StarFilled : Star" /></el-icon>
            </button>
          </el-tooltip>
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
          <span class="meta-avatar">A</span>
          <span>Admin</span>
          <span class="date">{{ formatShortDate(prompt.updatedAt) }}</span>
          <el-tooltip content="复制内容">
            <button type="button" class="card-icon-button" @click="copyPrompt(prompt.content)">
              <el-icon><CopyDocument /></el-icon>
            </button>
          </el-tooltip>
          <el-dropdown trigger="click" @command="(command) => handleCardCommand(command, prompt)">
            <button type="button" class="card-icon-button">
              <el-icon><MoreFilled /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="view" :icon="View">查看详情</el-dropdown-item>
                <el-dropdown-item command="edit" :icon="Edit">编辑</el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete">删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </footer>
      </article>

      <div v-if="!store.loading && store.prompts.length === 0" class="prompt-card-empty">
        <el-empty description="暂无匹配的 Prompt" />
      </div>
    </section>

    <div class="card-pagination">
      <el-pagination
        v-model:current-page="store.page"
        v-model:page-size="store.pageSize"
        background
        layout="total, sizes, prev, pager, next"
        :page-sizes="[8, 12, 24, 48]"
        :total="store.total"
        @current-change="store.fetchPrompts"
        @size-change="handlePageSizeChange"
      />
    </div>

    <el-tooltip content="新建 Prompt">
      <button type="button" class="prompt-fab" @click="router.push('/prompts/new')">
        <el-icon><Plus /></el-icon>
      </button>
    </el-tooltip>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  CopyDocument,
  Close,
  Delete,
  Document,
  Edit,
  MoreFilled,
  Plus,
  Refresh,
  Search,
  Star,
  StarFilled,
  TrendCharts,
  View
} from '@element-plus/icons-vue';
import { deletePrompt } from '@/api/prompts';
import { usePromptStore } from '@/stores/prompt';
import type { Prompt } from '@/types/domain';
import { copyText } from '@/utils/clipboard';

type CardCommand = 'view' | 'edit' | 'delete';

const store = usePromptStore();
const route = useRoute();
const router = useRouter();

const hotKeywords = ['代码优化', '需求分析', '单元测试', '接口设计', '文档生成', 'Bug排查'];

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

async function handleReset() {
  store.resetFilters();
  store.pageSize = 8;
  await router.replace('/prompts');
  await store.fetchPrompts();
}

async function handlePageSizeChange() {
  store.page = 1;
  await store.fetchPrompts();
}

async function handleFavorite(prompt: Prompt) {
  await store.toggleFavorite(prompt);
}

async function handleCardCommand(command: string | number, prompt: Prompt) {
  const action = command as CardCommand;

  if (action === 'view') {
    await router.push(`/prompts/${prompt.id}`);
    return;
  }

  if (action === 'edit') {
    await router.push(`/prompts/${prompt.id}/edit`);
    return;
  }

  if (action === 'delete') {
    await handleDelete(prompt.id);
  }
}

async function handleDelete(id: string) {
  try {
    await ElMessageBox.confirm('删除后将同时删除该 Prompt 的历史版本。', '删除 Prompt', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deletePrompt(id);
    ElMessage.success('Prompt 已删除');
    await store.fetchPrompts();
  } catch {
    // 用户取消删除时无需提示。
  }
}

async function copyPrompt(content: string) {
  await copyText(content);
  ElMessage.success('Prompt 内容已复制');
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
