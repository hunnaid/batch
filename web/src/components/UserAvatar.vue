<script setup lang="ts">
import { computed, ref, watch } from "vue";
const props = defineProps<{ name: string; picture?: string | null; large?: boolean; defaultIcon?: boolean }>();
const failed = ref(false);
watch(() => props.picture, () => { failed.value = false; });
const initials = computed(() => props.name.trim().split(/\s+/).slice(0, 2)
  .map((part) => Array.from(part)[0] ?? "").join("").toLocaleUpperCase() || "?");
</script>

<template>
  <span class="avatar" :class="{ large }" aria-hidden="true">
    <img v-if="picture && !failed" :src="picture" alt="" @error="failed = true" />
    <svg v-else-if="defaultIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </svg>
    <span v-else>{{ initials }}</span>
  </span>
</template>

<style scoped>
.avatar { display: inline-flex; flex: 0 0 auto; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; background: var(--green-soft); color: var(--green-ink); font-weight: 650; vertical-align: middle; }
.avatar.large { width: 112px; height: 112px; font-size: 2rem; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar svg { width: 60%; height: 60%; }
</style>
