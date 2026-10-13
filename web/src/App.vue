<script setup lang="ts">
import { api, ApiError } from "./api";
import { onMounted, ref } from "vue";
import AuthForm from "./components/AuthForm.vue";
import CollectionsView from "./components/CollectionsView.vue";
import RecipeView from "./components/RecipeView.vue";

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
  collection: string;
  recipe: string;
} | null>(null);

function openRecipe(collection: string, recipe: string) {
  selectedRecipe.value = { collection, recipe };
}

/** Clear navigation and user state when authentication ends. */
function clearSession() {
  selectedRecipe.value = null;
  user.value = null;
}

</script>

<template>
  <main>
    <h1>Batch</h1>
    <p v-if="error" role="alert">{{ error }}</p>

    <p v-if="checkingSession">Checking your session…</p>

    <AuthForm
      v-else-if="!user"
      @authenticated="authenticated"
    />

    <section v-else>
      <p>You are signed in.</p>
      
      <button :disabled="signingOut" @click="logout">
        {{ signingOut ? "Signing out…" : "Sign out" }}
      </button>

      <RecipeView
        v-if="selectedRecipe"
        :key="selectedRecipe.collection + ':' + selectedRecipe.recipe"
        :collection="selectedRecipe.collection"
        :recipe="selectedRecipe.recipe"
        :user="user"
        @back="selectedRecipe = null"
        @session-expired="clearSession"
      />

      <CollectionsView
        v-else
        :user="user"
        @open-recipe="openRecipe"
        @session-expired="clearSession"
      />
    </section>
  </main>
</template>
