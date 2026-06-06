<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">分类管理</h1>
        <p class="page-subtitle">维护 Prompt 的一级业务分类。</p>
      </div>
      <Button @click="openCreateDialog">
        <Plus class="h-4 w-4" />
        新建分类
      </Button>
    </div>

    <div class="manage-surface relative">
      <div v-if="loading" class="loading-panel">正在加载分类...</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>分类名称</th>
            <th>描述</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in categories" :key="category.id">
            <td class="font-semibold">{{ category.name }}</td>
            <td>{{ category.description || '暂无描述' }}</td>
            <td>{{ formatDateTime(category.createdAt) }}</td>
            <td>{{ formatDateTime(category.updatedAt) }}</td>
            <td>
              <div class="table-actions">
                <Button variant="outline" size="icon" title="编辑" @click="openEditDialog(category)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="删除" @click="handleDelete(category)">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading && categories.length === 0" class="empty-state">暂无分类</div>
    </div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="dialog-overlay">
        <section class="dialog-panel">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black">{{ editingId ? '编辑分类' : '新建分类' }}</h2>
              <p class="text-sm text-muted-foreground">分类用于快速筛选和组织 Prompt。</p>
            </div>
            <Button variant="ghost" size="icon" @click="dialogVisible = false">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <div class="form-grid">
            <label class="form-field">
              <span class="form-label">分类名称</span>
              <Input v-model="form.name" maxlength="80" />
            </label>
            <label class="form-field">
              <span class="form-label">描述</span>
              <Textarea v-model="form.description" maxlength="500" rows="4" />
            </label>
          </div>

          <div class="mt-6 flex justify-end gap-2">
            <Button variant="outline" @click="dialogVisible = false">取消</Button>
            <Button :disabled="saving" @click="handleSubmit">{{ saving ? '保存中...' : '保存' }}</Button>
          </div>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Pencil, Plus, Trash2, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
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
const { toast } = useToast();
const { confirm } = useConfirm();

const form = reactive<CategoryPayload>({
  name: '',
  description: ''
});

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
  if (!form.name.trim()) {
    toast({ title: '请输入分类名称', variant: 'destructive' });
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim()
    };

    if (editingId.value) {
      await updateCategory(editingId.value, payload);
    } else {
      await createCategory(payload);
    }
    toast({ title: '分类已保存', variant: 'success' });
    dialogVisible.value = false;
    await loadCategories();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(category: Category) {
  const confirmed = await confirm({
    title: '删除分类',
    description: `确认删除分类「${category.name}」？相关 Prompt 将变为未分类。`,
    confirmText: '删除',
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  await deleteCategory(category.id);
  toast({ title: '分类已删除', variant: 'success' });
  await loadCategories();
}
</script>
