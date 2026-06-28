<template>
  <section class="relative">
    <div v-if="loading" class="loading-panel">正在加载解决方案...</div>

    <div class="page-head">
      <div>
        <h1 class="page-title">{{ solution?.title || '解决方案' }}</h1>
        <p class="page-subtitle">{{ solution?.summary }}</p>
      </div>
      <div v-if="solution" class="table-actions">
        <Button variant="outline" @click="copyContent">
          <Copy class="h-4 w-4" />
          复制 Markdown
        </Button>
        <Button variant="outline" @click="router.push(`/solutions/${solution.id}/edit`)">
          <Pencil class="h-4 w-4" />
          编辑
        </Button>
        <Button variant="outline" @click="handleDelete">
          <Trash2 class="h-4 w-4" />
          删除
        </Button>
      </div>
    </div>

    <div v-if="solution" class="detail-grid">
      <article class="md-surface" v-html="html" />

      <aside class="detail-surface">
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">分类</span>
            <span class="meta-value">{{ solution.category || '未分类' }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">标签</span>
            <div class="tag-list">
              <Badge v-for="tag in solution.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              <span v-if="solution.tags.length === 0" class="meta-value">无标签</span>
            </div>
          </div>

          <div class="meta-item">
            <span class="meta-label">创建时间</span>
            <span class="meta-value">{{ formatDateTime(solution.createdAt) }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">更新时间</span>
            <span class="meta-value">{{ formatDateTime(solution.updatedAt) }}</span>
          </div>

          <div v-if="headings.length > 0" class="meta-item">
            <span class="meta-label">目录</span>
            <nav class="md-toc">
              <a
                v-for="heading in headings"
                :key="heading.id"
                :href="`#${heading.id}`"
                :class="['md-toc-link', `level-${heading.level}`]"
              >
                {{ heading.text }}
              </a>
            </nav>
          </div>
        </div>
      </aside>
    </div>

    <div v-else-if="!loading" class="empty-state">未找到该解决方案</div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Copy, Pencil, Trash2 } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import { useMarkdown } from '@/composables/use-markdown';
import { deleteSolution, getSolution } from '@/api/solutions';
import type { Solution } from '@/types/domain';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const { confirm } = useConfirm();

const solution = ref<Solution>();
const loading = ref(false);

const content = computed(() => solution.value?.content ?? '');
const { html, headings } = useMarkdown(content);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    solution.value = await getSolution(String(route.params.id));
  } finally {
    loading.value = false;
  }
}

async function copyContent() {
  if (!solution.value) return;
  await copyText(solution.value.content);
  toast({ title: 'Markdown 内容已复制', variant: 'success' });
}

async function handleDelete() {
  if (!solution.value) return;

  const confirmed = await confirm({
    title: '删除解决方案',
    description: `确认删除「${solution.value.title}」？该操作不可恢复。`,
    confirmText: '删除',
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  await deleteSolution(solution.value.id);
  toast({ title: '解决方案已删除', variant: 'success' });
  await router.push('/solutions');
}
</script>
