<template>
  <section>
    <div class="page-head">
      <div>
        <h1 class="page-title">标签管理</h1>
        <p class="page-subtitle">维护可复用的 Prompt 标签与颜色。</p>
      </div>
      <Button @click="openCreateDialog">
        <Plus class="h-4 w-4" />
        新建标签
      </Button>
    </div>

    <div class="manage-surface relative">
      <div v-if="loading" class="loading-panel">正在加载标签...</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>标签名称</th>
            <th>颜色</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in tags" :key="tag.id">
            <td class="font-semibold">
              <span class="color-chip mr-2" :style="{ backgroundColor: tag.color }" />
              {{ tag.name }}
            </td>
            <td>{{ tag.color }}</td>
            <td>{{ formatDateTime(tag.createdAt) }}</td>
            <td>{{ formatDateTime(tag.updatedAt) }}</td>
            <td>
              <div class="table-actions">
                <Button variant="outline" size="icon" title="编辑" @click="openEditDialog(tag)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" title="删除" @click="handleDelete(tag)">
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!loading && tags.length === 0" class="empty-state">暂无标签</div>
    </div>

    <Teleport to="body">
      <div v-if="dialogVisible" class="dialog-overlay">
        <section class="dialog-panel">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-black">{{ editingId ? '编辑标签' : '新建标签' }}</h2>
              <p class="text-sm text-muted-foreground">标签颜色会用于 Prompt 卡片和详情展示。</p>
            </div>
            <Button variant="ghost" size="icon" @click="dialogVisible = false">
              <X class="h-4 w-4" />
            </Button>
          </div>

          <div class="form-grid">
            <label class="form-field">
              <span class="form-label">标签名称</span>
              <Input v-model="form.name" maxlength="80" />
            </label>
            <label class="form-field">
              <span class="form-label">颜色</span>
              <div class="flex items-center gap-3">
                <input v-model="form.color" class="h-9 w-12 rounded-md border bg-background p-1" type="color" />
                <Input v-model="form.color" class="w-40" maxlength="7" />
              </div>
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
import { useConfirm } from '@/composables/use-confirm';
import { useToast } from '@/composables/use-toast';
import { createTag, deleteTag, getTags, updateTag, type TagPayload } from '@/api/tags';
import type { Tag } from '@/types/domain';
import { formatDateTime } from '@/utils/date';

const tags = ref<Tag[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const editingId = ref<string>();
const { toast } = useToast();
const { confirm } = useConfirm();

const form = reactive<TagPayload>({
  name: '',
  color: '#3b82f6'
});

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
  if (!form.name.trim()) {
    toast({ title: '请输入标签名称', variant: 'destructive' });
    return;
  }

  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(form.color)) {
    toast({ title: '请输入合法的 HEX 颜色', variant: 'destructive' });
    return;
  }

  saving.value = true;
  try {
    const payload = {
      name: form.name.trim(),
      color: form.color
    };

    if (editingId.value) {
      await updateTag(editingId.value, payload);
    } else {
      await createTag(payload);
    }
    toast({ title: '标签已保存', variant: 'success' });
    dialogVisible.value = false;
    await loadTags();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(tag: Tag) {
  const confirmed = await confirm({
    title: '删除标签',
    description: `确认删除标签「${tag.name}」？Prompt 与该标签的关联将被删除。`,
    confirmText: '删除',
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  await deleteTag(tag.id);
  toast({ title: '标签已删除', variant: 'success' });
  await loadTags();
}
</script>
