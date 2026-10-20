<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";

const props = defineProps<{
  collection?: string;
  recipe?: string;
}>();

const emit = defineEmits<{
  sessionExpired: [];
  changed: [];
}>();

const username = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");

/** Grant or revoke collection or direct recipe access by registered username. */
async function updateAccess(action: "share" | "revoke") {
  if (busy.value) return;

  error.value = "";
  notice.value = "";

  if (!username.value.trim()) {
    error.value = "Enter a registered username.";
    return;
  }

  busy.value = true;

  try {
    let response;
    if (props.recipe !== undefined) {
      if (action === "share") {
        const prepared = await api["/recipes/prepare-sharing"]({ recipe: props.recipe });
        if ("error" in prepared) throw new ApiError(String(prepared.error));
      }
      const input = { recipe: props.recipe, username: username.value };
      response = action === "share"
        ? await api["/recipes/share"](input)
        : await api["/recipes/revoke"](input);
    } else if (props.collection !== undefined) {
      const input = { collection: props.collection, username: username.value };
      response = action === "share"
        ? await api.collections.share(input)
        : await api.collections.revoke(input);
    } else {
      throw new Error("A recipe or collection is required.");
    }

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    notice.value =
      action === "share"
        ? `Access granted to ${username.value}.`
        : `Access removed for ${username.value}.`;

    username.value = "";
    emit("changed");
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.code === "UNAUTHORIZED") {
        emit("sessionExpired");
        return;
      }

      const messages: Record<string, string> = {
        NOT_FOUND: "The username or shared item could not be found.",
        FORBIDDEN: "Only the owner can manage access.",
        INVALID_REQUEST: "Check the username.",
        INVALID_INPUT: "Check the username.",
        CONFLICT:
          action === "share"
            ? "That user already has access, or is the owner."
            : "That user is not a member, or is the owner.",
      };

      error.value =
        messages[cause.code] ?? "Could not update access. Please try again.";
    } else {
      error.value = "Could not update access. Please try again.";
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="updateAccess('share')">
    <fieldset :disabled="busy">
      <legend>Manage {{ recipe !== undefined ? "recipe" : "collection" }} access</legend>
      <p v-if="recipe !== undefined">
        Share this recipe and its cooking history directly with another cook.
        Revoking direct access preserves any access they have through a collection.
      </p>

      <label :for="'share-username-' + (recipe ?? collection)">
        Registered username
      </label>

      <input
        :id="'share-username-' + (recipe ?? collection)"
        v-model="username"
        required
      />

      <button type="submit">
        {{ busy ? "Updating…" : recipe !== undefined ? "Share recipe" : "Share collection" }}
      </button>

      <button
        type="button"
        @click="updateAccess('revoke')"
      >
        Revoke access
      </button>
    </fieldset>

    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
  </form>
</template>
