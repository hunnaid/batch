<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import RoleBadge from "./RoleBadge.vue";
import SharingForm from "./SharingForm.vue";
import RefreshButton from "./RefreshButton.vue";
import CollectionRecipeAdder from "./CollectionRecipeAdder.vue";
import type { RecipeSummary } from "../collection-recipes";

type Overview = BatchWireHttp["/shared/list"]["output"]["overview"];
const props = defineProps<{ user: string }>();
const emit = defineEmits<{
  openRecipe: [collection: string, recipe: string];
  openSharedRecipe: [recipe: string];
  sessionExpired: [];
}>();

const overview = ref<Overview>({ collections: [], recipes: [] });
const loading = ref(false);
const error = ref("");
const filter = ref<"all" | "received" | "sent">("all");
const addingTo = ref<Overview["collections"][number] | null>(null);

function beginAddRecipe(collection: Overview["collections"][number]) {
  if (loading.value) return;
  error.value = "";
  addingTo.value = collection;
}

async function cancelAddRecipe() {
  const collection = addingTo.value?.collection;
  addingTo.value = null;
  await nextTick();
  document.getElementById(`shared-add-recipe-${collection}`)?.focus();
}

function recipeSaved(recipe: string) {
  if (!addingTo.value) return;
  const collection = addingTo.value.collection;
  addingTo.value = null;
  emit("openRecipe", collection, recipe);
}

/** Keep counts current while the chooser stays open for further additions. */
function recipeAdded(recipe: RecipeSummary) {
  const collection = overview.value.collections.find((item) => item.collection === addingTo.value?.collection);
  if (collection && !collection.recipes.some((item) => item.recipe === recipe.recipe)) {
    collection.recipes.push(recipe);
  }
}

function matches(owner: string) {
  return filter.value === "all" ||
    (filter.value === "sent" ? owner === props.user : owner !== props.user);
}
const collections = computed(() => overview.value.collections
  .filter((item) => matches(item.owner))
  .sort((a, b) => a.name.localeCompare(b.name) || a.collection.localeCompare(b.collection)));
const recipes = computed(() => overview.value.recipes
  .filter((item) => matches(item.owner))
  .sort((a, b) => a.title.localeCompare(b.title) || a.recipe.localeCompare(b.recipe)));

/** Reload membership after grants or revocations as well as on navigation. */
async function loadShared() {
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const response = await api["/shared/list"]({});
    if ("error" in response) throw new ApiError(String(response.error));
    overview.value = response.overview;
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }
    error.value = "Could not load shared items. Please try again.";
  } finally {
    loading.value = false;
  }
}

onMounted(loadShared);
</script>

<template>
  <section aria-labelledby="shared-heading">
    <h2 id="shared-heading">Shared</h2>

    <CollectionRecipeAdder
      v-if="addingTo"
      :key="addingTo.collection"
      :collection="addingTo.collection"
      :name="addingTo.name"
      back-label="Return to shared"
      @saved="recipeSaved"
      @added="recipeAdded"
      @cancel="cancelAddRecipe"
      @session-expired="emit('sessionExpired')"
    />

    <template v-else>
      <p>Collections and recipes shared between cooks.</p>

      <div class="shared-toolbar">
        <div>
          <label for="sharing-filter">Show</label>
          <select id="sharing-filter" v-model="filter">
            <option value="all">All shared items</option>
            <option value="received">Shared with me</option>
            <option value="sent">Shared with others</option>
          </select>
        </div>
        <RefreshButton class="refresh-shared" :disabled="loading" @click="loadShared">
          Refresh shared items
        </RefreshButton>
      </div>

      <p v-if="loading" role="status">Loading shared items…</p>
      <p v-else-if="error" role="alert">{{ error }}</p>
      <template v-else>
        <section aria-labelledby="shared-collections-heading">
          <h3 id="shared-collections-heading">Collections</h3>
          <p v-if="collections.length === 0">No shared collections to show.</p>
          <article v-for="collection in collections" :key="collection.collection">
            <header class="shared-collection-header">
              <div class="shared-title">
                <h4 dir="auto">{{ collection.name }}</h4>
                <RoleBadge :owner="collection.owner === user" />
              </div>
              <button
                :id="`shared-add-recipe-${collection.collection}`"
                type="button"
                class="add-recipe"
                @click="beginAddRecipe(collection)"
              >
                <span aria-hidden="true">+</span>
                Add recipe
              </button>
            </header>
            <p>{{ collection.owner === user ? "Shared with others" : "Shared with you" }}</p>
            <details>
              <summary>View recipes ({{ collection.recipes.length }})</summary>
              <ul v-if="collection.recipes.length" class="shared-recipes">
                <li v-for="recipe in collection.recipes" :key="recipe.recipe">
                  <button type="button" @click="emit('openRecipe', collection.collection, recipe.recipe)">
                    <span dir="auto">{{ recipe.title }}</span>
                  </button>
                </li>
              </ul>
              <p v-else>No recipes in this collection yet.</p>
            </details>
            <details v-if="collection.owner === user">
              <summary>Manage sharing</summary>
              <SharingForm
                :collection="collection.collection"
                @changed="loadShared"
                @session-expired="emit('sessionExpired')"
              />
            </details>
          </article>
        </section>

        <section aria-labelledby="shared-recipes-heading">
          <h3 id="shared-recipes-heading">Individual recipes</h3>
          <p>Recipes shared directly, without sharing a collection.</p>
          <p v-if="recipes.length === 0">
            No individually shared recipes to show. Open one of your recipes and choose Share recipe to share it.
          </p>
          <ul v-else class="shared-recipes individual-recipes">
            <li v-for="recipe in recipes" :key="recipe.recipe">
              <button type="button" @click="emit('openSharedRecipe', recipe.recipe)">
                <span dir="auto">{{ recipe.title }}</span>
                <RoleBadge :owner="recipe.owner === user" />
              </button>
              <p>{{ recipe.owner === user ? "Shared with others" : "Shared with you" }}</p>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </section>
</template>

<style scoped>
.shared-collection-header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
.shared-collection-header .shared-title { flex: 1; min-width: 0; }
.add-recipe { display: inline-flex; align-items: center; gap: 8px; }
.add-recipe > span { font-size: 1.25rem; line-height: 1; }
.shared-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
.shared-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
  padding-bottom: 24px;
  margin-block: 24px;
  border-bottom: 1px solid var(--border);
}
.shared-toolbar > div { display: grid; gap: 8px; min-width: 0; }
.shared-toolbar label { margin: 0; }
.refresh-shared { justify-self: end; }
.shared-title h4 { margin: 0; }
.shared-recipes { list-style: none; padding: 0; }
.shared-recipes li { padding: 0; }
.shared-recipes button {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  text-align: start;
}
.individual-recipes > li { margin-block: 1rem; }
.individual-recipes p { margin: 0.3rem 0 0; color: var(--muted); font-size: 0.85rem; }
@media (max-width: 600px) {
  .refresh-shared { justify-self: start; }
}
</style>
