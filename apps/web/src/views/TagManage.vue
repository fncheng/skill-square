<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">标签管理</h1>
        <p class="page-subtitle">维护可复用的 Prompt 标签与颜色。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建标签</el-button>
    </div>

    <div class="manage-surface">
      <el-table v-loading="loading" :data="tags" row-key="id" stripe>
        <el-table-column label="标签名称" min-width="180">
          <template #default="{ row }">
            <span class="color-chip" :style="{ backgroundColor: row.color }" />
            <span>{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="color" label="颜色" width="140" />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="130" align="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-tooltip content="编辑">
                <el-button :icon="Edit" circle @click="openEditDialog(row)" />
              </el-tooltip>
              <el-tooltip content="删除">
                <el-button :icon="Delete" circle type="danger" plain @click="handleDelete(row)" />
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑标签' : '新建标签'" width="480px">
      <el-form ref="formRef" label-position="top" :model="form" :rules="rules">
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="form.name" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="颜色" prop="color">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-color-picker v-model="form.color" />
            <el-input v-model="form.color" maxlength="7" style="width: 160px" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { createTag, deleteTag, getTags, updateTag, type TagPayload } from '@/api/tags';
import type { Tag } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

const tags = ref<Tag[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<string>();
const formRef = ref<FormInstance>();

const form = reactive<TagPayload>({
  name: '',
  color: '#3b82f6'
});

const rules: FormRules<TagPayload> = {
  name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }],
  color: [
    { required: true, message: '请选择标签颜色', trigger: 'change' },
    { pattern: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, message: '请输入合法的 HEX 颜色', trigger: 'blur' }
  ]
};

onMounted(loadTags);

async function loadTags() {
  loading.value = true;
  try {
    tags.value = await getTags();
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingId.value = undefined;
  form.name = '';
  form.color = '#3b82f6';
  dialogVisible.value = true;
}

function openEditDialog(tag: Tag) {
  editingId.value = tag.id;
  form.name = tag.name;
  form.color = tag.color;
  dialogVisible.value = true;
}

async function handleSubmit() {
  const valid = await formRef.value?.validate();
  if (!valid) {
    return;
  }

  saving.value = true;
  try {
    if (editingId.value) {
      await updateTag(editingId.value, form);
    } else {
      await createTag(form);
    }
    ElMessage.success('标签已保存');
    dialogVisible.value = false;
    await loadTags();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(tag: Tag) {
  try {
    await ElMessageBox.confirm(`确认删除标签「${tag.name}」？`, '删除标签', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteTag(tag.id);
    ElMessage.success('标签已删除');
    await loadTags();
  } catch {
    // 用户取消删除时无需提示。
  }
}
</script>
