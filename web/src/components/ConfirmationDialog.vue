<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from "vue";

defineProps<{
  title: string;
  description: string;
  warning?: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const dialog = ref<HTMLDialogElement | null>(null);
const id = useId();

onMounted(() => dialog.value?.showModal());
onBeforeUnmount(() => dialog.value?.close());
</script>

<template>
  <dialog
    ref="dialog"
    :aria-labelledby="`${id}-title`"
    :aria-describedby="`${id}-description${warning ? ` ${id}-warning` : ''}`"
    :aria-busy="busy"
    @cancel.prevent="!busy && emit('cancel')"
  >
    <h2 :id="`${id}-title`">{{ title }}</h2>
    <p :id="`${id}-description`">{{ description }}</p>
    <p v-if="warning" :id="`${id}-warning`"><strong>{{ warning }}</strong></p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="busy" role="status">{{ busyLabel }}</p>
    <div class="dialog-actions">
      <button type="button" autofocus :disabled="busy" @click="emit('cancel')">
        Cancel
      </button>
      <button type="button" class="confirm-delete" :disabled="busy" @click="emit('confirm')">
        {{ busy ? busyLabel : confirmLabel }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
dialog {
  width: min(520px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  margin: auto;
  padding: 28px;
  overflow-y: auto;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgb(41 47 41 / 20%);
}
dialog::backdrop { background: rgb(41 47 41 / 45%); }
h2 { margin-bottom: 16px; font-size: 1.7rem; }
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
}
.confirm-delete {
  color: var(--page);
  background: var(--error);
  border-color: var(--error);
}
.confirm-delete:hover:not(:disabled) {
  color: var(--error);
  background: var(--error-soft);
  border-color: var(--error);
}
@media (max-width: 480px) {
  dialog { padding: 24px 20px; }
  .dialog-actions > button { flex: 1; }
}
</style>
