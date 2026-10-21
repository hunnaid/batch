<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";

type Recipient = BatchWireHttp["/collections/recipients"]["output"]["sharing"]["recipients"][number];
const props = defineProps<{ collection?: string; recipe?: string }>();
const emit = defineEmits<{ sessionExpired: []; changed: [] }>();

const username = ref("");
const busy = ref(false);
const revoking = ref<string | null>(null);
const error = ref("");
const notice = ref("");
const recipients = ref<Recipient[]>([]);
const loadingRecipients = ref(false);
const recipientsLoaded = ref(false);
const recipientError = ref("");
const sortedRecipients = computed(() => [...recipients.value]
  .sort((a, b) => a.username.localeCompare(b.username) || a.user.localeCompare(b.user)));
let recipientRequest = 0;

/** Reading recipients never initializes sharing or grants access. */
async function loadRecipients() {
  const request = ++recipientRequest;
  loadingRecipients.value = true;
  recipientsLoaded.value = false;
  recipientError.value = "";
  try {
    const response = props.recipe !== undefined
      ? await api["/recipes/recipients"]({ recipe: props.recipe })
      : props.collection !== undefined
      ? await api["/collections/recipients"]({ collection: props.collection })
      : null;
    if (request !== recipientRequest) return;
    if (!response) throw new Error("A recipe or collection is required.");
    if ("error" in response) throw new ApiError(String(response.error));
    recipients.value = response.sharing.recipients;
    recipientsLoaded.value = true;
  } catch (cause) {
    if (request !== recipientRequest) return;
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }
    recipientError.value = cause instanceof ApiError && cause.code === "FORBIDDEN"
      ? "Only the owner can view and manage sharing recipients."
      : "Could not load sharing recipients. Please try again.";
  } finally {
    if (request === recipientRequest) loadingRecipients.value = false;
  }
}

/** Grant access through the input or revoke the username selected from the list. */
async function updateAccess(action: "share" | "revoke", recipient?: Recipient) {
  if (busy.value || loadingRecipients.value) return;
  error.value = notice.value = "";
  const targetUsername = action === "share" ? username.value : recipient?.username;
  if (!targetUsername?.trim()) {
    error.value = "Enter a registered username.";
    return;
  }
  busy.value = true;
  revoking.value = action === "revoke" ? recipient!.user : null;
  try {
    let response;
    if (props.recipe !== undefined) {
      if (action === "share") {
        const prepared = await api["/recipes/prepare-sharing"]({ recipe: props.recipe });
        if ("error" in prepared) throw new ApiError(String(prepared.error));
      }
      const input = { recipe: props.recipe, username: targetUsername };
      response = action === "share"
        ? await api["/recipes/share"](input)
        : await api["/recipes/revoke"](input);
    } else if (props.collection !== undefined) {
      const input = { collection: props.collection, username: targetUsername };
      response = action === "share"
        ? await api.collections.share(input)
        : await api.collections.revoke(input);
    } else {
      throw new Error("A recipe or collection is required.");
    }
    if ("error" in response) throw new ApiError(String(response.error));
    notice.value = action === "share"
      ? `Shared with @${targetUsername}.`
      : props.recipe !== undefined
      ? `Direct recipe access removed for @${targetUsername}. Collection access is unchanged.`
      : `Collection access removed for @${targetUsername}.`;
    if (action === "share") username.value = "";
    else recipients.value = recipients.value.filter((item) => item.user !== recipient!.user);
    emit("changed");
    await loadRecipients();
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") {
      emit("sessionExpired");
      return;
    }
    const messages: Record<string, string> = {
      NOT_FOUND: "The username or shared item could not be found.",
      FORBIDDEN: "Only the owner can manage access.",
      INVALID_REQUEST: "Check the username.",
      INVALID_INPUT: "Check the username.",
      CONFLICT: action === "share"
        ? "That user already has access, or is the owner."
        : "That user is no longer a recipient.",
    };
    error.value = cause instanceof ApiError
      ? messages[cause.code] ?? "Could not update access. Please try again."
      : "Could not update access. Please try again.";
    if (cause instanceof ApiError && cause.code === "CONFLICT") await loadRecipients();
  } finally {
    busy.value = false;
    revoking.value = null;
  }
}

watch(() => [props.recipe, props.collection], () => {
  recipients.value = [];
  error.value = notice.value = "";
  void loadRecipients();
}, { immediate: true });
onBeforeUnmount(() => { ++recipientRequest; });
</script>

<template>
  <section class="sharing-manager" :aria-label="recipe !== undefined ? 'Manage recipe access' : 'Manage collection access'">
    <p v-if="recipe !== undefined">
      These cooks have direct access to this recipe and its cooking history.
      Access through shared collections is managed separately. Revoking direct
      access preserves any access through a collection or personal save.
    </p>
    <h4>{{ recipe !== undefined ? "Shared directly with" : "Shared with" }}</h4>
    <p v-if="loadingRecipients" role="status">Loading recipients…</p>
    <div v-else-if="recipientError">
      <p role="alert">{{ recipientError }}</p>
      <button type="button" :disabled="busy" @click="loadRecipients">Retry recipients</button>
    </div>
    <template v-else-if="recipientsLoaded">
      <p v-if="sortedRecipients.length === 0" class="empty-recipients">
        {{ recipe !== undefined ? "No direct recipients yet." : "Not shared with anyone yet." }}
      </p>
      <ul v-else class="recipient-list" role="list">
        <li v-for="recipient in sortedRecipients" :key="recipient.user">
          <span dir="auto">@{{ recipient.username }}</span>
          <button
            type="button"
            class="revoke-button"
            :disabled="busy || loadingRecipients"
            :aria-label="`Revoke access for @${recipient.username}`"
            @click="updateAccess('revoke', recipient)"
          >{{ revoking === recipient.user ? "Revoking…" : "Revoke access" }}</button>
        </li>
      </ul>
    </template>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <form @submit.prevent="updateAccess('share')">
      <fieldset :disabled="busy || loadingRecipients">
        <legend>Share with another cook</legend>
        <label :for="'share-username-' + (recipe ?? collection)">Registered username</label>
        <input :id="'share-username-' + (recipe ?? collection)" v-model="username" required />
        <button type="submit" class="share-button">
          {{ busy && !revoking ? "Sharing…" : recipe !== undefined ? "Share recipe" : "Share collection" }}
        </button>
      </fieldset>
    </form>
  </section>
</template>

<style scoped>
.sharing-manager { margin-top: 16px; }
.recipient-list { list-style: none; margin: 12px 0 20px; padding: 0; }
.recipient-list li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; margin: 0; border-bottom: 1px solid var(--border); }
.recipient-list li > span { min-width: 0; overflow-wrap: anywhere; }
.empty-recipients { color: var(--green-ink); }
.revoke-button { color: var(--error); border-color: var(--error); }
.revoke-button:hover:not(:disabled) { background: var(--error-soft); border-color: var(--error); }
.share-button:hover:not(:disabled) { color: var(--green-ink); background: var(--green-soft); border-color: var(--green); }
</style>
