<template>
  <section v-loading="loading">
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ prompt?.name || 'Prompt 详情' }}</h1>
        <p class="page-subtitle">{{ prompt?.description }}</p>
      </div>
      <div class="table-actions">
        <el-button :icon="CopyDocument" @click="copyContent">一键复制</el-button>
        <el-button :icon="Edit" type="primary" @click="router.push(`/prompts/${prompt?.id}/edit`)">编辑</el-button>
      </div>
    </div>

    <div v-if="prompt" class="detail-grid">
      <div class="editor-surface">
        <div class="editor-head">
          <span>Prompt 内容</span>
          <el-tag effect="plain">只读</el-tag>
        </div>
        <PromptMonacoEditor v-model="content" read-only />
      </div>

      <aside class="detail-surface">
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">分类</span>
            <span class="meta-value">{{ prompt.category?.name || '未分类' }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">标签</span>
            <div class="tag-list">
              <el-tag
                v-for="tag in prompt.tags"
                :key="tag.id"
                :color="tag.color"
                style="color: #fff; border-color: transparent"
              >
                {{ tag.name }}
              </el-tag>
              <span v-if="prompt.tags.length === 0" class="meta-value">无标签</span>
            </div>
          </div>

          <div class="meta-item">
            <span class="meta-label">收藏状态</span>
            <el-tag :type="prompt.isFavorite ? 'warning' : 'info'" effect="plain">
              {{ prompt.isFavorite ? '已收藏' : '未收藏' }}
            </el-tag>
          </div>

          <div class="meta-item">
            <span class="meta-label">创建时间</span>
            <span class="meta-value">{{ formatDateTime(prompt.createdAt) }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">更新时间</span>
            <span class="meta-value">{{ formatDateTime(prompt.updatedAt) }}</span>
          </div>
        </div>
      </aside>
    </div>

    <div class="table-surface" style="margin-top: 18px">
      <div class="page-head" style="margin-bottom: 8px">
        <div>
          <h2 class="page-title" style="font-size: 18px">版本历史</h2>
          <p class="page-subtitle">每次创建、编辑和回滚都会形成一个快照版本。</p>
        </div>
      </div>

      <el-table :data="versions" row-key="id" stripe>
        <el-table-column label="版本" width="90">
          <template #default="{ row }">
            <el-tag effect="plain">v{{ row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="180" prop="name" />
        <el-table-column label="分类" width="130">
          <template #default="{ row }">{{ row.categoryName || '未分类' }}</template>
        </el-table-column>
        <el-table-column label="标签" min-width="180">
          <template #default="{ row }">
            <div class="tag-list">
              <el-tag v-for="tagName in row.tagNames" :key="tagName" effect="plain">{{ tagName }}</el-tag>
              <span v-if="row.tagNames.length === 0" class="meta-value">无标签</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="生成时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-tooltip content="查看版本">
                <el-button :icon="View" circle @click="openVersion(row)" />
              </el-tooltip>
              <el-tooltip content="回滚">
                <el-button :icon="RefreshLeft" circle type="primary" plain @click="handleRollback(row)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="versionDialogVisible" title="版本内容" width="720px">
      <template v-if="selectedVersion">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="版本">v{{ selectedVersion.version }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ selectedVersion.categoryName || '未分类' }}</el-descriptions-item>
          <el-descriptions-item label="名称" :span="2">{{ selectedVersion.name }}</el-descriptions-item>
        </el-descriptions>
        <pre class="version-content" style="margin-top: 14px">{{ selectedVersion.content }}</pre>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { CopyDocument, Edit, RefreshLeft, View } from '@element-plus/icons-vue';
import { getPrompt, getPromptVersions, rollbackPrompt } from '@/api/prompts';
import PromptMonacoEditor from '@/components/prompt/PromptMonacoEditor.vue';
import type { Prompt, PromptVersion } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const prompt = ref<Prompt>();
const versions = ref<PromptVersion[]>([]);
const selectedVersion = ref<PromptVersion>();
const versionDialogVisible = ref(false);
const loading = ref(false);
const content = ref('');

onMounted(load);

async function load() {
  loading.value = true;
  try {
    const id = String(route.params.id);
    const [promptData, versionData] = await Promise.all([getPrompt(id), getPromptVersions(id)]);
    prompt.value = promptData;
    content.value = promptData.content;
    versions.value = versionData;
  } finally {
    loading.value = false;
  }
}

async function copyContent() {
  if (!prompt.value) {
    return;
  }

  await copyText(prompt.value.content);
  ElMessage.success('Prompt 内容已复制');
}

function openVersion(version: PromptVersion) {
  selectedVersion.value = version;
  versionDialogVisible.value = true;
}

async function handleRollback(version: PromptVersion) {
  if (!prompt.value) {
    return;
  }

  try {
    await ElMessageBox.confirm(`确认回滚到 v${version.version}？`, '回滚版本', {
      type: 'warning',
      confirmButtonText: '回滚',
      cancelButtonText: '取消'
    });
    await rollbackPrompt(prompt.value.id, version.id);
    ElMessage.success('Prompt 已回滚');
    await load();
  } catch {
    // 用户取消回滚时无需提示。
  }
}
</script>
