<script setup lang="ts">
import { computed, ref, watch } from "vue";
const props = defineProps<{ name: string; picture?: string | null; large?: boolean }>();
const failed = ref(false);
watch(() => props.picture, () => { failed.value = false; });
const initials = computed(() => props.name.trim().split(/\s+/).slice(0, 2)
  .map((part) => Array.from(part)[0] ?? "").join("").toLocaleUpperCase() || "?");
</script>

<template>
  <span class="avatar" :class="{ large }" aria-hidden="true">
    <img v-if="picture && !failed" :src="picture" alt="" @error="failed = true" />
    <span v-else>{{ initials }}</span>
  </span>
</template>

<style scoped>
.avatar { display: inline-flex; flex: 0 0 auto; width: 44px; height: 44px; align-items: center; justify-content: center; border-radius: 50%; overflow: hidden; background: var(--green-soft); color: var(--green); font-weight: 650; vertical-align: middle; }
.avatar.large { width: 112px; height: 112px; font-size: 2rem; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
</style>
