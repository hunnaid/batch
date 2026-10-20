<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import CookingEntryForm from "./CookingEntryForm.vue";
import SharingForm from "./SharingForm.vue";
import RoleBadge from "./RoleBadge.vue";

type RecipeDetails = NonNullable<
  BatchWireHttp["/recipes/get"]["output"]["recipe"]
>;

type CookingEntry = RecipeDetails["entries"][number];

const props = defineProps<{
  collection?: string;
  directShared?: boolean;
  recipe: string;
  user: string;
  backLabel?: string;
}>();

const emit = defineEmits<{
  back: [];
  sessionExpired: [];
}>();

const details = ref<RecipeDetails | null>(null);
const loading = ref(true);
const error = ref("");
const canManageSharing = ref(false);

/** Retrieve the original recipe and its cooking entries together. */
async function loadRecipe() {
  loading.value = true;
  error.value = "";
  details.value = null;
  canManageSharing.value = false;

  try {
    const response = props.directShared
      ? await api["/recipes/get-shared"]({ recipe: props.recipe })
      : props.collection !== undefined
      ? await api.recipes.get({
          collection: props.collection,
          recipe: props.recipe,
        })
      : await api["/recipes/get-personal"]({
          recipe: props.recipe,
        });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    const sharing = await api["/recipes/sharing-status"]({ recipe: props.recipe });
    if ("error" in sharing) throw new ApiError(String(sharing.error));
    canManageSharing.value = sharing.canManage;
    details.value = response.recipe;
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }

    error.value =
      cause instanceof ApiError && cause.code === "FORBIDDEN"
        ? "You no longer have access to this recipe."
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

type CollectionSummary =
  BatchWireHttp["/collections/list"]["output"]["overview"]["collections"][number];

const destinations = ref<CollectionSummary[]>([]);
const destination = ref("");
const loadingDestinations = ref(true);
const destinationsFailed = ref(false);
const addingToCollection = ref(false);
const collectionError = ref("");
const collectionSuccess = ref("");

/** Find accessible collections that do not already contain this recipe. */
async function loadDestinations() {
  if (addingToCollection.value) return;

  loadingDestinations.value = true;
  destinationsFailed.value = false;
  collectionError.value = "";
  collectionSuccess.value = "";
  destinations.value = [];
  destination.value = "";

  try {
    const response = await api.collections.list({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    destinations.value = response.overview.collections.filter(
      (collection) =>
        collection.collection !== props.collection &&
        !collection.recipes.some(
          (recipe) => recipe.recipe === props.recipe
        )
    );
  } catch (cause) {
    destinationsFailed.value = true;

    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }

    collectionError.value =
      "Could not load collections. Please try refreshing them.";
  } finally {
    loadingDestinations.value = false;
  }
}

/** Add the same recipe identifier, preserving its shared cooking history. */
async function addToCollection() {
  if (
    addingToCollection.value ||
    loadingDestinations.value ||
    destinationsFailed.value
  ) {
    return;
  }

  collectionError.value = "";
  collectionSuccess.value = "";

  const selected = destinations.value.find(
    (collection) => collection.collection === destination.value
  );

  if (!selected) {
    collectionError.value = "Choose a collection.";
    return;
  }

  addingToCollection.value = true;

  try {
    // Use the access path through which this recipe was opened.
    const response = props.collection !== undefined
      ? await api["/recipes/add-to-collection"]({
          sourceCollection: props.collection,
          destinationCollection: selected.collection,
          recipe: props.recipe,
        })
      : await api["/recipes/add-personal-to-collection"]({
          destinationCollection: selected.collection,
          recipe: props.recipe,
        });

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    destinations.value = destinations.value.filter(
      (collection) => collection.collection !== selected.collection
    );
    destination.value = "";
    collectionSuccess.value = `Added to “${selected.name}”.`;
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.code === "UNAUTHORIZED") {
        emit("sessionExpired");
        return;
      }

      if (cause.code === "CONFLICT") {
        collectionError.value =
          "This collection already contains the recipe.";

        destinations.value = destinations.value.filter(
          (collection) => collection.collection !== selected.collection
        );
        destination.value = "";
        return;
      }

      if (cause.code === "FORBIDDEN") {
        collectionError.value =
          "You no longer have access to one of these collections.";
        return;
      }

      if (cause.code === "NOT_FOUND") {
        collectionError.value =
          "The collection or recipe could not be found. Refresh collections and reopen the recipe.";
        return;
      }
    }

    collectionError.value =
      "Could not confirm the addition. Refresh collections before trying again.";
  } finally {
    addingToCollection.value = false;
  }
}

onMounted(loadRecipe);
onMounted(loadDestinations);
</script>

<template>
  <section>
    <button type="button" @click="emit('back')">
      {{ props.backLabel ?? "Back to collections" }}
    </button>

    <p v-if="loading" role="status">Loading recipe…</p>

    <div v-else-if="error">
      <p role="alert">{{ error }}</p>
      <button type="button" @click="loadRecipe">Try again</button>
    </div>

    <p v-else-if="!details">
      This recipe is no longer available.
    </p>

    <template v-else>
      <h2 dir="auto">{{ details.title }}</h2>
      <RoleBadge v-if="props.directShared" :owner="canManageSharing" />
      <p v-if="details.source" dir="auto">
        Source: {{ details.source }}
      </p>

      <details v-if="canManageSharing">
        <summary>Share recipe</summary>
        <SharingForm
          :recipe="props.recipe"
          @session-expired="emit('sessionExpired')"
        />
      </details>

      <section v-if="!props.directShared || canManageSharing" aria-labelledby="add-to-collection-heading">
        <h3 id="add-to-collection-heading">Add to a collection</h3>

        <p id="collection-sharing-help">
          Members of the destination collection will see this recipe and
          all existing and future cooking entries. Adding it does not
          remove it from My recipes or any existing collection.
        </p>

        <p v-if="loadingDestinations" role="status">
          Loading collections…
        </p>

        <p v-if="collectionError" role="alert">
          {{ collectionError }}
        </p>

        <p v-if="collectionSuccess" role="status">
          {{ collectionSuccess }}
        </p>

        <template v-if="!loadingDestinations && !destinationsFailed">
          <form
            v-if="destinations.length > 0"
            @submit.prevent="addToCollection"
          >
            <fieldset :disabled="addingToCollection">
              <legend>Destination collection</legend>

              <label for="recipe-destination">Collection</label>
              <select
                id="recipe-destination"
                v-model="destination"
                aria-describedby="collection-sharing-help"
                required
              >
                <option disabled value="">Choose a collection</option>

                <option
                  v-for="collection in destinations"
                  :key="collection.collection"
                  :value="collection.collection"
                  dir="auto"
                >
                  {{ collection.name }}
                </option>
              </select>

              <button type="submit" :disabled="!destination">
                {{ addingToCollection ? "Adding…" : "Add to collection" }}
              </button>
            </fieldset>
          </form>

          <p v-else>
            No other available collections are missing this recipe.
            Create another collection or ask someone to share one with you.
          </p>
        </template>

        <button
          type="button"
          :disabled="loadingDestinations || addingToCollection"
          @click="loadDestinations"
        >
          Refresh collections
        </button>
      </section>

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
        :direct-shared="props.directShared"
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
        </p>
        <p v-else>No result recorded yet.</p>

        <button
          v-if="entry.author === user && !showEntryForm"
          type="button"
          @click="editEntry(entry)"
        >
          Edit this entry
        </button>
      </article>
    </template>
  </section>
</template>
