<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import { api, ApiError } from "../api";
import UserAvatar from "./UserAvatar.vue";
import ReturnButton from "./ReturnButton.vue";
import ProfilePictureCropper from "./ProfilePictureCropper.vue";

const props = defineProps<{ backLabel?: string }>();

const emit = defineEmits<{
  back: [];
  signedOut: [];
  sessionExpired: [];
  saved: [profile: { displayName: string; picture: string }];
}>();
const loading = ref(true);
const loaded = ref(false);
const saving = ref(false);
const cropFile = shallowRef<File | null>(null);
const signingOut = ref(false);
const username = ref("");
const displayName = ref("");
const bio = ref("");
const picture = ref("");
const error = ref("");
const notice = ref("");
const saved = ref("");
const fileInput = ref<HTMLInputElement | null>(null);
const draft = computed(() => JSON.stringify({ displayName: displayName.value, bio: bio.value, picture: picture.value }));
const dirty = computed(() => loaded.value && saved.value !== draft.value);
const busy = computed(() => loading.value || saving.value || cropFile.value !== null || signingOut.value);

function reportError(cause: unknown) {
  if (cause instanceof ApiError && cause.code === "UNAUTHORIZED") { emit("sessionExpired"); return; }
  const messages: Record<string, string> = {
    INVALID_REQUEST: "Use a name of 1–80 characters, a bio up to 500 characters, and a supported picture.",
    INVALID_INPUT: "Please check the profile fields and try again.",
    CONFLICT: "Your profile was saved elsewhere. Return to your profile to reload it before trying again.",
  };
  error.value = cause instanceof ApiError
    ? messages[cause.code] ?? "Could not save or load your profile. Please try again."
    : "Could not connect. Check that the backend is running.";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const response = await api["/profiles/me"]({});
    if ("error" in response) throw new ApiError(String(response.error));
    if (!response.identity) { error.value = "Your account could not be found."; return; }
    username.value = response.identity.username;
    displayName.value = response.identity.profile?.displayName ?? username.value;
    bio.value = response.identity.profile?.bio ?? "";
    picture.value = response.identity.profile?.picture ?? "";
    saved.value = draft.value;
    loaded.value = true;
  } catch (cause) { reportError(cause); }
  finally { loading.value = false; }
}

function selectPicture(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || busy.value) return;
  error.value = notice.value = "";
  cropFile.value = file;
  input.value = "";
}

async function closeCrop() {
  cropFile.value = null;
  await nextTick();
  fileInput.value?.focus();
}

function pictureSelected(selected: string) {
  picture.value = selected;
  notice.value = "Picture updated in your preview. Save your profile to keep the change.";
  void closeCrop();
}

function removePicture() {
  picture.value = "";
  notice.value = "";
  if (fileInput.value) fileInput.value.value = "";
}

async function save() {
  if (busy.value) return;
  if (!displayName.value.trim()) { error.value = "Enter a display name."; return; }
  saving.value = true;
  error.value = notice.value = "";
  try {
    const response = await api["/profiles/save"]({ displayName: displayName.value.trim(), bio: bio.value, picture: picture.value });
    if ("error" in response) throw new ApiError(String(response.error));
    const profile = response.identity?.profile;
    if (!profile || profile.displayName === null || profile.bio === null || profile.picture === null) {
      throw new Error("Missing saved profile");
    }
    displayName.value = profile.displayName;
    bio.value = profile.bio;
    picture.value = profile.picture;
    saved.value = draft.value;
    notice.value = "Profile saved. Your name and picture will appear beside your cooking entries.";
    emit("saved", { displayName: profile.displayName, picture: profile.picture });
  } catch (cause) { reportError(cause); }
  finally { saving.value = false; }
}

function mayLeave() { return !dirty.value || window.confirm("Discard your unsaved profile changes?"); }
function back() { if (!busy.value && mayLeave()) emit("back"); }
async function logout() {
  if (busy.value || !mayLeave()) return;
  signingOut.value = true;
  error.value = "";
  try {
    const response = await api.sessions.end({});
    if ("error" in response) throw new ApiError(String(response.error));
    emit("signedOut");
  } catch { error.value = "Could not sign out. Please try again."; }
  finally { signingOut.value = false; }
}
function beforeUnload(event: BeforeUnloadEvent) {
  if (dirty.value) { event.preventDefault(); event.returnValue = ""; }
}
onMounted(() => { void load(); window.addEventListener("beforeunload", beforeUnload); });
onBeforeUnmount(() => window.removeEventListener("beforeunload", beforeUnload));
</script>

<template>
  <section aria-labelledby="profile-heading">
    <ReturnButton :disabled="busy" @click="back">{{ props.backLabel ?? "Return to Batch" }}</ReturnButton>
    <h2 id="profile-heading">Your profile</h2>
    <p v-if="loading" role="status">Loading profile…</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <button v-if="!loaded && !loading" type="button" @click="load">Try again</button>
    <form v-if="loaded" @submit.prevent="save">
      <fieldset :disabled="busy">
        <legend>How other cooks see you</legend>
        <div class="profile-preview">
          <UserAvatar :name="displayName || username" :picture="picture" large />
          <div><strong dir="auto">{{ displayName || username }}</strong><p dir="auto">@{{ username }}</p></div>
        </div>
        <label for="profile-picture">Profile picture</label>
        <input id="profile-picture" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="picture-help" @change="selectPicture" />
        <p id="picture-help">JPEG, PNG or WebP, up to 5 MB. Choose a picture, then drag and zoom to crop it. Save your profile to keep the change.</p>
        <button v-if="picture" type="button" @click="removePicture">Remove picture</button>
        <label for="display-name">Display name</label>
        <input id="display-name" v-model="displayName" maxlength="80" autocomplete="nickname" dir="auto" required />
        <p>Your username for signing in and sharing remains @{{ username }}.</p>
        <label for="profile-bio">Bio (optional)</label>
        <textarea id="profile-bio" v-model="bio" maxlength="500" rows="4" dir="auto" placeholder="Tell other cooks a little about yourself." />
        <button type="submit">{{ saving ? "Saving…" : "Save profile" }}</button>
      </fieldset>
    </form>
    <footer class="profile-footer">
      <button type="button" :disabled="busy" @click="logout">{{ signingOut ? "Signing out…" : "Sign out" }}</button>
    </footer>
    <ProfilePictureCropper v-if="cropFile" :file="cropFile" @cancel="closeCrop" @selected="pictureSelected" />
  </section>
</template>

<style scoped>
h2 { margin-top: 24px; }
.profile-preview { display: flex; align-items: center; gap: 20px; min-width: 0; }
.profile-preview > div { min-width: 0; overflow-wrap: anywhere; }
.profile-preview p { color: var(--muted); margin: 4px 0 0; }
#picture-help { color: var(--muted); font-size: 0.9rem; }
.profile-footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid var(--border); }
</style>
