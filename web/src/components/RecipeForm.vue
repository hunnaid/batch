<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import { editableRecipeSections, serializeRecipeSections } from "../recipe-sections";
import RecipeSectionsEditor from "./RecipeSectionsEditor.vue";

type RecipeDetails = NonNullable<BatchWireHttp["/recipes/get"]["output"]["recipe"]>;

const props = defineProps<{
  collection?: string;
  recipe?: string;
  initial?: Pick<RecipeDetails, "title" | "ingredients" | "instructions" | "source" | "notes" | "description">;
}>();

const emit = defineEmits<{
  saved: [recipe: string];
  cancel: [];
  sessionExpired: [];
}>();

const title = ref(props.initial?.title ?? "");
const source = ref(props.initial?.source ?? "");
const notes = ref(props.initial?.notes ?? "");
const description = ref(props.initial?.description ?? "");
const busy = ref(false);
const error = ref("");

const ingredients = ref(editableRecipeSections(props.initial?.ingredients));
const instructions = ref(editableRecipeSections(props.initial?.instructions));

/** Save a new recipe or replace the original details of an owned recipe. */
async function save() {
  if (busy.value) return;

  const ingredientList = serializeRecipeSections(ingredients.value);
  const instructionList = serializeRecipeSections(instructions.value);

  if (!title.value.trim()) {
    error.value = "Enter a recipe title.";
    return;
  }

  if (
    ingredientList.length === 0 ||
    instructionList.length === 0
  ) {
    error.value = "Add at least one ingredient and one instruction.";
    return;
  }

  if (
    [ingredientList, instructionList].some((sections) => sections.some((section) =>
      section.items.length === 0 || section.items.some((item) => !item)))
  ) {
    error.value = "Each section needs at least one item. Fill in each ingredient and step, or remove unused rows and sections.";
    return;
  }

  busy.value = true;
  error.value = "";


  try {
    const input = {
      title: title.value.trim(),
      ingredients: ingredientList,
      instructions: instructionList,
      source: source.value.trim(),
      notes: notes.value,
      description: description.value,
    };

    const response = props.recipe !== undefined
      ? await api["/recipes/edit"]({ ...input, recipe: props.recipe })
      : props.collection !== undefined
      ? await api.recipes.save({
          ...input,
          collection: props.collection,
        })
      : await api["/recipes/save-personal"](input);

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
        FORBIDDEN: props.recipe !== undefined
          ? "Only the recipe owner can edit its original details."
          : "You do not have permission to save the recipe here.",
        NOT_FOUND: props.recipe !== undefined
          ? "This recipe no longer exists. Cancel to return to the recipe page."
          : "The selected destination is no longer available.",
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
    <h3>{{ props.recipe !== undefined ? "Edit recipe" : "Add recipe" }}</h3>
    <p v-if="props.recipe !== undefined">
      Changes apply everywhere this recipe is shared. Existing cooking entries stay unchanged.
    </p>
    <p v-else-if="props.collection === undefined">
      Save to My recipes. You can organize it into a collection later.
    </p>

    <fieldset :disabled="busy">
      <label for="recipe-title">Title</label>
      <input
        id="recipe-title"
        v-model="title"
        dir="auto"
        required
      />

      <label for="recipe-description">Description (optional)</label>
      <textarea
        id="recipe-description"
        v-model="description"
        rows="3"
        dir="auto"
        placeholder="Introduce the dish or share what makes it special"
      />

      <RecipeSectionsEditor v-model="ingredients" kind="ingredient" :disabled="busy" />
      <RecipeSectionsEditor v-model="instructions" kind="instruction" :disabled="busy" />

      <label for="recipe-source">Source (optional)</label>
      <input
        id="recipe-source"
        v-model="source"
        dir="auto"
        placeholder="Website URL, cookbook, or Mom through iMessage"
      />

      <label for="recipe-notes">Notes (optional)</label>
      <textarea
        id="recipe-notes"
        v-model="notes"
        rows="4"
        dir="auto"
        placeholder="Extra tips, substitutions, or reminders for this recipe"
      />

      <button type="submit" class="save-recipe">
        {{ busy ? "Saving…" : props.recipe !== undefined ? "Save changes" : "Save recipe" }}
      </button>

      <button type="button" @click="emit('cancel')">
        Cancel
      </button>
    </fieldset>

    <p v-if="error" role="alert">{{ error }}</p>
  </form>
</template>

<style scoped>
.save-recipe {
  color: var(--on-green);
  background: var(--green);
  border-color: var(--green);
}
.save-recipe:hover:not(:disabled) {
  color: var(--green-ink);
  background: var(--green-soft);
  border-color: var(--green);
}
</style>
