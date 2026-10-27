<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import CookingEntryForm from "./CookingEntryForm.vue";
import SharingForm from "./SharingForm.vue";
import RoleBadge from "./RoleBadge.vue";
import UserAvatar from "./UserAvatar.vue";
import ReturnButton from "./ReturnButton.vue";
import ConfirmationDialog from "./ConfirmationDialog.vue";
import RecipeForm from "./RecipeForm.vue";
import { toRecipeSections } from "../../../src/recipe-content.ts";

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
const ingredientSections = computed(() => details.value ? toRecipeSections(details.value.ingredients) : []);
const instructionSections = computed(() => details.value ? toRecipeSections(details.value.instructions) : []);
const loading = ref(true);
type Contributor = NonNullable<BatchWireHttp["/profiles/get"]["output"]["identity"]>;
const contributors = ref<Record<string, Contributor>>({});
const loadingContributors = ref(false);
const contributorError = ref(false);

function contributorName(author: string) {
  const identity = contributors.value[author];
  return identity?.profile?.displayName ?? identity?.username ?? (author === props.user ? "You" : "Contributor");
}

function attemptLabel(author: string) {
  return contributors.value[author]
    ? `${contributorName(author)}’s attempt`
    : author === props.user ? "Your attempt" : "Cooking attempt";
}

/** Resolve each author once per load, so old attempts use their current presentation. */
async function loadContributors() {
  if (!details.value || loadingContributors.value) return;
  loadingContributors.value = true;
  contributorError.value = false;
  const authors = [...new Set(details.value.entries.map((entry) => entry.author))];
  const outcomes = await Promise.allSettled(authors.map(async (author) => {
    const response = await api["/profiles/get"]({ user: author });
    if ("error" in response) throw new ApiError(String(response.error));
    if (response.identity) contributors.value[author] = response.identity;
  }));
  for (const outcome of outcomes) {
    if (outcome.status === "rejected") {
      contributorError.value = true;
      if (outcome.reason instanceof ApiError && outcome.reason.code === "UNAUTHORIZED") emit("sessionExpired");
    }
  }
  loadingContributors.value = false;
}

const error = ref("");
const canManageSharing = ref(false);
const currentCollection = ref<CollectionSummary | null>(null);
const managingRecipe = ref(false);
const managementError = ref("");
const pendingManagementAction = ref<"remove" | "delete" | null>(null);
const editingRecipe = ref(false);
const recipeNotice = ref("");
const managementDetails = ref<HTMLDetailsElement | null>(null);

async function beginEditRecipe() {
  if (!details.value || !canManageSharing.value || managingRecipe.value || addingToCollection.value || showEntryForm.value) return;
  recipeNotice.value = "";
  managementError.value = "";
  editingRecipe.value = true;
  await nextTick();
  document.getElementById("recipe-title")?.focus();
}

async function cancelEditRecipe() {
  editingRecipe.value = false;
  await nextTick();
  if (managementDetails.value) managementDetails.value.open = true;
  document.getElementById("edit-original-recipe")?.focus();
}

async function originalRecipeSaved() {
  editingRecipe.value = false;
  recipeNotice.value = "Recipe updated. Its cooking history is unchanged.";
  await loadRecipe();
  await nextTick();
  if (managementDetails.value) managementDetails.value.open = true;
  document.getElementById("edit-original-recipe")?.focus();
}

function confirmManagement(action: "remove" | "delete") {
  if (managingRecipe.value || addingToCollection.value || showEntryForm.value || !details.value) return;
  if (action === "remove" && (!props.collection || currentCollection.value?.owner !== props.user)) return;
  if (action === "delete" && !canManageSharing.value) return;
  managementError.value = "";
  pendingManagementAction.value = action;
}

function cancelManagement() {
  if (managingRecipe.value) return;
  pendingManagementAction.value = null;
  managementError.value = "";
}

