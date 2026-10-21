<script setup lang="ts">
import { nextTick, ref } from "vue";
import { api, ApiError } from "../api";

const props = defineProps<{
  collection?: string;
}>();

const emit = defineEmits<{
  saved: [recipe: string];
  cancel: [];
  sessionExpired: [];
}>();

const title = ref("");
const source = ref("");
const notes = ref("");
const description = ref("");
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

/** Insert a blank row after this item and focus its input. */
async function addRow(rows: RecipeRow[], index: number) {
  if (busy.value) return;

  const row = createRow();
  rows.splice(index + 1, 0, row);

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

/** Save a recipe personally or in the supplied collection. */
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
    const input = {
      title: title.value.trim(),
      ingredients: ingredientList,
      instructions: instructionList,
      source: source.value.trim(),
      notes: notes.value,
      description: description.value,
    };

    const response = props.collection !== undefined
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
        FORBIDDEN: "You do not have permission to save the recipe here.",
        NOT_FOUND: "The selected destination is no longer available.",
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
    <p v-if="props.collection === undefined">
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

          <div class="row-actions">
            <button
              type="button"
              class="add-row"
              :aria-label="`Add below ingredient ${index + 1}`"
              title="Add ingredient below"
              @click="addRow(ingredients, index)"
            >
              Add below
            </button>
            <button
              type="button"
              class="remove-row"
              :disabled="ingredients.length === 1"
              :aria-label="`Remove ingredient ${index + 1}`"
              :title="`Remove ingredient ${index + 1}`"
              @click="removeRow(ingredients, index)"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
              </svg>
            </button>
          </div>
        </div>
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

          <div class="row-actions">
            <button
              type="button"
              class="add-row"
              :aria-label="`Add below step ${index + 1}`"
              title="Add step below"
              @click="addRow(instructions, index)"
            >
              Add below
            </button>
            <button
              type="button"
              class="remove-row"
              :disabled="instructions.length === 1"
              :aria-label="`Remove step ${index + 1}`"
              :title="`Remove step ${index + 1}`"
              @click="removeRow(instructions, index)"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" />
              </svg>
            </button>
          </div>
        </div>
      </section>

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
.recipe-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}

.recipe-row label { grid-column: 1; margin: 0; }
.recipe-row input, .recipe-row textarea { grid-column: 1; grid-row: 2; }
.row-actions {
  display: flex;
  align-items: center;
  grid-column: 2;
  grid-row: 2;
  gap: 8px;
}
.row-actions button { padding: 8px 12px; font-size: 0.9rem; }
.row-actions .remove-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 8px;
  color: var(--error);
  border-color: var(--error);
}
.row-actions .remove-row:hover:not(:disabled) {
  background: var(--error-soft);
  border-color: var(--error);
}
.remove-row svg { width: 18px; height: 18px; }
.add-row {
  color: var(--on-green);
  background: var(--green);
  border-color: var(--green);
}
.add-row:hover:not(:disabled) {
  color: var(--green-ink);
  background: var(--green-soft);
  border-color: var(--green);
}
@media (max-width: 480px) {
  .row-actions { flex-direction: column; align-items: stretch; }
}
</style>
