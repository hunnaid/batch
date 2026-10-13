<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import RecipeForm from "./RecipeForm.vue";
import SharingForm from "./SharingForm.vue";

/** Derive screen data directly from the generated API contract. */
type CollectionSummary =
  BatchWireHttp["/collections/list"]["output"]["overview"]["collections"][number];

defineProps<{
  user: string;
}>();

const emit = defineEmits<{
  sessionExpired: [];
  openRecipe: [collection: string, recipe: string];
}>();

const collections = ref<CollectionSummary[]>([]);
const name = ref("");
const loading = ref(false);
const creating = ref(false);
const error = ref("");

/** Report failures, returning to login when the session has expired. */
function reportError(cause: unknown) {
  if (cause instanceof ApiError) {
    if (cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }

    if (
      cause.code === "INVALID_REQUEST" ||
      cause.code === "INVALID_INPUT"
    ) {
      error.value = "Enter a nonblank collection name.";
      return;
    }
  }

  error.value = "The request failed. Please try again.";
}

/** Load both owned collections and collections shared with this user. */
async function loadCollections() {
  loading.value = true;
  error.value = "";

  try {
    const response = await api.collections.list({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    collections.value = response.overview.collections;
  } catch (cause) {
    reportError(cause);
  } finally {
    loading.value = false;
  }
}

/** Save a collection, then refresh the list without reloading the page. */
async function createCollection() {
  if (creating.value) return;

  if (!name.value.trim()) {
    error.value = "Enter a collection name.";
    return;
  }

  creating.value = true;
  error.value = "";

  try {
    const response = await api.collections.create({
      name: name.value,
    });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    name.value = "";
    await loadCollections();
  } catch (cause) {
    reportError(cause);
  } finally {
    creating.value = false;
  }
}

/** Only one collection's recipe form is open at a time. */
const addingTo = ref<string | null>(null);

/** Open the saved recipe; returning to collections will reload the list. */
function recipeSaved(collection: string, recipe: string) {
  addingTo.value = null;
  emit("openRecipe", collection, recipe);
}

onMounted(loadCollections);
</script>

<template>
  <section>
    <h2>Collections</h2>

    <form @submit.prevent="createCollection">
      <fieldset :disabled="creating || loading">
        <label for="collection-name">New collection name</label>
        <input
          id="collection-name"
          v-model="name"
          placeholder="Family Recipes"
          required
        />

        <button type="submit">
          {{ creating ? "Creating…" : "Create collection" }}
        </button>
      </fieldset>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>

    <button
      type="button"
      :disabled="loading || creating"
      @click="loadCollections"
    >
      Refresh collections
    </button>

    <p v-if="loading" role="status">Loading collections…</p>

    <template v-else>
      <p v-if="!error && collections.length === 0">
        No collections yet. Create one to start saving recipes.
      </p>

      <article
        v-for="collection in collections"
        :key="collection.collection"
      >
        <h3>{{ collection.name }}</h3>
        <p>
          {{
            collection.owner === user
              ? "Your collection"
              : "Shared with you"
          }}
        </p>

        <ul v-if="collection.recipes.length">
          <li
            v-for="recipe in collection.recipes"
            :key="recipe.recipe"
          >
            <button
              type="button"
              @click="emit('openRecipe', collection.collection, recipe.recipe)"
            >
              {{ recipe.title }}
            </button>
          </li>
        </ul>

        <p v-else>No recipes yet.</p>

        <button
          v-if="addingTo === null"
          type="button"
          @click="addingTo = collection.collection"
        >
          Add recipe
        </button>

        <RecipeForm
          v-if="addingTo === collection.collection"
          :key="collection.collection"
          :collection="collection.collection"
          @saved="recipeSaved(collection.collection, $event)"
          @cancel="addingTo = null"
          @session-expired="emit('sessionExpired')"
        />

        <details v-if="collection.owner === user">
          <summary>Manage sharing</summary>

          <SharingForm
            :collection="collection.collection"
            @session-expired="emit('sessionExpired')"
          />
        </details>
      </article>
    </template>
  </section>
</template>
