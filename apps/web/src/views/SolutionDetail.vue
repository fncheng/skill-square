<template>
  <section class="relative">
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
      </div>
    </div>

    <div v-if="solution" class="detail-grid">
      <article class="md-surface" v-html="html" />

      <aside class="detail-surface">
        <div class="detail-meta">
          <div class="meta-item">
            <span class="meta-label">分类</span>
            <span class="meta-value">{{ solution.category }}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">标签</span>
            <div class="tag-list">
              <Badge v-for="tag in solution.tags" :key="tag" variant="secondary">{{ tag }}</Badge>
              <span v-if="solution.tags.length === 0" class="meta-value">无标签</span>
            </div>
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

    <div v-else class="empty-state">未找到该解决方案</div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Copy } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/composables/use-toast';
import { useMarkdown } from '@/composables/use-markdown';
import { solutions } from '@/data/solutions';
import { copyText } from '@/utils/clipboard';
import { formatDateTime } from '@/utils/date';

const route = useRoute();
const { toast } = useToast();

const solution = computed(() => solutions.find((item) => item.id === String(route.params.id)));
const content = computed(() => solution.value?.content ?? '');
const { html, headings } = useMarkdown(content);

async function copyContent() {
  if (!solution.value) return;
  await copyText(solution.value.content);
  toast({ title: 'Markdown 内容已复制', variant: 'success' });
}
</script>
