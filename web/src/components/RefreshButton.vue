<script setup lang="ts">
defineProps<{ disabled?: boolean }>();
</script>

<template>
  <button type="button" class="refresh-button" :disabled="disabled">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 6.5A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.5" />
    </svg>
    <slot />
  </button>
</template>

<style scoped>
.refresh-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.refresh-button svg { width: 18px; height: 18px; flex-shrink: 0; }
</style>
