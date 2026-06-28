import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/prompts'
    },
    {
      path: '/prompts',
      name: 'prompts',
      component: () => import('@/views/PromptList.vue')
    },
    {
      path: '/prompts/new',
      name: 'prompt-create',
      component: () => import('@/views/PromptEditor.vue')
    },
    {
      path: '/prompts/:id',
      name: 'prompt-detail',
      component: () => import('@/views/PromptDetail.vue')
    },
    {
      path: '/prompts/:id/edit',
      name: 'prompt-edit',
      component: () => import('@/views/PromptEditor.vue')
    },
    {
      path: '/solutions',
      name: 'solutions',
      component: () => import('@/views/SolutionList.vue')
    },
    {
      path: '/solutions/new',
      name: 'solution-create',
      component: () => import('@/views/SolutionEditor.vue')
    },
    {
      path: '/solutions/:id',
      name: 'solution-detail',
      component: () => import('@/views/SolutionDetail.vue')
    },
    {
      path: '/solutions/:id/edit',
      name: 'solution-edit',
      component: () => import('@/views/SolutionEditor.vue')
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('@/views/CategoryManage.vue')
    },
    {
      path: '/tags',
      name: 'tags',
      component: () => import('@/views/TagManage.vue')
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});
