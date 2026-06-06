<template>
  <section class="relative">
    <div v-if="loading" class="loading-panel">正在加载 Prompt...</div>

    <div class="page-head">
      <div>
        <h1 class="page-title">{{ prompt?.name || 'Prompt 详情' }}</h1>
        <p class="page-subtitle">{{ prompt?.description }}</p>
      </div>
      <div class="table-actions">
        <Button variant="outline" @click="copyContent">
          <Copy class="h-4 w-4" />
          一键复制
        </Button>
        <Button @click="router.push(`/prompts/${prompt?.id}/edit`)">
          <Pencil class="h-4 w-4" />
          编辑
        </Button>
      </div>
    </div>

    <div v-if="prompt" class="detail-grid">
      <div class="editor-surface">
        <div class="editor-head">
          <span>Prompt 内容</span>
          <Badge variant="outline">只读</Badge>
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
              <span
                v-for="tag in prompt.tags"
                :key="tag.id"
                class="prompt-card-tag"
                :style="getTagStyle(tag.color)"
              >
                {{ tag.name }}
              </span>
              <span v-if="prompt.tags.length === 0" class="meta-value">无标签</span>
            </div>
          </div>

          <div class="meta-item">
            <span class="meta-label">收藏状态</span>
            <Badge :variant="prompt.isFavorite ? 'secondary' : 'outline'">
              {{ prompt.isFavorite ? '已收藏' : '未收藏' }}
            </Badge>
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

    <div class="table-surface mt-4">
      <div class="page-head mb-2">
        <div>
          <h2 class="text-lg font-black">版本历史</h2>
          <p class="page-subtitle">每次创建、编辑和回滚都会形成一个快照版本。</p>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>版本</th>
            <th>名称</th>
            <th>分类</th>
            <th>标签</th>
            <th>生成时间</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="version in versions" :key="version.id">
            <td><Badge variant="outline">v{{ version.version }}</Badge></td>
            <td class="font-semibold">{{ version.name }}</td>
            <td>{{ version.categoryName || '未分类' }}</td>
            <td>
              <div class="tag-list">
                <Badge v-for="tagName in version.tagNames" :key="tagName" variant="secondary">{{ tagName }}</Badge>
                <span v-if="version.tagNames.length === 0" class="meta-value">无标签</span>
              </div>
            </td>
            <td>{{ formatDateTime(version.createdAt) }}</td>
            <td>
              <div class="table-actions">
                <Button variant="outline" size="icon" title="查看版本" @click="openVersion(version)">
                  <Eye class="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="回滚" @click="handleRollback(version)">
                  <RotateCcw class="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="versions.length === 0" class="empty-state">暂无版本历史</div>
    </div>

    <Teleport to="body">
      <div v-if="versionDialogVisible" class="dialog-overlay">
        <section class="dialog-panel max-w-3xl">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black">版本内容</h2>
              <p v-if="selectedVersion" class="text-sm text-muted-foreground">
                v{{ selectedVersion.version }} · {{ selectedVersion.categoryName || '未分类' }}
              </p>
            </div>
            <Button variant="ghost" size="icon" @click="versionDialogVisible = false">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <template v-if="selectedVersion">
            <div class="grid gap-2 rounded-lg border bg-slate-50 p-3 text-sm">
              <div><span class="font-semibold">名称：</span>{{ selectedVersion.name }}</div>
              <div><span class="font-semibold">标签：</span>{{ selectedVersion.tagNames.join('、') || '无标签' }}</div>
            </div>
            <pre class="version-content mt-3">{{ selectedVersion.content }}</pre>
          </template>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Copy, Eye, Pencil, RotateCcw, X } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import { getPrompt, getPromptVersions, rollbackPrompt } from '@/api/prompts';
import PromptMonacoEditor from '@/components/prompt/PromptMonacoEditor.vue';
import type { Prompt, PromptVersion } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const { confirm } = useConfirm();
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
  toast({ title: 'Prompt 内容已复制', variant: 'success' });
}

function openVersion(version: PromptVersion) {
  selectedVersion.value = version;
  versionDialogVisible.value = true;
}

async function handleRollback(version: PromptVersion) {
  if (!prompt.value) {
    return;
  }

  const confirmed = await confirm({
    title: '回滚版本',
    description: `确认回滚到 v${version.version}？回滚后会生成新的版本快照。`,
    confirmText: '回滚'
  });

  if (!confirmed) {
    return;
  }

  await rollbackPrompt(prompt.value.id, version.id);
  toast({ title: 'Prompt 已回滚', variant: 'success' });
  await load();
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
