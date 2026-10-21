import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { former, no, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Profiling, PasswordAuthenticating, Sessioning } = concepts;

function inputWith(...fields: string[]) {
  return (value: unknown) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false };
    const input = value as Record<string, unknown>;
    return { ok: (input.session === null || typeof input.session === "string") &&
      fields.every((field) => typeof input[field] === "string") };
  };
}

const profileDetails = former(
  "the profile of (user)",
  ({ user }, { displayName, bio, picture }) =>
    where(Profiling._get({ user }).is({ displayName, bio, picture }))
      .form({ displayName, bio, picture })
).optional();

/** Existing accounts display their username until they customize their profile. */
const identity = former(
  "the presentation of (user)",
  ({ user }, { username }) =>
    where(PasswordAuthenticating._byUser({ user }).is({ username }))
      .form({ user, username, profile: whether(profileDetails({ user })) })
).optional();

const GetMyProfile = endpoint(
  "/profiles/me",
  ({ session, user }) => receive({ session })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(respond({ identity: identity({ user }) })),
  { validators: { input: inputWith() } }
);

/** Signed-in users can recognize other contributors by their public presentation. */
const GetProfile = endpoint(
  "/profiles/get",
  ({ session, user, viewer }) => receive({ session, user })
    .then(Sessioning.resolve({ session }).responds({ user: viewer }))
    .then(respond({ identity: identity({ user }) })),
  { validators: { input: inputWith("user") } }
);

/** The writable user is always derived from the session, never from submitted profile data. */
const SaveMyProfile = endpoint(
  "/profiles/save",
  ({ session, user, displayName, bio, picture }) => receive({ session, displayName, bio, picture })
    .then(Sessioning.resolve({ session }).responds({ user }))
    .then(
      where(Profiling._get({ user }))
        .then(Profiling.update({ user, displayName, bio, picture }))
        .then(respond({ identity: identity({ user }) })).named("update-profile"),
      where(no(Profiling._get({ user })))
        .then(Profiling.create({ user, displayName, bio, picture }))
        .then(respond({ identity: identity({ user }) })).named("create-profile")
    ),
  { validators: { input: inputWith("displayName", "bio", "picture") } }
);

export const composition = {
  GetMyProfile, GetProfile, SaveMyProfile,
  ProfileDetails: profileDetails, Identity: identity,
};
