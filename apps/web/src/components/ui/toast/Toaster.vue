<template>
  <div class="fixed right-5 top-5 z-[100] grid w-[360px] max-w-[calc(100vw-40px)] gap-3">
    <div
      v-for="item in toasts"
      :key="item.id"
      :class="
        cn(
          'rounded-md border bg-background p-4 text-sm shadow-lg',
          item.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
          item.variant === 'destructive' && 'border-red-200 bg-red-50 text-red-950'
        )
      "
    >
      <div class="flex items-start justify-between gap-3">
        <div class="grid gap-1">
          <p class="font-semibold">{{ item.title }}</p>
          <p v-if="item.description" class="text-muted-foreground">{{ item.description }}</p>
        </div>
        <button class="rounded-sm p-1 text-muted-foreground hover:bg-black/5" type="button" @click="dismiss(item.id)">
          <X class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { useToast } from '@/composables/use-toast';
import { cn } from '@/lib/utils';

const { toasts, dismiss } = useToast();
</script>
