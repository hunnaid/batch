<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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

const search = ref("");

/** Match collection names or recipe titles without changing the loaded data. */
const matchingCollectionIds = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();

  return new Set(
    collections.value
      .filter((collection) =>
        collection.name.toLocaleLowerCase().includes(query) ||
        collection.recipes.some((recipe) =>
          recipe.title.toLocaleLowerCase().includes(query)
        )
      )
      .map((collection) => collection.collection)
  );
});

/** Prevent overlapping rename/delete requests. */
const managing = ref(false);

/** Track the collection being renamed and its proposed name. */
const renaming = ref<string | null>(null);
const replacementName = ref("");

/** Show the rename form with the current name already filled in. */
function beginRename(collection: CollectionSummary) {
  renaming.value = collection.collection;
  replacementName.value = collection.name;
  error.value = "";
}

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

    if (cause.code === "FORBIDDEN") {
      error.value = "Only the collection owner can perform this action.";
      return;
    }

    if (cause.code === "NOT_FOUND") {
      error.value = "This collection no longer exists. Refresh the list.";
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

/** Rename a collection without changing its recipes or members. */
async function renameCollection(collection: CollectionSummary) {
  if (managing.value) return;

  const newName = replacementName.value.trim();

  if (!newName) {
    error.value = "Enter a nonblank collection name.";
    return;
  }

  managing.value = true;
  error.value = "";

  try {
    const response = await api.collections.rename({
      collection: collection.collection,
      name: newName,
    });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    renaming.value = null;
    await loadCollections();
  } catch (cause) {
    reportError(cause);
  } finally {
    managing.value = false;
  }
}

/** Delete a collection after the owner confirms the scope of deletion. */
async function deleteCollection(collection: CollectionSummary) {
  if (managing.value) return;

  const confirmed = window.confirm(
    `Delete "${collection.name}" and remove everyone's access to this collection?\n\n` +
    "Recipes and cooking entries will remain stored. Recipes saved only " +
    "in this collection will no longer appear in the app."
  );

  if (!confirmed) return;

  managing.value = true;
  error.value = "";

  try {
    const response = await api.collections.delete({
      collection: collection.collection,
    });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    if (addingTo.value === collection.collection) {
      addingTo.value = null;
    }

    await loadCollections();
  } catch (cause) {
    reportError(cause);
  } finally {
    managing.value = false;
  }
}

onMounted(loadCollections);
</script>

<template>
  <section>
    <h2>Collections</h2>

    <div>
      <label for="collection-search">Search collections and recipes</label>

      <input
        id="collection-search"
        v-model="search"
        type="search"
        dir="auto"
        placeholder="For example, Family Recipes or biryani"
        aria-describedby="collection-search-help"
      />

      <button
        v-if="search"
        type="button"
        @click="search = ''"
      >
        Clear search
      </button>

      <p id="collection-search-help">
        Search by collection name or recipe title. Matching collections show
        all their recipes.
      </p>
    </div>

    <form @submit.prevent="createCollection">
      <fieldset :disabled="creating || loading || managing">
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
      :disabled="loading || creating || managing"
      @click="loadCollections"
    >
      Refresh collections
    </button>

    <p v-if="loading" role="status">Loading collections…</p>

    <template v-else>
      <p v-if="!error && collections.length === 0">
        No collections yet. Create one to start saving recipes.
      </p>

      <p
        v-if="
          !error &&
          collections.length > 0 &&
          matchingCollectionIds.size === 0
        "
        role="status"
      >
        No collections or recipe titles match “{{ search.trim() }}”.
      </p>

      <article
        v-for="collection in collections"
        :key="collection.collection"
        v-show="matchingCollectionIds.has(collection.collection)"
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

        <div v-if="collection.owner === user">
          <button
            v-if="renaming !== collection.collection"
            type="button"
            :disabled="managing || loading || creating || addingTo !== null"
            @click="beginRename(collection)"
          >
            Rename
          </button>

          <form
            v-if="renaming === collection.collection"
            @submit.prevent="renameCollection(collection)"
          >
            <fieldset :disabled="managing || creating">
              <label :for="`rename-${collection.collection}`">
                Collection name
              </label>

              <input
                :id="`rename-${collection.collection}`"
                v-model="replacementName"
                required
              />

              <button type="submit">
                {{ managing ? "Saving…" : "Save name" }}
              </button>

              <button type="button" @click="renaming = null">
                Cancel
              </button>
            </fieldset>
          </form>

          <button
            type="button"
            :disabled="
              managing || loading || creating ||
              addingTo !== null || renaming !== null
            "
            @click="deleteCollection(collection)"
          >
            Delete collection
          </button>
        </div>

      </article>
    </template>
  </section>
</template>
