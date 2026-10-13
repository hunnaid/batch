<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";

const props = defineProps<{
  collection: string;
}>();

const emit = defineEmits<{
  saved: [recipe: string];
  cancel: [];
  sessionExpired: [];
}>();

const title = ref("");
const ingredients = ref("");
const instructions = ref("");
const source = ref("");
const busy = ref(false);
const error = ref("");

/** Convert one item per line into an ordered list, ignoring empty lines. */
function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Save the original recipe in the selected collection. */
async function save() {
  if (busy.value) return;

  const ingredientList = lines(ingredients.value);
  const instructionList = lines(instructions.value);

  if (
    !title.value.trim() ||
    ingredientList.length === 0 ||
    instructionList.length === 0
  ) {
    error.value = "Enter a title, at least one ingredient, and one instruction.";
    return;
  }

  busy.value = true;
  error.value = "";

  try {
    const response = await api.recipes.save({
      collection: props.collection,
      title: title.value.trim(),
      ingredients: ingredientList,
      instructions: instructionList,
      source: source.value.trim(),
    });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    emit("saved", response.recipe);
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.code === "UNAUTHORIZED") {
        emit("sessionExpired");
        return;
      }

      const messages: Record<string, string> = {
        INVALID_REQUEST: "Check that the recipe has a title and complete lists.",
        INVALID_INPUT: "Check the recipe fields.",
        FORBIDDEN: "You no longer have access to this collection.",
        NOT_FOUND: "This collection is no longer available.",
      };

      error.value =
        messages[cause.code] ?? "Could not save the recipe. Please try again.";
    } else {
      error.value = "Could not save the recipe. Please try again.";
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <h3>Add recipe</h3>

    <fieldset :disabled="busy">
      <label for="recipe-title">Title</label>
      <input
        id="recipe-title"
        v-model="title"
        dir="auto"
        required
      />

      <label for="recipe-ingredients">Ingredients — one per line</label>
      <textarea
        id="recipe-ingredients"
        v-model="ingredients"
        rows="6"
        dir="auto"
        required
      ></textarea>

      <label for="recipe-instructions">Instructions — one step per line</label>
      <textarea
        id="recipe-instructions"
        v-model="instructions"
        rows="8"
        dir="auto"
        required
      ></textarea>

      <label for="recipe-source">Source (optional)</label>
      <input
        id="recipe-source"
        v-model="source"
        dir="auto"
        placeholder="Website URL, cookbook, or Mom through iMessage"
      />

      <button type="submit">
        {{ busy ? "Saving…" : "Save recipe" }}
      </button>

      <button type="button" @click="emit('cancel')">
        Cancel
      </button>
    </fieldset>

    <p v-if="error" role="alert">{{ error }}</p>
  </form>
</template>
