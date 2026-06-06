<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">Prompt 列表</h1>
        <p class="page-subtitle">统一管理 Prompt、Agent Workflow、Skill 与规则模板。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="router.push('/prompts/new')">新建 Prompt</el-button>
    </div>

    <div class="toolbar-surface">
      <el-input
        v-model="store.filters.search"
        class="search-input"
        clearable
        placeholder="搜索名称或内容"
        :prefix-icon="Search"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="store.filters.categoryId"
        clearable
        filterable
        placeholder="分类筛选"
        @change="handleSearch"
      >
        <el-option
          v-for="category in store.categories"
          :key="category.id"
          :label="category.name"
          :value="category.id"
        />
      </el-select>
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
      <el-button :icon="Search" type="primary" plain @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <div class="table-surface">
      <el-table v-loading="store.loading" :data="store.prompts" row-key="id" stripe>
        <el-table-column label="名称" min-width="260">
          <template #default="{ row }">
            <div class="prompt-name-cell">
              <RouterLink class="prompt-name-link" :to="`/prompts/${row.id}`">{{ row.name }}</RouterLink>
              <span class="prompt-desc">{{ row.description }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.category" effect="plain">{{ row.category.name }}</el-tag>
            <span v-else class="meta-value">未分类</span>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag
                v-for="tag in row.tags"
                :key="tag.id"
                effect="light"
                :color="tag.color"
                style="color: #fff; border-color: transparent"
              >
                {{ tag.name }}
              </el-tag>
              <span v-if="row.tags.length === 0" class="meta-value">无标签</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="是否收藏" width="110" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.isFavorite ? '取消收藏' : '收藏'">
              <el-button
                :type="row.isFavorite ? 'warning' : 'default'"
                :icon="row.isFavorite ? StarFilled : Star"
                circle
                @click="handleFavorite(row)"
              />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="210" fixed="right" align="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-tooltip content="查看详情">
                <el-button :icon="View" circle @click="router.push(`/prompts/${row.id}`)" />
              </el-tooltip>
              <el-tooltip content="编辑">
                <el-button :icon="Edit" circle @click="router.push(`/prompts/${row.id}/edit`)" />
              </el-tooltip>
              <el-tooltip content="复制内容">
                <el-button :icon="CopyDocument" circle @click="copyPrompt(row.content)" />
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button :icon="Delete" circle type="danger" plain @click="handleDelete(row.id)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="store.page"
          v-model:page-size="store.pageSize"
          background
          layout="total, sizes, prev, pager, next"
          :page-sizes="[10, 20, 50]"
          :total="store.total"
          @current-change="store.fetchPrompts"
          @size-change="handlePageSizeChange"
        />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CopyDocument, Delete, Edit, Plus, Search, Star, StarFilled, View } from '@element-plus/icons-vue';
import { deletePrompt } from '@/api/prompts';
import { usePromptStore } from '@/stores/prompt';
import type { Prompt } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

const store = usePromptStore();
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  store.filters.favorite = route.query.favorite === 'true' ? 'true' : '';
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

async function handleReset() {
  store.resetFilters();
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
</script>
