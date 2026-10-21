<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <button type="button" class="return-button" :disabled="disabled">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
    <slot />
  </button>
</template>

<style scoped>
.return-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  margin-bottom: 16px;
  background: transparent;
  border: 0;
}
.return-button:hover:not(:disabled) {
  background: transparent;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.return-button svg { width: 18px; height: 18px; flex-shrink: 0; }
</style>