/** The server checks ownership again; visible controls are only a convenience. */
async function manageRecipe(action: "remove" | "delete") {
  if (managingRecipe.value || addingToCollection.value || showEntryForm.value || !details.value) return;
  const removing = action === "remove";
  if (removing && (!props.collection || currentCollection.value?.owner !== props.user)) return;
  if (!removing && !canManageSharing.value) return;
  if (pendingManagementAction.value !== action) return;

  managingRecipe.value = true;
  managementError.value = "";
  try {
    const response = removing
      ? await api["/recipes/remove-from-collection"]({ collection: props.collection!, recipe: props.recipe })
      : await api["/recipes/delete"]({ recipe: props.recipe });
    if ("error" in response) throw new ApiError(String(response.error));
    emit("back");
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }
    managementError.value = cause instanceof ApiError && cause.code === "FORBIDDEN"
      ? "You no longer have permission to perform this action."
      : cause instanceof ApiError && cause.code === "NOT_FOUND"
      ? "The recipe or collection membership no longer exists. Return to the list and refresh."
      : "Could not confirm the change. Return to the list and refresh before trying again.";
  } finally {
    managingRecipe.value = false;
  }
}

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
    contributors.value = {};
    void loadContributors();
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
  currentCollection.value = null;
  destination.value = "";

  try {
    const response = await api.collections.list({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    currentCollection.value = response.overview.collections.find(
      (collection) => collection.collection === props.collection &&
        collection.recipes.some((recipe) => recipe.recipe === props.recipe)
    ) ?? null;
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
    <ReturnButton v-if="!editingRecipe" :disabled="managingRecipe" @click="emit('back')">
      {{ props.backLabel ?? "Return to collections" }}
    </ReturnButton>

    <p v-if="recipeNotice" role="status">{{ recipeNotice }}</p>

    <p v-if="loading" role="status">Loading recipe…</p>

    <div v-else-if="error">
      <p role="alert">{{ error }}</p>
      <button type="button" @click="loadRecipe">Try again</button>
    </div>

    <p v-else-if="!details">
      This recipe is no longer available.
    </p>

    <RecipeForm
      v-else-if="editingRecipe"
      :recipe="props.recipe"
      :initial="details"
      @saved="originalRecipeSaved"
      @cancel="cancelEditRecipe"
      @session-expired="emit('sessionExpired')"
    />

    <div v-else :inert="managingRecipe">
      <h2 dir="auto">{{ details.title }}</h2>
      <RoleBadge v-if="props.directShared" :owner="canManageSharing" />
      <p v-if="details.description?.trim()" class="recipe-description recipe-text" dir="auto">{{ details.description }}</p>
      <p v-if="details.source" dir="auto">
        Source: {{ details.source }}
      </p>

      <div class="recipe-card">
        <section class="recipe-ingredients" aria-labelledby="recipe-ingredients-heading">
          <h3 id="recipe-ingredients-heading" class="recipe-section-heading">Ingredients</h3>
          <div v-for="(section, sectionIndex) in ingredientSections" :key="sectionIndex" class="recipe-subsection">
            <h4 v-if="section.heading?.trim()" class="subsection-heading" dir="auto">{{ section.heading }}</h4>
            <ul class="ingredient-list">
              <li v-for="(ingredient, index) in section.items" :key="index" class="recipe-text" dir="auto">{{ ingredient }}</li>
            </ul>
          </div>
        </section>

        <section class="recipe-preparation" aria-labelledby="recipe-instructions-heading">
          <h3 id="recipe-instructions-heading" class="recipe-section-heading">Instructions</h3>
          <div v-for="(section, sectionIndex) in instructionSections" :key="sectionIndex" class="recipe-subsection">
            <h4 v-if="section.heading?.trim()" class="subsection-heading" dir="auto">{{ section.heading }}</h4>
            <ol class="instruction-list" :start="1">
              <li v-for="(instruction, index) in section.items" :key="index">
                <p class="instruction-text recipe-text" dir="auto">{{ instruction }}</p>
              </li>
            </ol>
          </div>

          <section v-if="details.notes?.trim()" class="recipe-notes" aria-labelledby="recipe-notes-heading">
            <h3 id="recipe-notes-heading">Notes</h3>
            <p class="recipe-text" dir="auto">{{ details.notes }}</p>
          </section>
        </section>
      </div>

      <h3>Cooking history</h3>
      <p v-if="contributorError" role="status">
        Some contributor profiles could not be loaded.
        <button type="button" :disabled="loadingContributors" @click="loadContributors">Retry profiles</button>
      </p>

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
        <div class="attempt-author">
          <UserAvatar :name="contributorName(entry.author)" :picture="contributors[entry.author]?.profile?.picture" />
          <div>
            <h4 dir="auto">{{ attemptLabel(entry.author) }}<span v-if="contributors[entry.author] && entry.author === user"> (you)</span></h4>
            <p v-if="contributors[entry.author]" class="author-username" dir="auto">@{{ contributors[entry.author]!.username }}</p>
          </div>
        </div>

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

      <details v-if="!props.directShared || canManageSharing">
        <summary>Add to a collection</summary>

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

              <button type="submit" class="add-to-collection" :disabled="!destination">
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
      </details>

      <details v-if="canManageSharing">
        <summary>Share recipe</summary>
        <SharingForm
          :recipe="props.recipe"
          @session-expired="emit('sessionExpired')"
        />
      </details>

      <details v-if="canManageSharing || currentCollection?.owner === user" ref="managementDetails">
        <summary>Manage recipe</summary>
        <p v-if="managementError && !pendingManagementAction" role="alert">{{ managementError }}</p>
        <p v-if="showEntryForm">Save or cancel your cooking entry before managing this recipe.</p>
        <div class="management-actions">
          <button
            v-if="canManageSharing"
            id="edit-original-recipe"
            type="button"
            :disabled="managingRecipe || addingToCollection || showEntryForm"
            @click="beginEditRecipe"
          >
            Edit recipe
          </button>
          <button
            v-if="currentCollection?.owner === user"
            type="button"
            :disabled="managingRecipe || addingToCollection || showEntryForm"
            @click="confirmManagement('remove')"
          >
            Remove from collection
          </button>
          <button
            v-if="canManageSharing"
            type="button"
            class="delete-recipe"
            :disabled="managingRecipe || addingToCollection || showEntryForm"
            @click="confirmManagement('delete')"
          >
            Delete recipe permanently
          </button>
        </div>
      </details>
    </div>
    <ConfirmationDialog
      v-if="pendingManagementAction && details"
      :title="pendingManagementAction === 'remove'
        ? `Remove “${details.title}” from “${currentCollection?.name}”?`
        : `Delete “${details.title}” permanently?`"
      :description="pendingManagementAction === 'remove'
        ? 'This removes the recipe from this collection only. Personal saves, other collections, direct shares, and cooking history are kept.'
        : 'This deletes the recipe from everyone’s saved recipes and collections, along with all cooking entries—including other cooks’ attempts.'"
      :warning="pendingManagementAction === 'delete' ? 'This cannot be undone.' : undefined"
      :confirm-label="pendingManagementAction === 'remove' ? 'Remove from collection' : 'Delete recipe'"
      :busy-label="pendingManagementAction === 'remove' ? 'Removing recipe…' : 'Deleting recipe…'"
      :busy="managingRecipe"
      :error="managementError"
      @cancel="cancelManagement"
      @confirm="manageRecipe(pendingManagementAction)"
    />
  </section>
</template>

<style scoped>
.recipe-description { max-width: 70ch; margin-block: 16px; }
.recipe-card {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.65fr);
  gap: 40px;
  margin-block: 32px 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}
.recipe-card > section { min-width: 0; }
.recipe-section-heading {
  margin: 0 0 24px;
  padding-top: 10px;
  border-top: 3px solid var(--green-ink);
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.recipe-subsection + .recipe-subsection { margin-top: 28px; }
.subsection-heading { margin: 0 0 12px; font-size: 1rem; font-weight: 650; }
.ingredient-list, .instruction-list { margin: 0; padding-inline-start: 24px; }
.ingredient-list { list-style: disc; }
.instruction-list { list-style: decimal; }
.ingredient-list li { margin: 0 0 12px; padding-inline-start: 4px; }
.instruction-list li { margin: 0 0 24px; padding-inline-start: 4px; }
.instruction-list li::marker { color: var(--green-ink); font-weight: 650; }
.ingredient-list li:last-child, .instruction-list li:last-child { margin-bottom: 0; }
.instruction-text { margin: 0; }
.recipe-notes { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--border); }
.recipe-notes h3 {
  margin: 0 0 8px;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.recipe-notes p { margin: 0; }
@media (max-width: 700px) {
  .recipe-card { grid-template-columns: minmax(0, 1fr); gap: 28px; }
}
.add-to-collection:hover:not(:disabled) {
  color: var(--green-ink);
  background: var(--green-soft);
  border-color: var(--green);
}
.management-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.attempt-author { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.attempt-author > div { min-width: 0; }
.attempt-author h4 { margin: 0; }
.author-username { color: var(--muted); font-size: 0.85rem; margin: 0; }
.delete-recipe {
  color: var(--error);
  border-color: var(--error);
}
.delete-recipe:hover:not(:disabled) {
  background: var(--error-soft);
  border-color: var(--error);
}
</style>
