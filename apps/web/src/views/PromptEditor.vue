<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">{{ isEdit ? '编辑 Prompt' : '新建 Prompt' }}</h1>
        <p class="page-subtitle">维护 Prompt 基础信息、分类、标签与正文内容。</p>
      </div>
      <div class="table-actions">
        <el-button :icon="Back" @click="router.back()">返回</el-button>
        <el-button type="primary" :icon="Check" :loading="saving" @click="handleSubmit">保存</el-button>
      </div>
    </div>

    <div class="editor-layout">
      <div class="form-surface">
        <el-form ref="formRef" label-position="top" :model="form" :rules="rules">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" maxlength="160" show-word-limit placeholder="输入 Prompt 名称" />
          </el-form-item>

          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              maxlength="1000"
              show-word-limit
              :rows="5"
              placeholder="输入 Prompt 描述"
            />
          </el-form-item>

          <el-form-item label="分类" prop="categoryId">
            <el-select v-model="form.categoryId" clearable filterable placeholder="选择分类" style="width: 100%">
              <el-option
                v-for="category in store.categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="标签" prop="tagIds">
            <el-select
              v-model="form.tagIds"
              multiple
              clearable
              collapse-tags
              collapse-tags-tooltip
              filterable
              placeholder="选择标签"
              style="width: 100%"
            >
              <el-option v-for="tag in store.tags" :key="tag.id" :label="tag.name" :value="tag.id">
                <span class="color-chip" :style="{ backgroundColor: tag.color }" />
                <span>{{ tag.name }}</span>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="收藏">
            <el-switch v-model="form.isFavorite" active-text="已收藏" inactive-text="未收藏" />
          </el-form-item>

          <el-form-item label="内容" prop="content" class="content-validator">
            <el-input v-model="form.content" style="display: none" />
          </el-form-item>
        </el-form>
      </div>

      <div class="editor-surface">
        <div class="editor-head">
          <span>Prompt 内容</span>
          <el-tag effect="plain">Markdown</el-tag>
        </div>
        <PromptMonacoEditor v-model="form.content" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { Back, Check } from '@element-plus/icons-vue';
import { createPrompt, getPrompt, updatePrompt } from '@/api/prompts';
import PromptMonacoEditor from '@/components/prompt/PromptMonacoEditor.vue';
import { usePromptStore } from '@/stores/prompt';
import type { PromptPayload } from '@/types/domain';

const route = useRoute();
const router = useRouter();
const store = usePromptStore();
const formRef = ref<FormInstance>();
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

const rules: FormRules<PromptPayload> = {
  name: [{ required: true, message: '请输入 Prompt 名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入 Prompt 内容', trigger: 'change' }]
};

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
  const valid = await formRef.value?.validate();
  if (!valid) {
    return;
  }

  saving.value = true;
  try {
    const payload: PromptPayload = {
      ...form,
      categoryId: form.categoryId || null,
      tagIds: [...form.tagIds]
    };
    const prompt = isEdit.value
      ? await updatePrompt(String(route.params.id), payload)
      : await createPrompt(payload);
    ElMessage.success('Prompt 已保存');
    await router.push(`/prompts/${prompt.id}`);
  } finally {
    saving.value = false;
  }
}
</script>
