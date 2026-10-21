<script setup lang="ts">
import { ref } from "vue";
import { api, ApiError } from "../api";

/** Notify App when login succeeds. */
const emit = defineEmits<{
  authenticated: [user: string];
}>();

const mode = ref<"login" | "register">("login");
const username = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");
const notice = ref("");

/** Register an account or sign in using the entered credentials. */
async function submit() {
  if (busy.value) return;

  busy.value = true;
  error.value = "";
  notice.value = "";

  try {
    const credentials = {
      username: username.value,
      password: password.value,
    };

    if (mode.value === "register") {
      const response = await api.accounts.register(credentials);

      if ("error" in response) {
        throw new ApiError(String(response.error));
      }

      mode.value = "login";
      password.value = "";
      notice.value = "Account created. Enter your password to sign in.";
    } else {
      const response = await api.sessions.start(credentials);

      if ("error" in response) {
        throw new ApiError(String(response.error));
      }

      password.value = "";
      emit("authenticated", response.user);
    }
  } catch (cause) {
    if (cause instanceof ApiError) {
      const messages: Record<string, string> = {
        CONFLICT: "That username is already registered.",
        UNAUTHORIZED: "Incorrect username or password.",
        INVALID_REQUEST: "Enter a nonblank username and password.",
        INVALID_INPUT: "Check the username and password fields.",
        NETWORK_ERROR: "Could not connect. Check that the backend is running.",
      };

      error.value =
        messages[cause.code] ?? "The request failed. Please try again.";
    } else {
      error.value = "Could not connect. Check that the backend is running.";
    }
  } finally {
    busy.value = false;
  }
}

/** Switch forms and clear feedback from the previous attempt. */
function toggleMode() {
  mode.value = mode.value === "login" ? "register" : "login";
  error.value = "";
  notice.value = "";
  password.value = "";
}
</script>

<template>
  <section>
    <h2>{{ mode === "login" ? "Sign in" : "Create an account" }}</h2>

    <form @submit.prevent="submit">
      <fieldset :disabled="busy">
        <label for="username">Username</label>
        <input
          id="username"
          v-model="username"
          autocomplete="username"
          required
        />

        <label for="password">Password</label>
        <input
          id="password"
          v-model="password"
          type="password"
          :autocomplete="
            mode === 'login' ? 'current-password' : 'new-password'
          "
          required
        />

        <button type="submit">
          {{
            busy
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Register"
          }}
        </button>
      </fieldset>
    </form>

    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>

    <button type="button" class="auth-mode-toggle" :disabled="busy" @click="toggleMode">
      {{
        mode === "login"
          ? "Need an account? Register"
          : "Already registered? Sign in"
      }}
    </button>
  </section>
</template>

<style scoped>
.auth-mode-toggle { width: 100%; }
</style>
