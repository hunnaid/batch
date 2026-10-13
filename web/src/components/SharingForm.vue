<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";

const props = defineProps<{
  collection: string;
}>();

const emit = defineEmits<{
  sessionExpired: [];
}>();

const username = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");

/** Grant or revoke access using the recipient's registered username. */
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
    const input = {
      collection: props.collection,
      username: username.value,
    };

    const response =
      action === "share"
        ? await api.collections.share(input)
        : await api.collections.revoke(input);

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    notice.value =
      action === "share"
        ? `Access granted to ${username.value}.`
        : `Access removed for ${username.value}.`;

    username.value = "";
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.code === "UNAUTHORIZED") {
        emit("sessionExpired");
        return;
      }

      const messages: Record<string, string> = {
        NOT_FOUND: "The username or collection could not be found.",
        FORBIDDEN: "Only the collection owner can manage access.",
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
      <legend>Manage collection access</legend>

      <label :for="'share-username-' + collection">
        Registered username
      </label>

      <input
        :id="'share-username-' + collection"
        v-model="username"
        required
      />

      <button type="submit">
        {{ busy ? "Updating…" : "Share collection" }}
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
