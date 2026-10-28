<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { api, ApiError } from "../api";
import type { BatchWireHttp } from "../../../generated/wire";
import RecipeForm from "./RecipeForm.vue";
import { validPastedRecipeInput } from "../../../src/recipe-import-input.ts";

type Draft = BatchWireHttp["/recipes/import-personal"]["output"]["draft"];
const props = defineProps<{ collection?: string }>();
const emit = defineEmits<{ saved: [recipe: string]; cancel: []; sessionExpired: [] }>();
const url = ref("");
const urlInput = ref<HTMLInputElement | null>(null);
const pastedContent = ref("");
const pastedInput = ref<HTMLTextAreaElement | null>(null);
const importing = ref<"url" | "text" | null>(null);
const lastMethod = ref<"url" | "text">("url");
const draft = ref<Draft | null>(null);
const error = ref("");
const errorMethod = ref<"url" | "text" | null>(null);
let controller: AbortController | null = null;
let active = true;

async function importRecipe(method: "url" | "text") {
  if (importing.value) return;
  error.value = "";
  errorMethod.value = method;
  if (method === "url") {
    try {
      const parsed = new URL(url.value.trim());
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
    } catch { error.value = "Enter a complete recipe URL beginning with https:// or http://."; return; }
  } else if (!validPastedRecipeInput(pastedContent.value)) {
    error.value = "Paste the website content first. If the page is too long, paste just its recipe title, ingredients, and instructions.";
    return;
  }
  importing.value = method;
  lastMethod.value = method;
  controller = new AbortController();
  try {
    const options = { signal: controller.signal, timeoutMs: 80_000 };
    const response = method === "url"
      ? props.collection !== undefined
        ? await api["/recipes/import"]({ collection: props.collection, url: url.value.trim() }, options)
        : await api["/recipes/import-personal"]({ url: url.value.trim() }, options)
      : props.collection !== undefined
        ? await api["/recipes/import-text"]({ collection: props.collection, text: pastedContent.value }, options)
        : await api["/recipes/import-text-personal"]({ text: pastedContent.value }, options);
    if (!active) return;
    if ("error" in response) throw new ApiError(String(response.error));
    draft.value = response.draft;
    await nextTick();
    document.getElementById("recipe-title")?.focus();
  } catch (cause) {
    if (!active) return;
    if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") { emit("sessionExpired"); return; }
    const messages: Record<string, string> = {
      INVALID_REQUEST: method === "url"
        ? "Use a public recipe page URL. Local addresses, private links, and unsupported URLs cannot be imported."
        : "The pasted content is empty or too large. Paste the recipe title, ingredients, and instructions and try again.",
      NOT_FOUND: method === "url"
        ? "Batch could not read a complete recipe from that page. The site may require a subscription, block automated access, or have no recipe. You can paste the page content below instead."
        : "A complete recipe could not be found in the pasted content. Include its title, ingredients, and instructions, or enter it manually.",
      FORBIDDEN: "You no longer have access to this collection. Return to the list and refresh.",
      CONFLICT: "The recipe import service is busy or timed out. Nothing has been saved. Try again shortly.",
    };
    error.value = cause instanceof ApiError
      ? messages[cause.code] ?? "Website import is temporarily unavailable. Try again, or return to recipe options to enter it manually."
      : "Could not connect to website import. Try again, or return to recipe options to enter it manually.";
  } finally { if (active) importing.value = null; }
}

async function backToImport() {
  draft.value = null;
  error.value = "";
  await nextTick();
  if (lastMethod.value === "text") pastedInput.value?.focus();
  else urlInput.value?.focus();
}

onMounted(() => urlInput.value?.focus());
onBeforeUnmount(() => { active = false; controller?.abort(); });
</script>

<template>
  <div>
    <template v-if="draft">
      <p class="review-notice" role="status">Recipe imported for review. Check quantities, sections, and instructions before saving. Nothing has been saved yet.</p>
      <RecipeForm :collection="collection" :initial="draft" @saved="emit('saved', $event)"
        @cancel="backToImport" @session-expired="emit('sessionExpired')" />
    </template>
    <div v-else>
      <h3>Import from a website</h3>
      <form @submit.prevent="importRecipe('url')">
        <p>Paste a public recipe page URL. We’ll fill out an editable recipe form for you to review before saving.</p>
        <fieldset :disabled="importing !== null">
          <label for="website-recipe-url">Recipe website URL</label>
          <input id="website-recipe-url" ref="urlInput" v-model="url" type="url" inputmode="url" required
            placeholder="https://example.com/your-recipe" aria-describedby="website-import-help" />
          <p id="website-import-help">Use a public page containing the full ingredients and instructions. Import cannot use your website login or subscription. You can paste content from a page you can access below.</p>
          <button type="submit" class="import-recipe">{{ importing === 'url' ? "Importing…" : "Import recipe" }}</button>
        </fieldset>
        <p v-if="error && errorMethod === 'url'" role="alert">{{ error }}</p>
      </form>

      <p class="import-divider"><span>or</span></p>

      <form @submit.prevent="importRecipe('text')">
        <fieldset :disabled="importing !== null">
          <label for="pasted-website-content">Paste the website content here</label>
          <p id="pasted-content-help">Copy the page's text, including the recipe title, ingredients, and instructions, and paste it below. HTML also works. We'll autofill a recipe form for you to review.</p>
          <textarea id="pasted-website-content" ref="pastedInput" v-model="pastedContent" rows="10" required
            aria-describedby="pasted-content-help" placeholder="Paste the full page text or HTML…" />
          <button type="submit" class="import-recipe">{{ importing === 'text' ? "Autofilling…" : "Autofill recipe" }}</button>
        </fieldset>
        <p v-if="error && errorMethod === 'text'" role="alert">{{ error }}</p>
      </form>

      <p v-if="importing" role="status">Reading the recipe page… We’ll retry once if the service is temporarily overloaded. This may take about a minute.</p>
      <button type="button" @click="emit('cancel')">{{ importing ? "Cancel import" : "Return to recipe options" }}</button>
    </div>
  </div>
</template>

<style scoped>
#website-import-help, #pasted-content-help { margin: 0; color: var(--muted); font-size: 0.85rem; }
.import-divider { display: flex; align-items: center; gap: 16px; margin-block: 28px; color: var(--muted); }
.import-divider::before, .import-divider::after { content: ""; height: 1px; flex: 1; background: var(--border); }
.review-notice { margin-block: 20px; padding: 16px; border: 1px solid var(--border); border-radius: 10px; background: var(--green-soft); }
.import-recipe:hover:not(:disabled) { color: var(--green-ink); background: var(--green-soft); border-color: var(--green); }
</style>
