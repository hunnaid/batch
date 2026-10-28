<script setup lang="ts">
defineProps<{ includeExisting?: boolean }>();
const emit = defineEmits<{ existing: []; manual: []; website: [] }>();
</script>

<template>
  <div class="recipe-options">
    <button v-if="includeExisting" type="button" @click="emit('existing')">
      <strong>Add existing recipe</strong>
      <span>Choose from My recipes and your accessible collections.</span>
    </button>
    <button type="button" @click="emit('manual')">
      <strong>Create new recipe</strong>
      <span>Enter a recipe's ingredients, instructions, and notes yourself.</span>
    </button>
    <button type="button" @click="emit('website')">
      <strong>Import from a website</strong>
      <span>Start with a recipe URL, then review and edit before saving.</span>
    </button>
  </div>
</template>

<style scoped>
.recipe-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 16px; margin-block: 24px; }
.recipe-options button { display: grid; align-content: start; gap: 8px; padding: 24px; text-align: start; }
.recipe-options strong { font-size: 1.1rem; }
.recipe-options span { font-weight: 400; }
</style>
