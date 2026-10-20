<script setup lang="ts">
import { api, ApiError } from "./api";
import { onMounted, ref } from "vue";
import AuthForm from "./components/AuthForm.vue";
import CollectionsView from "./components/CollectionsView.vue";
import RecipeView from "./components/RecipeView.vue";

import AllRecipesView from "./components/AllRecipesView.vue";

/** Remember which overview to return to after viewing a recipe. */
const overview = ref<"recipes" | "collections">("recipes");

const user = ref<string | null>(null);
const checkingSession = ref(true);
const signingOut = ref(false);
const error = ref("");

/** Restore an existing login when the page loads or refreshes. */
onMounted(async () => {
  try {
    const response = await api.sessions.current({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    user.value = response.user;
  } catch (cause) {
    if (!(cause instanceof ApiError && cause.code === "UNAUTHORIZED")) {
      error.value = "Could not check your session. Try refreshing the page.";
    }
  } finally {
    checkingSession.value = false;
  }
});

function authenticated(userId: string) {
  user.value = userId;
  error.value = "";
}

/** End the server session before returning to the login form. */
async function logout() {
  signingOut.value = true;
  error.value = "";

  try {
    const response = await api.sessions.end({});

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    clearSession();
  } catch {
    error.value = "Could not sign out. Please try again.";
  } finally {
    signingOut.value = false;
  }
}

/** Identify the recipe screen currently open, if any. */
const selectedRecipe = ref<{
  collection: string | null;
  recipe: string;
} | null>(null);

function openRecipe(collection: string, recipe: string) {
  selectedRecipe.value = { collection, recipe };
}

/** Open a recipe through the signed-in user's personal saved list. */
function openPersonalRecipe(recipe: string) {
  selectedRecipe.value = {
    collection: null,
    recipe,
  };
}

/** Clear navigation and user state when authentication ends. */
function clearSession() {
  selectedRecipe.value = null;
  user.value = null;
  overview.value = "recipes";
}

</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="brand-label">Your recipe notebook</p>
        <h1 class="brand-name">Batch</h1>
        <p class="brand-description">
          Keep the recipes. Remember what worked.
        </p>
      </div>

      <button
        v-if="user"
        type="button"
        class="sign-out"
        :disabled="signingOut"
        @click="logout"
      >
        {{ signingOut ? "Signing out…" : "Sign out" }}
      </button>
    </header>

    <p v-if="error" role="alert">{{ error }}</p>

    <p v-if="checkingSession" role="status">
      Checking your session…
    </p>

    <section v-else-if="!user" class="auth-panel">
      <AuthForm @authenticated="authenticated" />
    </section>

    <section v-else class="workspace">
      <RecipeView
        v-if="selectedRecipe"
        :key="(selectedRecipe.collection ?? 'personal') + ':' + selectedRecipe.recipe"
        :collection="selectedRecipe.collection ?? undefined"
        :recipe="selectedRecipe.recipe"
        :user="user"
        :back-label="
          overview === 'recipes'
            ? 'Back to my recipes'
            : 'Back to collections'
        "
        @back="selectedRecipe = null"
        @session-expired="clearSession"
      />

      <template v-else>
        <nav aria-label="Recipe organization">
          <button
            type="button"
            :aria-pressed="overview === 'recipes'"
            @click="overview = 'recipes'"
          >
            My recipes
          </button>

          <button
            type="button"
            :aria-pressed="overview === 'collections'"
            @click="overview = 'collections'"
          >
            Collections
          </button>
        </nav>

        <AllRecipesView
          v-if="overview === 'recipes'"
          @open-recipe="openPersonalRecipe"
          @session-expired="clearSession"
        />

        <CollectionsView
          v-else
          :user="user"
          @open-recipe="openRecipe"
          @session-expired="clearSession"
        />
      </template>
    </section>
  </main>
</template>
