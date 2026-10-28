<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import { collectionRecipeCandidates, type RecipeCandidate, type RecipeSummary } from "../collection-recipes";
import RecipeForm from "./RecipeForm.vue";
import ReturnButton from "./ReturnButton.vue";
import RefreshButton from "./RefreshButton.vue";
import RecipeSourceOptions from "./RecipeSourceOptions.vue";
import WebsiteRecipeImport from "./WebsiteRecipeImport.vue";

const props = defineProps<{ collection: string; name: string; backLabel?: string }>();
const emit = defineEmits<{
  cancel: [];
  saved: [recipe: string];
  added: [recipe: RecipeSummary];
  sessionExpired: [];
}>();

const mode = ref<"choose" | "new" | "existing" | "import">("choose");
const heading = ref<HTMLHeadingElement | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);
const candidates = ref<RecipeCandidate[]>([]);
const search = ref("");
const loading = ref(false);
const adding = ref<string | null>(null);
const error = ref("");
const success = ref("");
let active = true;
onBeforeUnmount(() => { active = false; });
onMounted(() => heading.value?.focus());

const matchingRecipes = computed(() => candidates.value.filter((recipe) =>
  recipe.title.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())));

async function chooseMode(value: "choose" | "new" | "existing" | "import") {
  if (adding.value || loading.value) return;
  mode.value = value;
  error.value = "";
  success.value = "";
  await nextTick();
  if (!active) return;
  if (value === "new") document.getElementById("recipe-title")?.focus();
  else if (value === "existing") {
    searchInput.value?.focus();
    await loadRecipes();
  } else heading.value?.focus();
}

async function loadRecipes() {
  if (loading.value || adding.value) return;
  loading.value = true;
  error.value = "";
  success.value = "";
  try {
    const [personal, collections] = await Promise.all([
      api["/recipes/mine"]({}),
      api.collections.list({}),
    ]);
    if (!active) return;
    if ("error" in personal) throw new ApiError(String(personal.error));
    if ("error" in collections) throw new ApiError(String(collections.error));
    if (!collections.overview.collections.some((item) => item.collection === props.collection)) {
      throw new ApiError("FORBIDDEN");
    }
    candidates.value = collectionRecipeCandidates(
      personal.overview.recipes, collections.overview.collections, props.collection,
    );
  } catch (cause) {
    if (!active) return;
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") emit("sessionExpired");
    else error.value = cause instanceof ApiError && cause.code === "FORBIDDEN"
      ? "This collection is no longer available. Return to collections and refresh the list."
      : "Could not load recipes. Try refreshing the list.";
  } finally {
    if (active) loading.value = false;
  }
}

/** Reuse the original recipe and history through its existing access path. */
async function addRecipe(recipe: RecipeCandidate) {
  if (adding.value || loading.value) return;
  adding.value = recipe.recipe;
  error.value = "";
  success.value = "";
  try {
    const response = recipe.sourceCollection !== undefined
      ? await api["/recipes/add-to-collection"]({
          sourceCollection: recipe.sourceCollection,
          destinationCollection: props.collection,
          recipe: recipe.recipe,
        })
      : await api["/recipes/add-personal-to-collection"]({
          destinationCollection: props.collection,
          recipe: recipe.recipe,
        });
    if (!active) return;
    if ("error" in response) throw new ApiError(String(response.error));
    candidates.value = candidates.value.filter((item) => item.recipe !== recipe.recipe);
    success.value = `Added “${recipe.title}” to “${props.name}”.`;
    emit("added", { recipe: recipe.recipe, title: recipe.title });
  } catch (cause) {
    if (!active) return;
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") emit("sessionExpired");
    else if (cause instanceof ApiError && cause.code === "CONFLICT") {
      candidates.value = candidates.value.filter((item) => item.recipe !== recipe.recipe);
      error.value = "This recipe is already in the collection.";
      emit("added", { recipe: recipe.recipe, title: recipe.title });
    } else error.value = cause instanceof ApiError && ["FORBIDDEN", "NOT_FOUND"].includes(cause.code)
      ? "The recipe or collection is no longer available through this access. Refresh the list before trying again."
      : "Could not confirm the addition. Refresh the list before trying again.";
  } finally {
    if (active) {
      adding.value = null;
      await nextTick();
      searchInput.value?.focus();
    }
  }
}
</script>

<template>
  <div>
    <ReturnButton
      v-if="mode === 'choose' || mode === 'existing'"
      :disabled="adding !== null || loading"
      @click="mode === 'choose' ? emit('cancel') : chooseMode('choose')"
    >{{ mode === 'choose' ? (props.backLabel ?? 'Return to collections') : 'Return to recipe options' }}</ReturnButton>
    <h3 v-if="mode === 'choose' || mode === 'existing'" ref="heading" class="adder-heading" tabindex="-1">
      {{ mode === 'choose' ? 'Add recipe' : 'Add existing recipe' }}
    </h3>
    <p>Adding to <strong dir="auto">{{ name }}</strong></p>

    <RecipeSourceOptions v-if="mode === 'choose'" include-existing @existing="chooseMode('existing')"
      @manual="chooseMode('new')" @website="chooseMode('import')" />

    <RecipeForm
      v-else-if="mode === 'new'"
      :collection="collection"
      @saved="emit('saved', $event)"
      @cancel="chooseMode('choose')"
      @session-expired="emit('sessionExpired')"
    />

    <WebsiteRecipeImport v-else-if="mode === 'import'" :collection="collection" @saved="emit('saved', $event)"
      @cancel="chooseMode('choose')" @session-expired="emit('sessionExpired')" />

    <template v-else>
      <p id="existing-recipe-help">
        Only recipes not already in this collection are listed.
        Collection members will see their existing and future cooking entries.
      </p>
      <div class="picker-toolbar">
        <div>
          <label for="existing-recipe-search">Search recipes</label>
          <input id="existing-recipe-search" ref="searchInput" v-model="search" type="search"
            placeholder="Search by title" aria-describedby="existing-recipe-help" />
        </div>
        <RefreshButton :disabled="loading || adding !== null" @click="loadRecipes">Refresh recipes</RefreshButton>
      </div>
      <p v-if="loading" role="status">Loading recipes…</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="success" role="status">{{ success }}</p>
      <template v-if="!loading">
        <p v-if="!error && candidates.length === 0">No more recipes to add. You can return to recipe options to create a new one.</p>
        <p v-else-if="!error && matchingRecipes.length === 0" role="status">No recipes match your search.</p>
        <ul class="picker-recipes" role="list">
          <li v-for="recipe in matchingRecipes" :key="recipe.recipe">
            <span dir="auto">{{ recipe.title }}</span>
            <button type="button" class="button-primary" :disabled="adding !== null" :aria-label="`Add ${recipe.title} to ${name}`"
              @click="addRecipe(recipe)">{{ adding === recipe.recipe ? 'Adding…' : 'Add' }}</button>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>

<style scoped>
.adder-heading { margin-top: 0; }
.picker-toolbar { display: flex; align-items: end; flex-wrap: wrap; gap: 20px; margin-block: 24px; }
.picker-toolbar > div { flex: 1; min-width: min(100%, 240px); display: grid; gap: 8px; }
.picker-toolbar label { margin: 0; }
.picker-recipes { list-style: none; padding: 0; margin: 0; }
.picker-recipes li { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin: 0; padding: 14px 0; border-bottom: 1px solid var(--border); }
.picker-recipes span { min-width: 0; overflow-wrap: anywhere; }
.picker-recipes button { flex-shrink: 0; }
</style>
