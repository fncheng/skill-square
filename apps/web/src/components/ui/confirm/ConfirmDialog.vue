<template>
  <Teleport to="body">
    <div v-if="confirmState.open" class="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 px-4">
      <section class="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl">
        <div class="grid gap-2">
          <h2 class="text-lg font-semibold">{{ confirmState.title }}</h2>
          <p v-if="confirmState.description" class="text-sm leading-6 text-muted-foreground">
            {{ confirmState.description }}
          </p>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" @click="closeConfirm(false)">{{ confirmState.cancelText }}</Button>
          <Button :variant="confirmState.destructive ? 'destructive' : 'default'" @click="closeConfirm(true)">
            {{ confirmState.confirmText }}
          </Button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/composables/use-confirm';

const { confirmState, closeConfirm } = useConfirm();
</script>
