<template>
  <div class="app-shell">
    <header class="app-topbar">
      <RouterLink class="brand" to="/prompts">
        <span class="brand-mark">
          <Boxes class="h-4 w-4" />
        </span>
        <span>Prompt Skill Manager</span>
      </RouterLink>

      <div class="topbar-actions">
        <Button variant="ghost" size="icon">
          <Search class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Bell class="h-4 w-4" />
        </Button>
        <span class="admin-badge">
          <CircleUserRound class="h-4 w-4" />
          Admin
        </span>
      </div>
    </header>

    <aside class="app-sidebar">
      <nav class="nav-section">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.key"
          :class="['nav-link', { active: isPrimaryActive(item) }]"
          :to="item.to"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="nav-title">管理</div>
      <nav class="nav-section">
        <RouterLink
          v-for="item in manageNav"
          :key="item.path"
          :class="['nav-link', { active: isManageActive(item.path) }]"
          :to="item.path"
        >
          <component :is="item.icon" class="h-4 w-4" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>

    <Toaster />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import {
  Bell,
  Boxes,
  CircleUserRound,
  Folder,
  House,
  Tags,
  Search,
  Star
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/confirm/ConfirmDialog.vue';
import Toaster from '@/components/ui/toast/Toaster.vue';

const route = useRoute();

const primaryNav = [
  { key: 'prompts', label: 'Prompt 列表', to: '/prompts', icon: House },
  { key: 'favorites', label: '我的收藏', to: { path: '/prompts', query: { favorite: 'true' } }, icon: Star }
];

const manageNav = [
  { label: '分类管理', path: '/categories', icon: Folder },
  { label: '标签管理', path: '/tags', icon: Tags }
];

const normalizedPath = computed(() => route.path);

function isPrimaryActive(item: (typeof primaryNav)[number]) {
  if (item.key === 'favorites') {
    return normalizedPath.value === '/prompts' && route.query.favorite === 'true';
  }

  if (item.key === 'prompts') {
    return normalizedPath.value.startsWith('/prompts') && route.query.favorite !== 'true';
  }

  return false;
}

function isManageActive(path: string) {
  return normalizedPath.value === path;
}
</script>
