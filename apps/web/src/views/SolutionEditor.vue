<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ isEdit ? '编辑解决方案' : '新建解决方案' }}</h1>
        <p class="page-subtitle">维护标题、摘要、分类、标签与 Markdown 正文内容。</p>
      </div>
      <div class="table-actions">
        <Button variant="outline" @click="router.back()">
          <ArrowLeft class="h-4 w-4" />
          返回
        </Button>
        <Button :disabled="saving" @click="handleSubmit">
          <Check class="h-4 w-4" />
          {{ saving ? '保存中...' : '保存' }}
        </Button>
      </div>
    </div>

    <div class="editor-layout">
      <div class="form-surface">
        <div class="form-grid">
          <label class="form-field">
            <span class="form-label">标题</span>
            <Input v-model="form.title" maxlength="200" placeholder="输入解决方案标题" />
            <span class="text-xs text-muted-foreground">{{ form.title.length }}/200</span>
          </label>

          <label class="form-field">
            <span class="form-label">摘要</span>
            <Textarea v-model="form.summary" maxlength="500" rows="4" placeholder="一句话概括该方案，展示在列表卡片上" />
            <span class="text-xs text-muted-foreground">{{ form.summary.length }}/500</span>
          </label>

          <label class="form-field">
            <span class="form-label">分类</span>
            <Input v-model="form.category" maxlength="80" placeholder="如 Codex、部署、环境" list="solution-category-options" />
            <datalist id="solution-category-options">
              <option v-for="category in categoryOptions" :key="category" :value="category" />
            </datalist>
          </label>

          <label class="form-field">
            <span class="form-label">标签</span>
            <Input v-model="tagsText" placeholder="多个标签用逗号分隔，如 Codex, CLAUDE.md" />
            <span class="text-xs text-muted-foreground">使用中文或英文逗号分隔，自动去重。</span>
          </label>
        </div>
      </div>

      <div class="editor-surface">
        <div class="editor-head">
          <span>正文内容</span>
          <Badge variant="outline">Markdown</Badge>
        </div>
        <PromptMonacoEditor v-model="form.content" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Check } from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/composables/use-toast';
import { createSolution, getSolution, getSolutions, updateSolution } from '@/api/solutions';
import PromptMonacoEditor from '@/components/prompt/PromptMonacoEditor.vue';
import type { SolutionPayload } from '@/types/domain';

const route = useRoute();
const router = useRouter();
const { toast } = useToast();
const saving = ref(false);
const isEdit = computed(() => route.name === 'solution-edit');
const categoryOptions = ref<string[]>([]);
const tagsText = ref('');

const form = reactive<SolutionPayload>({
  title: '',
  summary: '',
  content: '',
  category: '',
  tags: []
});

onMounted(async () => {
  const list = await getSolutions();
  categoryOptions.value = Array.from(new Set(list.map((item) => item.category).filter(Boolean)));

  if (isEdit.value) {
    const solution = await getSolution(String(route.params.id));
    form.title = solution.title;
    form.summary = solution.summary;
    form.content = solution.content;
    form.category = solution.category;
    form.tags = [...solution.tags];
    tagsText.value = solution.tags.join(', ');
  }
});

function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

async function handleSubmit() {
  if (!form.title.trim()) {
    toast({ title: '请输入标题', variant: 'destructive' });
    return;
  }

  if (!form.content.trim()) {
    toast({ title: '请输入正文内容', variant: 'destructive' });
    return;
  }

  saving.value = true;
  try {
    const payload: SolutionPayload = {
      title: form.title.trim(),
      summary: form.summary.trim(),
      content: form.content,
      category: form.category.trim(),
      tags: parseTags(tagsText.value)
    };

    const solution = isEdit.value
      ? await updateSolution(String(route.params.id), payload)
      : await createSolution(payload);
    toast({ title: '解决方案已保存', variant: 'success' });
    await router.push(`/solutions/${solution.id}`);
  } finally {
    saving.value = false;
  }
}
</script>
