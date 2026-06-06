<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">分类管理</h1>
        <p class="page-subtitle">维护 Prompt 的一级业务分类。</p>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreateDialog">新建分类</el-button>
    </div>

    <div class="manage-surface">
      <el-table v-loading="loading" :data="categories" row-key="id" stripe>
        <el-table-column prop="name" label="分类名称" min-width="180" />
        <el-table-column prop="description" label="描述" min-width="300" />
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新建分类'" width="520px">
      <el-form ref="formRef" label-position="top" :model="form" :rules="rules">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="500" show-word-limit />
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
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
  type CategoryPayload
} from '@/api/categories';
import type { Category } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

const categories = ref<Category[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<string>();
const formRef = ref<FormInstance>();

const form = reactive<CategoryPayload>({
  name: '',
  description: ''
});

const rules: FormRules<CategoryPayload> = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }]
};

onMounted(loadCategories);

async function loadCategories() {
  loading.value = true;
  try {
    categories.value = await getCategories();
  } finally {
    loading.value = false;
  }
}

function openCreateDialog() {
  editingId.value = undefined;
  form.name = '';
  form.description = '';
  dialogVisible.value = true;
}

function openEditDialog(category: Category) {
  editingId.value = category.id;
  form.name = category.name;
  form.description = category.description;
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
      await updateCategory(editingId.value, form);
    } else {
      await createCategory(form);
    }
    ElMessage.success('分类已保存');
    dialogVisible.value = false;
    await loadCategories();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(category: Category) {
  try {
    await ElMessageBox.confirm(`确认删除分类「${category.name}」？`, '删除分类', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    });
    await deleteCategory(category.id);
    ElMessage.success('分类已删除');
    await loadCategories();
  } catch {
    // 用户取消删除时无需提示。
  }
}
</script>
