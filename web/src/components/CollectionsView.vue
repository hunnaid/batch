<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import RecipeForm from "./RecipeForm.vue";
import SharingForm from "./SharingForm.vue";
import RoleBadge from "./RoleBadge.vue";
import RefreshButton from "./RefreshButton.vue";

/** Derive screen data directly from the generated API contract. */
type CollectionSummary =
  BatchWireHttp["/collections/list"]["output"]["overview"]["collections"][number];

const props = defineProps<{
  user: string;
}>();

const emit = defineEmits<{
  sessionExpired: [];
  openRecipe: [collection: string, recipe: string];
}>();

const collections = ref<CollectionSummary[]>([]);
/** Memberships are shown in Shared; this tab lists only owned collections. */
const ownedCollections = computed(() =>
  collections.value.filter((collection) => collection.owner === props.user)
);
const name = ref("");
const loading = ref(false);
const creating = ref(false);
const addingCollection = ref(false);
const collectionNameInput = ref<HTMLInputElement | null>(null);
const createCollectionButton = ref<HTMLButtonElement | null>(null);
const error = ref("");

const search = ref("");

/** Match collection names or recipe titles without changing the loaded data. */
const matchingCollectionIds = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();

  return new Set(
    ownedCollections.value
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

async function beginCreateCollection() {
  addingCollection.value = true;
  error.value = "";
  await nextTick();
  collectionNameInput.value?.focus();
}

async function cancelCreateCollection() {
  if (creating.value) return;
  addingCollection.value = false;
  name.value = "";
  error.value = "";
  await nextTick();
  createCollectionButton.value?.focus();
}

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
    addingCollection.value = false;
    search.value = "";
    await loadCollections();
  } catch (cause) {
    reportError(cause);
  } finally {
    creating.value = false;
    if (!addingCollection.value) {
      await nextTick();
      createCollectionButton.value?.focus();
    }
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
    "Recipes and cooking entries are kept. Personally saved recipes remain " +
    "in My recipes; other collections and direct shares are unchanged."
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
  <section aria-labelledby="collections-heading">
    <div class="collections-heading">
      <h2 id="collections-heading">Collections</h2>
      <button
        v-if="!addingCollection"
        ref="createCollectionButton"
        type="button"
        class="create-collection-button"
        :disabled="loading || creating || managing"
        @click="beginCreateCollection"
      >
        <span aria-hidden="true">+</span>
        Create collection
      </button>
    </div>

    <form v-if="addingCollection" class="create-collection" @submit.prevent="createCollection">
      <fieldset :disabled="creating || loading || managing">
        <label for="collection-name">Collection name</label>
        <input
          id="collection-name"
          ref="collectionNameInput"
          v-model="name"
          placeholder="For example, Family Recipes"
          required
        />
        <div class="create-controls">
          <button type="submit">
            {{ creating ? "Creating…" : "Create collection" }}
          </button>
          <button type="button" @click="cancelCreateCollection">Cancel</button>
        </div>
      </fieldset>
    </form>

    <div v-else class="collections-toolbar">
      <div class="search-field">
        <label for="collection-search">Search collections and recipes</label>

        <div class="search-controls">
          <input
            id="collection-search"
            v-model="search"
            type="search"
            dir="auto"
            placeholder="Search by collection or recipe title"
            aria-describedby="collection-search-help"
          />

          <button v-if="search" type="button" @click="search = ''">
            Clear search
          </button>
        </div>
      </div>

      <p id="collection-search-help">
        Matching collections show all their recipes.
      </p>

      <RefreshButton
        class="refresh-collections"
        :disabled="loading || creating || managing"
        @click="loadCollections"
      >
        Refresh collections
      </RefreshButton>

    </div>

    <p v-if="error" role="alert">{{ error }}</p>

    <p v-if="loading" role="status">Loading collections…</p>

    <template v-else>
      <p v-if="!error && ownedCollections.length === 0">
        No collections yet. Choose Create collection to start saving recipes.
      </p>

      <p
        v-if="
          !error &&
          ownedCollections.length > 0 &&
          matchingCollectionIds.size === 0
        "
        role="status"
      >
        No collections or recipe titles match “{{ search.trim() }}”.
      </p>

      <article
        v-for="collection in ownedCollections"
        :key="collection.collection"
        v-show="matchingCollectionIds.has(collection.collection)"
        class="collection-card"
      >
        <header class="collection-header">
          <div class="collection-info">
            <div class="collection-title">
              <h3 dir="auto">{{ collection.name }}</h3>
              <RoleBadge :owner="collection.owner === user" />
            </div>
          </div>

          <button
            v-if="addingTo === null"
            type="button"
            class="add-recipe"
            @click="addingTo = collection.collection"
          >
            <span aria-hidden="true">+</span>
            Add recipe
          </button>
        </header>

        <details>
          <summary>View recipes ({{ collection.recipes.length }})</summary>
          <ul v-if="collection.recipes.length" class="collection-recipes">
            <li
              v-for="recipe in collection.recipes"
              :key="recipe.recipe"
            >
              <button
                type="button"
                @click="emit('openRecipe', collection.collection, recipe.recipe)"
              >
                <span dir="auto">{{ recipe.title }}</span>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          </ul>

          <p v-else class="empty-collection">No recipes yet. Add a recipe to start this collection.</p>
        </details>

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

        <div v-if="collection.owner === user" class="collection-actions">
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
            class="rename-form"
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

              <div class="rename-actions">
                <button type="submit">
                  {{ managing ? "Saving…" : "Save name" }}
                </button>

                <button type="button" @click="renaming = null">
                  Cancel
                </button>
              </div>
            </fieldset>
          </form>

          <button
            type="button"
            class="delete-collection"
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

<style scoped>
.collections-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
}
.collections-heading h2 { margin: 0; }
.create-collection-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: white;
  background: var(--green);
  border-color: var(--green);
}
.create-collection-button:hover:not(:disabled) {
  background: var(--green-hover);
  border-color: var(--green-hover);
}
.collections-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: end;
  gap: 12px 24px;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border);
}
.search-field { display: grid; gap: 8px; min-width: 0; }
.search-field label, .create-collection label { margin: 0; }
.search-controls, .create-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
.search-controls input { flex: 1; min-width: 0; }
.search-controls button, .create-controls button { flex-shrink: 0; }
.create-controls button, .add-recipe {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.refresh-collections { justify-self: end; margin-top: 8px; }
#collection-search-help {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
}
.create-collection {
  margin: 0 0 28px;
}
.create-collection fieldset { margin: 0; gap: 12px; }
.create-collection-button > span, .add-recipe > span { font-size: 1.25rem; line-height: 1; }
.collection-header, .collection-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.collection-header { justify-content: space-between; margin-bottom: 20px; }
.collection-info { flex: 1; min-width: 0; }
.collection-title h3 { margin: 0; }
.collection-recipes { display: grid; gap: 8px; margin: 16px 0 0; padding: 0; list-style: none; }
.collection-recipes li { margin: 0; padding: 0; }
.collection-recipes button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  text-align: start;
  background: var(--page);
  border-color: transparent;
}
.collection-recipes button:hover:not(:disabled) { background: var(--green-soft); border-color: var(--green); }
.collection-recipes button > span { min-width: 0; }
.collection-recipes svg { width: 18px; height: 18px; flex-shrink: 0; }
.empty-collection { color: var(--muted); }
.collection-actions, .rename-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.rename-form { flex: 1 0 100%; min-width: 0; margin: 0; }
.rename-form fieldset { margin-bottom: 0; }
.delete-collection { margin-inline-start: auto; color: var(--error); border-color: var(--error); }
.delete-collection:hover:not(:disabled) { background: var(--error-soft); border-color: var(--error); }
@media (max-width: 600px) {
  .collections-toolbar { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .refresh-collections { grid-row: 3; justify-self: start; }
  .search-controls, .create-controls { flex-wrap: wrap; }
  .search-controls input { flex-basis: 100%; }
  .collection-info { flex-basis: 100%; }
  .delete-collection { margin-inline-start: 0; }
}
</style>
