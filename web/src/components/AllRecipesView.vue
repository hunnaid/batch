<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import RecipeForm from "./RecipeForm.vue";

type RecipeSummary =
  BatchWireHttp["/recipes/mine"]["output"]["overview"]["recipes"][number];

type SortOrder = "newest" | "oldest" | "az" | "za";

const emit = defineEmits<{
  openRecipe: [recipe: string];
  sessionExpired: [];
}>();

const recipes = ref<RecipeSummary[]>([]);
const search = ref("");
const sortOrder = ref<SortOrder>("newest");
const loading = ref(false);
const addingRecipe = ref(false);
const error = ref("");

/** Search personal recipe titles and apply the selected ordering. */
const matchingRecipes = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();

  // Filtering creates a new array, so sorting won't change stored state.
  return recipes.value
    .filter((recipe) =>
      recipe.title.toLocaleLowerCase().includes(query)
    )
    .sort((a, b) => {
      let comparison = 0;

      switch (sortOrder.value) {
        case "newest":
          comparison =
            new Date(b.savedAt).getTime() -
            new Date(a.savedAt).getTime();
          break;

        case "oldest":
          comparison =
            new Date(a.savedAt).getTime() -
            new Date(b.savedAt).getTime();
          break;

        case "az":
          comparison = a.title.localeCompare(b.title);
          break;

        case "za":
          comparison = b.title.localeCompare(a.title);
          break;
      }

      // Keep ordering consistent when dates or titles are equal.
      return comparison || a.recipe.localeCompare(b.recipe);
    });
});

/** Load the signed-in user's personal saves, independently of collections. */
async function loadRecipes() {
  if (loading.value) return;

  loading.value = true;
  error.value = "";

  try {
    const response = await api["/recipes/mine"]({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    recipes.value = response.overview.recipes;
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }

    error.value = "Could not load recipes. Please try again.";
  } finally {
    loading.value = false;
  }
}

/** Show the updated personal list after creating a recipe. */
async function recipeSaved() {
  addingRecipe.value = false;
  search.value = "";
  await loadRecipes();
}

onMounted(loadRecipes);
</script>

<template>
  <section aria-labelledby="my-recipes-heading">
    <h2 id="my-recipes-heading">My recipes</h2>

    <button
      v-if="!addingRecipe"
      type="button"
      :disabled="loading"
      @click="addingRecipe = true"
    >
      Add recipe
    </button>

    <!-- No collection prop: save directly to the personal recipe list. -->
    <RecipeForm
      v-if="addingRecipe"
      @saved="recipeSaved"
      @cancel="addingRecipe = false"
      @session-expired="emit('sessionExpired')"
    />

    <template v-else>
      <label for="recipe-search">Search recipes</label>
      <input
        id="recipe-search"
        v-model="search"
        type="search"
        placeholder="Search by title"
      />

      <label for="recipe-sort">Sort by</label>
      <select id="recipe-sort" v-model="sortOrder">
        <option value="newest">Date added: newest first</option>
        <option value="oldest">Date added: oldest first</option>
        <option value="az">Title: A–Z</option>
        <option value="za">Title: Z–A</option>
      </select>

      <button
        type="button"
        :disabled="loading"
        @click="loadRecipes"
      >
        Refresh recipes
      </button>

      <p v-if="loading" role="status">Loading recipes…</p>

      <p v-else-if="error" role="alert">{{ error }}</p>

      <template v-else>
        <p v-if="recipes.length === 0">
          No recipes yet. Choose Add recipe to save your first one.
        </p>

        <p v-else-if="matchingRecipes.length === 0" role="status">
          No recipes match your search.
        </p>

        <ul v-else>
          <li v-for="recipe in matchingRecipes" :key="recipe.recipe">
            <button
              type="button"
              @click="emit('openRecipe', recipe.recipe)"
            >
              <span dir="auto">{{ recipe.title }}</span>
            </button>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>
