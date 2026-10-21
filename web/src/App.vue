<script setup lang="ts">
import { api, ApiError } from "./api";
import { onMounted, ref, watch } from "vue";
import AuthForm from "./components/AuthForm.vue";
import CollectionsView from "./components/CollectionsView.vue";
import RecipeView from "./components/RecipeView.vue";

import AllRecipesView from "./components/AllRecipesView.vue";
import SharedView from "./components/SharedView.vue";
import ProfileView from "./components/ProfileView.vue";
import UserAvatar from "./components/UserAvatar.vue";

/** Remember which overview to return to after viewing a recipe. */
const overview = ref<"recipes" | "collections" | "shared">("recipes");

const user = ref<string | null>(null);
const checkingSession = ref(true);
const showingProfile = ref(false);
const error = ref("");
const headerProfile = ref<{ name: string; picture: string | null } | null>(null);
let profileRequest = 0;

/** Load the avatar for the current session, discarding outdated responses. */
watch(user, async (currentUser) => {
  const request = ++profileRequest;
  headerProfile.value = null;
  if (!currentUser) return;

  try {
    const response = await api["/profiles/me"]({});
    if (request !== profileRequest || "error" in response || !response.identity) return;
    headerProfile.value = {
      name: response.identity.profile?.displayName ?? response.identity.username,
      picture: response.identity.profile?.picture ?? null,
    };
  } catch {
    // The default avatar still provides access to the profile page.
  }
});

function profileSaved(profile: { displayName: string; picture: string }) {
  ++profileRequest;
  headerProfile.value = { name: profile.displayName, picture: profile.picture };
}

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

/** Identify the recipe screen currently open, if any. */
const selectedRecipe = ref<{
  collection: string | null;
  recipe: string;
  directShared?: boolean;
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

function openSharedRecipe(recipe: string) {
  selectedRecipe.value = { collection: null, recipe, directShared: true };
}

/** Clear navigation and user state when authentication ends. */
function clearSession() {
  selectedRecipe.value = null;
  showingProfile.value = false;
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
        class="profile-link"
        aria-label="Your profile"
        :title="headerProfile?.name ? `${headerProfile.name} · Your profile` : 'Your profile'"
        :aria-pressed="showingProfile"
        :disabled="showingProfile"
        @click="showingProfile = true"
      >
        <UserAvatar
          :name="headerProfile?.name ?? ''"
          :picture="headerProfile?.picture"
          default-icon
        />
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
      <ProfileView
        v-if="showingProfile"
        @back="showingProfile = false"
        @signed-out="clearSession"
        @session-expired="clearSession"
        @saved="profileSaved"
      />
      <RecipeView
        v-else-if="selectedRecipe"
        :key="(selectedRecipe.collection ?? (selectedRecipe.directShared ? 'shared' : 'personal')) + ':' + selectedRecipe.recipe"
        :collection="selectedRecipe.collection ?? undefined"
        :recipe="selectedRecipe.recipe"
        :direct-shared="selectedRecipe.directShared"
        :user="user"
        :back-label="
          overview === 'recipes'
            ? 'Back to my recipes'
            : overview === 'shared' ? 'Back to shared' : 'Back to collections'
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
          <button
            type="button"
            :aria-pressed="overview === 'shared'"
            @click="overview = 'shared'"
          >
            Shared
          </button>
        </nav>

        <AllRecipesView
          v-if="overview === 'recipes'"
          @open-recipe="openPersonalRecipe"
          @session-expired="clearSession"
        />

        <CollectionsView
          v-else-if="overview === 'collections'"
          :user="user"
          @open-recipe="openRecipe"
          @session-expired="clearSession"
        />

        <SharedView
          v-else
          :user="user"
          @open-recipe="openRecipe"
          @open-shared-recipe="openSharedRecipe"
          @session-expired="clearSession"
        />
      </template>
    </section>
  </main>
</template>

<style scoped>
.app-header > div { flex: 1; min-width: 0; }
.profile-link {
  display: inline-flex;
  flex: 0 0 56px;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 5px;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(41 47 41 / 6%);
}
.profile-link:disabled {
  opacity: 1;
  cursor: default;
  border-color: var(--green);
  box-shadow: 0 0 0 3px var(--green-soft);
}
nav[aria-label="Recipe organization"] {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
nav button[aria-pressed="true"] {
  background: var(--green);
  border-color: var(--green);
  color: white;
}
</style>
