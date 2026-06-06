<template>
  <div ref="containerRef" class="monaco-host" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: () => Worker;
    };
  }
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language?: string;
    readOnly?: boolean;
  }>(),
  {
    language: 'markdown',
    readOnly: false
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const containerRef = ref<HTMLElement>();
let editor: monaco.editor.IStandaloneCodeEditor | undefined;

window.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  }
};

onMounted(() => {
  if (!containerRef.value) {
    return;
  }

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue,
    language: props.language,
    readOnly: props.readOnly,
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 16, bottom: 16 },
    renderLineHighlight: 'line',
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    }
  });

  editor.onDidChangeModelContent(() => {
    const value = editor?.getValue() ?? '';
    if (value !== props.modelValue) {
      emit('update:modelValue', value);
    }
  });
});

watch(
  () => props.modelValue,
  (value) => {
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  }
);

watch(
  () => props.readOnly,
  (value) => {
    editor?.updateOptions({ readOnly: value });
  }
);

onBeforeUnmount(() => {
  editor?.dispose();
});
</script>
