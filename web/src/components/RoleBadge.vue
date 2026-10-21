<script setup lang="ts">
defineProps<{ owner: boolean }>();
</script>

<template>
  <span class="role-badge">
    <span aria-hidden="true">{{ owner ? "♛" : "👤" }}</span>
    {{ owner ? "Owner" : "Member" }}
  </span>
</template>

<style scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: var(--surface);
  color: var(--green-ink);
  font-family: system-ui, sans-serif;
  font-size: 0.8rem;
  font-weight: 650;
  line-height: 1.5;
  white-space: nowrap;
}
</style>
