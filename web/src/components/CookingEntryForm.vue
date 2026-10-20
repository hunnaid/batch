<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";

const props = defineProps<{
  collection?: string;
  directShared?: boolean;
  recipe: string;
  entry?: string;
  initialChanges?: string;
  initialResult?: string;
}>();

const emit = defineEmits<{
  saved: [];
  cancel: [];
  sessionExpired: [];
}>();

const changes = ref(props.initialChanges ?? "");
const result = ref(props.initialResult ?? "");
const busy = ref(false);
const error = ref("");

/** Create an attempt or update the selected entry's text. */
async function save() {
  if (busy.value) return;

  if (!changes.value.trim() && !result.value.trim()) {
    error.value = "Describe a change, a result, or both.";
    return;
  }

  busy.value = true;
  error.value = "";

  try {
    const input = {
      recipe: props.recipe,
      changes: changes.value,
      result: result.value,
    };

    // Use the same access path as the recipe screen.
    const response = props.directShared
      ? (props.entry
          ? await api["/entries/edit-shared"]({ ...input, entry: props.entry })
          : await api["/entries/add-shared"](input))
      : props.collection !== undefined
      ? (
          props.entry
            ? await api.entries.edit({
                ...input,
                collection: props.collection,
                entry: props.entry,
              })
            : await api.entries.add({
                ...input,
                collection: props.collection,
              })
        )
      : (
          props.entry
            ? await api["/entries/edit-personal"]({
                ...input,
                entry: props.entry,
              })
            : await api["/entries/add-personal"](input)
        );

    if ("error" in response) {
      throw new ApiError(String(response.error));
    }

    emit("saved");
  } catch (cause) {
    if (cause instanceof ApiError) {
      if (cause.code === "UNAUTHORIZED") {
        emit("sessionExpired");
        return;
      }

      const messages: Record<string, string> = {
        INVALID_REQUEST: "Describe a change, a result, or both.",
        INVALID_INPUT: "Check the entry fields.",
        FORBIDDEN: "You do not have permission to save this entry.",
        NOT_FOUND: "The recipe or entry is no longer available.",
      };

      error.value =
        messages[cause.code] ?? "Could not save. Please try again.";
    } else {
      error.value = "Could not save. Please try again.";
    }
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form @submit.prevent="save">
    <h3>{{ entry ? "Edit cooking entry" : "New cooking entry" }}</h3>

    <fieldset :disabled="busy">
      <label for="entry-changes">Changes</label>
      <textarea
        id="entry-changes"
        v-model="changes"
        rows="4"
        dir="auto"
        placeholder="Substitutions, quantities, or cooking times…"
      ></textarea>

      <label for="entry-result">Result</label>
      <textarea
        id="entry-result"
        v-model="result"
        rows="4"
        dir="auto"
        placeholder="How did it turn out?"
      ></textarea>

      <p>You can leave the result empty and add it after cooking.</p>

      <button type="submit">
        {{ busy ? "Saving…" : "Save entry" }}
      </button>

      <button type="button" @click="emit('cancel')">
        Cancel
      </button>
    </fieldset>

    <p v-if="error" role="alert">{{ error }}</p>
  </form>
</template>
