<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ isEdit ? '编辑 Prompt' : '新建 Prompt' }}</h1>
        <p class="page-subtitle">维护 Prompt 基础信息、分类、标签与正文内容。</p>
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
            <span class="form-label">名称</span>
            <Input v-model="form.name" maxlength="160" placeholder="输入 Prompt 名称" />
            <span class="text-xs text-muted-foreground">{{ form.name.length }}/160</span>
          </label>

          <label class="form-field">
            <span class="form-label">描述</span>
            <Textarea v-model="form.description" maxlength="1000" rows="5" placeholder="输入 Prompt 描述" />
            <span class="text-xs text-muted-foreground">{{ form.description.length }}/1000</span>
          </label>

          <label class="form-field">
            <span class="form-label">分类</span>
            <select v-model="form.categoryId" class="native-select w-full">
              <option :value="null">不设置分类</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </label>

          <label class="form-field">
            <span class="form-label">标签</span>
            <select v-model="form.tagIds" class="native-multi w-full" multiple>
              <option v-for="tag in store.tags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </option>
            </select>
            <span class="text-xs text-muted-foreground">可按住 Ctrl 或 Shift 多选标签。</span>
          </label>

          <label class="checkbox-row">
            <input v-model="form.isFavorite" class="h-4 w-4 accent-indigo-600" type="checkbox" />
            <span>收藏该 Prompt</span>
          </label>
        </div>
      </div>

      <div class="editor-surface">
        <div class="editor-head">
          <span>Prompt 内容</span>
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/composables/use-toast';
import { createPrompt, getPrompt, updatePrompt } from '@/api/prompts';
import PromptMonacoEditor from '@/components/prompt/PromptMonacoEditor.vue';
import { usePromptStore } from '@/stores/prompt';
import type { PromptPayload } from '@/types/domain';

const route = useRoute();
const router = useRouter();
const store = usePromptStore();
const { toast } = useToast();
const saving = ref(false);
const isEdit = computed(() => route.name === 'prompt-edit');

const form = reactive<PromptPayload>({
  name: '',
  description: '',
  content: '',
  categoryId: null,
  tagIds: [],
  isFavorite: false
});

onMounted(async () => {
  await Promise.all([store.fetchCategories(), store.fetchTags()]);

  if (isEdit.value) {
    const id = String(route.params.id);
    const prompt = await getPrompt(id);
    form.name = prompt.name;
    form.description = prompt.description;
    form.content = prompt.content;
    form.categoryId = prompt.categoryId;
    form.tagIds = prompt.tags.map((tag) => tag.id);
    form.isFavorite = prompt.isFavorite;
  }
});

async function handleSubmit() {
  if (!form.name.trim()) {
    toast({ title: '请输入 Prompt 名称', variant: 'destructive' });
    return;
  }

  if (!form.content.trim()) {
    toast({ title: '请输入 Prompt 内容', variant: 'destructive' });
    return;
  }

  saving.value = true;
  try {
    const payload: PromptPayload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId || null,
      tagIds: [...form.tagIds]
    };
    const prompt = isEdit.value
      ? await updatePrompt(String(route.params.id), payload)
      : await createPrompt(payload);
    toast({ title: 'Prompt 已保存', variant: 'success' });
    await router.push(`/prompts/${prompt.id}`);
  } finally {
    saving.value = false;
  }
}
</script>
