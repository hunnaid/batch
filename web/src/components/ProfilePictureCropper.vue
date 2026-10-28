<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import { loadProfilePicture, prepareProfilePicture } from "../profile-picture";
import { MAX_PROFILE_ZOOM, panProfileCrop, profileCrop, type SquareCrop } from "../profile-crop";

const props = defineProps<{ file: File }>();
const emit = defineEmits<{ cancel: []; selected: [picture: string] }>();
const dialog = ref<HTMLDialogElement | null>(null);
const preview = ref<HTMLCanvasElement | null>(null);
const crop = ref<SquareCrop | null>(null);
const loading = ref(true);
const preparing = ref(false);
const zoom = ref(1);
const error = ref("");
const id = useId();
let image: HTMLImageElement | null = null;
let dispose: (() => void) | undefined;
let active = true;
let drag: { pointer: number; x: number; y: number; crop: SquareCrop } | null = null;

function drawPreview() {
  const canvas = preview.value;
  const selection = crop.value;
  if (!canvas || !image || !selection) return;
  const context = canvas.getContext("2d");
  if (!context) { error.value = "Your browser could not display the crop preview."; return; }
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, selection.x, selection.y, selection.size, selection.size, 0, 0, canvas.width, canvas.height);
}

function reset() {
  if (!image || preparing.value) return;
  zoom.value = 1;
  crop.value = profileCrop(image.naturalWidth, image.naturalHeight);
}

function changeZoom(event: Event) {
  if (!image || !crop.value || preparing.value) return;
  zoom.value = Number((event.target as HTMLInputElement).value);
  crop.value = profileCrop(image.naturalWidth, image.naturalHeight, zoom.value, {
    x: (crop.value.x + crop.value.size / 2) / image.naturalWidth,
    y: (crop.value.y + crop.value.size / 2) / image.naturalHeight,
  });
}

function startDrag(event: PointerEvent) {
  if (!crop.value || preparing.value || event.button !== 0 || !event.isPrimary) return;
  const target = event.currentTarget as HTMLElement;
  target.focus({ preventScroll: true });
  target.setPointerCapture(event.pointerId);
  drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, crop: { ...crop.value } };
  event.preventDefault();
}

function moveDrag(event: PointerEvent) {
  if (!drag || drag.pointer !== event.pointerId || !image || !preview.value || preparing.value) return;
  crop.value = panProfileCrop(image.naturalWidth, image.naturalHeight, drag.crop,
    event.clientX - drag.x, event.clientY - drag.y, preview.value.getBoundingClientRect().width);
}

function endDrag(event: PointerEvent) {
  if (drag?.pointer === event.pointerId) drag = null;
}

function moveWithKeyboard(event: KeyboardEvent) {
  if (!image || !crop.value || preparing.value || !preview.value) return;
  const direction: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
  };
  const move = direction[event.key];
  if (!move) return;
  event.preventDefault();
  const size = preview.value.getBoundingClientRect().width;
  const step = size * (event.shiftKey ? 0.12 : 0.04);
  crop.value = panProfileCrop(image.naturalWidth, image.naturalHeight, crop.value, move[0] * step, move[1] * step, size);
}

async function usePicture() {
  const source = image;
  const selection = crop.value;
  if (!source || !selection || loading.value || preparing.value) return;
  preparing.value = true;
  error.value = "";
  await nextTick();
  try {
    if (active) emit("selected", prepareProfilePicture(source, selection));
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "Could not prepare this picture.";
  } finally { preparing.value = false; }
}

watch(crop, drawPreview, { flush: "post" });
onMounted(async () => {
  dialog.value?.showModal();
  try {
    const loaded = await loadProfilePicture(props.file);
    if (!active) { loaded.dispose(); return; }
    image = loaded.image;
    dispose = loaded.dispose;
    crop.value = profileCrop(image.naturalWidth, image.naturalHeight);
  } catch (cause) {
    if (active) error.value = cause instanceof Error ? cause.message : "Could not read this picture.";
  } finally {
    if (active) { loading.value = false; await nextTick(); drawPreview(); }
  }
});
onBeforeUnmount(() => {
  active = false;
  dialog.value?.close();
  dispose?.();
});
</script>

<template>
  <dialog ref="dialog" :aria-labelledby="`${id}-title`" :aria-describedby="`${id}-help`"
    :aria-busy="loading || preparing" @cancel.prevent="!preparing && emit('cancel')">
    <h2 :id="`${id}-title`">Crop your picture</h2>
    <p :id="`${id}-help`">Drag the picture to position it, or focus the preview and use the arrow keys. Adjust the zoom to frame your photo.</p>
    <p v-if="loading" role="status">Loading picture…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="!loading && crop">
      <div class="crop-stage" tabindex="0" role="group" aria-label="Circular profile picture preview"
        :aria-describedby="`${id}-help`" :aria-disabled="preparing"
        @pointerdown="startDrag" @pointermove="moveDrag" @pointerup="endDrag"
        @pointercancel="endDrag" @lostpointercapture="endDrag" @keydown="moveWithKeyboard">
        <canvas ref="preview" width="512" height="512" aria-hidden="true" />
      </div>
      <div class="zoom-label">
        <label :for="`${id}-zoom`">Zoom</label>
        <output :for="`${id}-zoom`">{{ zoom.toFixed(2) }}×</output>
      </div>
      <input :id="`${id}-zoom`" class="zoom-slider" type="range" min="1" :max="MAX_PROFILE_ZOOM" step="0.01"
        :value="zoom" :disabled="preparing" @input="changeZoom" />
      <button type="button" :disabled="preparing" @click="reset">Reset crop</button>
      <p class="save-help">Use picture updates your preview. Save your profile afterward to keep the change.</p>
    </template>
    <div class="dialog-actions">
      <button type="button" autofocus :disabled="preparing" @click="emit('cancel')">Cancel</button>
      <button type="button" class="button-primary" :disabled="loading || preparing || !crop || !!error" @click="usePicture">
        {{ preparing ? "Preparing…" : "Use picture" }}
      </button>
    </div>
  </dialog>
</template>

<style scoped>
dialog { width: min(480px, calc(100% - 32px)); max-height: calc(100dvh - 32px); margin: auto; padding: 28px; overflow-y: auto; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 16px; box-shadow: 0 16px 48px rgb(41 47 41 / 20%); }
dialog::backdrop { background: rgb(41 47 41 / 45%); }
h2 { margin-bottom: 12px; font-size: 1.7rem; }
.crop-stage { width: min(100%, 280px); aspect-ratio: 1; margin: 20px auto; border-radius: 50%; overflow: hidden; border: 1px solid var(--border); cursor: grab; touch-action: none; user-select: none; }
.crop-stage:active { cursor: grabbing; }
.crop-stage:focus-visible { outline: 3px solid var(--focus); outline-offset: 4px; }
.crop-stage canvas { display: block; width: 100%; height: 100%; pointer-events: none; }
.zoom-label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.zoom-label label { margin: 0; }
.zoom-label output, .save-help { color: var(--muted); font-size: 0.85rem; }
.zoom-slider { padding: 0; border: 0; border-radius: 0; accent-color: var(--green-ink); }
.dialog-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 12px; margin-top: 24px; }

@media (max-width: 480px) {
  dialog { padding: 24px 20px; }
  .dialog-actions > button { flex: 1; }
}
</style>
