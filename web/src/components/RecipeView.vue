<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import CookingEntryForm from "./CookingEntryForm.vue";

type RecipeDetails = NonNullable<
  BatchWireHttp["/recipes/get"]["output"]["recipe"]
>;

type CookingEntry = RecipeDetails["entries"][number];

const props = defineProps<{
  collection: string;
  recipe: string;
  user: string;
}>();

const emit = defineEmits<{
  back: [];
  sessionExpired: [];
}>();

const details = ref<RecipeDetails | null>(null);
const loading = ref(true);
const error = ref("");

/** Retrieve the original recipe and its cooking entries together. */
async function loadRecipe() {
  loading.value = true;
  error.value = "";
  details.value = null;

  try {
    const response = await api.recipes.get({
      collection: props.collection,
      recipe: props.recipe,
    });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    details.value = response.recipe;
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }

    error.value =
      cause instanceof ApiError && cause.code === "FORBIDDEN"
        ? "You no longer have access to this collection."
        : "Could not load the recipe. Please try again.";
  } finally {
    loading.value = false;
  }
}

/** API dates arrive as strings; display them in the user's local time. */
function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

const showEntryForm = ref(false);
const editingEntry = ref<CookingEntry | null>(null);

/** Open an empty form for a separate cooking attempt. */
function addEntry() {
  editingEntry.value = null;
  showEntryForm.value = true;
}

/** Populate the form with an existing attempt. */
function editEntry(entry: CookingEntry) {
  editingEntry.value = entry;
  showEntryForm.value = true;
}

function closeEntryForm() {
  showEntryForm.value = false;
  editingEntry.value = null;
}

/** Reload saved history without refreshing the browser page. */
async function entrySaved() {
  closeEntryForm();
  await loadRecipe();
}

onMounted(loadRecipe);
</script>

<template>
  <section>
    <button type="button" @click="emit('back')">
      Back to collections
    </button>

    <p v-if="loading" role="status">Loading recipe…</p>

    <div v-else-if="error">
      <p role="alert">{{ error }}</p>
      <button type="button" @click="loadRecipe">Try again</button>
    </div>

    <p v-else-if="!details">
      This recipe is not available in this collection.
    </p>

    <template v-else>
      <h2 dir="auto">{{ details.title }}</h2>
      <p v-if="details.source" dir="auto">
        Source: {{ details.source }}
      </p>

      <h3>Ingredients</h3>
      <ul>
        <li
          v-for="(ingredient, index) in details.ingredients"
          :key="index"
          dir="auto"
        >
          {{ ingredient }}
        </li>
      </ul>

      <h3>Instructions</h3>
      <ol>
        <li
          v-for="(instruction, index) in details.instructions"
          :key="index"
          dir="auto"
        >
          {{ instruction }}
        </li>
      </ol>

      <h3>Cooking history</h3>

      <button
        v-if="!showEntryForm"
        type="button"
        @click="addEntry"
      >
        Add cooking entry
      </button>

      <CookingEntryForm
        v-if="showEntryForm"
        :key="editingEntry?.entry ?? 'new'"
        :collection="props.collection"
        :recipe="props.recipe"
        :entry="editingEntry?.entry"
        :initial-changes="editingEntry?.changes"
        :initial-result="editingEntry?.result"
        @saved="entrySaved"
        @cancel="closeEntryForm"
        @session-expired="emit('sessionExpired')"
      />

      <p v-if="details.entries.length === 0">
        No cooking entries yet.
      </p>

      <article
        v-for="entry in details.entries"
        :key="entry.entry"
      >
        <h4>
          {{ entry.author === user ? "Your attempt" : "Shared attempt" }}
        </h4>

        <time :datetime="entry.createdAt">
          {{ formatDate(entry.createdAt) }}
        </time>

        <p v-if="entry.changes" class="recipe-text" dir="auto">
          <strong>Changes:</strong> {{ entry.changes }}
        </p>

        <p v-if="entry.result" class="recipe-text" dir="auto">
          <strong>Result:</strong> {{ entry.result }}
          <button
            v-if="entry.author === user && !showEntryForm"
            type="button"
            @click="editEntry(entry)"
          >
            Edit this entry
          </button>
        </p>
        <p v-else>No result recorded yet.</p>
      </article>
    </template>
  </section>
</template>
