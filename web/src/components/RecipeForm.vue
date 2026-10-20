<script setup lang="ts">
import { nextTick, ref } from "vue";
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
const source = ref("");
const busy = ref(false);
const error = ref("");

/** A stable identifier keeps each input attached to its row when others move. */
type RecipeRow = {
  id: string;
  text: string;
};

function createRow(): RecipeRow {
  return {
    id: crypto.randomUUID(),
    text: "",
  };
}

const ingredients = ref<RecipeRow[]>([createRow()]);
const instructions = ref<RecipeRow[]>([createRow()]);

/** Add a blank row and move keyboard focus to its input. */
async function addRow(rows: RecipeRow[]) {
  if (busy.value) return;

  const row = createRow();
  rows.push(row);

  // Wait until Vue has rendered the new input before focusing it.
  await nextTick();
  document.getElementById(row.id)?.focus();
}

/** Remove a row while keeping at least one input in each list. */
async function removeRow(rows: RecipeRow[], index: number) {
  if (busy.value || rows.length <= 1) return;

  rows.splice(index, 1);

  const nextRow = rows[Math.min(index, rows.length - 1)];

  await nextTick();

  if (nextRow) {
    document.getElementById(nextRow.id)?.focus();
  }
}

/** Save the original recipe in the selected collection. */
async function save() {
  if (busy.value) return;

  const ingredientList = ingredients.value.map((row) => row.text.trim());
  const instructionList = instructions.value.map((row) => row.text.trim());

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
    ingredientList.some((item) => item.length === 0) ||
    instructionList.some((item) => item.length === 0)
  ) {
    error.value = "Fill in each ingredient and step, or remove unused rows.";
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

      <section aria-labelledby="ingredients-heading">
        <h4 id="ingredients-heading">Ingredients</h4>

        <div
          v-for="(ingredient, index) in ingredients"
          :key="ingredient.id"
          class="recipe-row"
        >
          <label :for="ingredient.id">
            Ingredient {{ index + 1 }}
          </label>

          <input
            :id="ingredient.id"
            v-model="ingredient.text"
            dir="auto"
            placeholder="For example, 2 cups basmati rice"
            required
          />

          <button
            type="button"
            :disabled="ingredients.length === 1"
            :aria-label="`Remove ingredient ${index + 1}`"
            @click="removeRow(ingredients, index)"
          >
            Remove
          </button>
        </div>

        <button type="button" @click="addRow(ingredients)">
          Add ingredient
        </button>
      </section>

      <section aria-labelledby="instructions-heading">
        <h4 id="instructions-heading">Instructions</h4>

        <div
          v-for="(instruction, index) in instructions"
          :key="instruction.id"
          class="recipe-row"
        >
          <label :for="instruction.id">
            Step {{ index + 1 }}
          </label>

          <textarea
            :id="instruction.id"
            v-model="instruction.text"
            rows="3"
            dir="auto"
            required
          ></textarea>

          <button
            type="button"
            :disabled="instructions.length === 1"
            :aria-label="`Remove step ${index + 1}`"
            @click="removeRow(instructions, index)"
          >
            Remove
          </button>
        </div>

        <button type="button" @click="addRow(instructions)">
          Add step
        </button>
      </section>

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

<style scoped>
.recipe-row {
  display: grid;
  gap: 0.4rem;
  margin-bottom: 1rem;
}

.recipe-row button {
  justify-self: start;
}
</style>
