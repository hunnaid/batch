import {
    conceptSet,
    registerConcept,
} from "@mit-sdg/sync-engine/assembly";

import spec from "@design/concepts/RecipeRecording.md" with {type: "text"};

import {
    InvalidRecipe,
    RecipeRecordingConcept,
} from "./concepts/RecipeRecording.ts";

import authenticationSpec from "@design/concepts/PasswordAuthenticating.md" with { type: "text" };

import {
  InvalidCredentials,
  InvalidRegistration,
  PasswordAuthenticatingConcept,
  UsernameTaken,
} from "./concepts/PasswordAuthenticating.ts";

import collectingSpec from "@design/concepts/Collecting.md" with { type: "text" };

import {
    CollectingConcept,
    CollectionNotFound,
    InvalidCollectionName,
    ItemAlreadyCollected,
    InvalidCollectionRename,
    RenameCollectionNotFound,
    DeleteCollectionNotFound,
} from "./concepts/Collecting.ts";

import cookingLogSpec from "@design/concepts/CookingLog.md" with { type: "text" };

import {
    CookingEntryNotFound,
    CookingEntryNotOwned,
    CookingLogConcept,
    InvalidCookingEntry,
    InvalidCookingEntryEdit,
} from "./concepts/CookingLog.ts";

import sharingSpec from "@design/concepts/Sharing.md" with { type: "text" };

import {
    AccessDenied,
    CannotGrantOwner,
    CannotRevokeOwner,
    GrantNotOwner,
    GrantResourceNotFound,
    MemberAlreadyAdded,
    MemberNotAdded,
    ResourceAlreadyInitialized,
    RevokeNotOwner,
    RevokeResourceNotFound,
    SharingConcept,
    OwnerAccessRequired,
    CannotUninitializeResource,
} from "./concepts/Sharing.ts";

import sessioningSpec from "@design/concepts/Sessioning.md" with { type: "text" };

import {
    InvalidSession,
    SessioningConcept,
} from "./concepts/Sessioning.ts";

/**
 * Connect the implementation to its specification and declared refusal.
 */
const recipeRecording = registerConcept({
    class: RecipeRecordingConcept,
    spec,
    refusals: {
        INVALID_RECIPE: InvalidRecipe,
    },
});

/**
 * Register account behavior and its declared refusals.
 */
const passwordAuthenticating = registerConcept({
  class: PasswordAuthenticatingConcept,
  spec: authenticationSpec,
  refusals: {
    INVALID_REGISTRATION: InvalidRegistration,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
  },
});

/**
 * Connect collection behavior to its specification and declared refusals.
 */
const collecting = registerConcept({
    class: CollectingConcept,
    spec: collectingSpec,
    refusals: {
        INVALID_COLLECTION_NAME: InvalidCollectionName,
        COLLECTION_NOT_FOUND: CollectionNotFound,
        ITEM_ALREADY_COLLECTED: ItemAlreadyCollected,
        INVALID_COLLECTION_RENAME: InvalidCollectionRename,
        RENAME_COLLECTION_NOT_FOUND: RenameCollectionNotFound,
        DELETE_COLLECTION_NOT_FOUND: DeleteCollectionNotFound,
    },
});

/**
 * Connect cooking entries to their specification and declared refusals.
 */
const cookingLog = registerConcept({
    class: CookingLogConcept,
    spec: cookingLogSpec,
    refusals: {
        INVALID_COOKING_ENTRY: InvalidCookingEntry,
        COOKING_ENTRY_NOT_FOUND: CookingEntryNotFound,
        COOKING_ENTRY_NOT_OWNED: CookingEntryNotOwned,
        INVALID_COOKING_ENTRY_EDIT: InvalidCookingEntryEdit,
    },
});

/**
 * Connect ownership and membership behavior to its specification.
 */
const sharing = registerConcept({
    class: SharingConcept,
    spec: sharingSpec,
    refusals: {
        RESOURCE_ALREADY_INITIALIZED: ResourceAlreadyInitialized,
        GRANT_RESOURCE_NOT_FOUND: GrantResourceNotFound,
        GRANT_NOT_OWNER: GrantNotOwner,
        CANNOT_GRANT_OWNER: CannotGrantOwner,
        MEMBER_ALREADY_ADDED: MemberAlreadyAdded,
        REVOKE_RESOURCE_NOT_FOUND: RevokeResourceNotFound,
        REVOKE_NOT_OWNER: RevokeNotOwner,
        CANNOT_REVOKE_OWNER: CannotRevokeOwner,
        MEMBER_NOT_ADDED: MemberNotAdded,
        ACCESS_DENIED: AccessDenied,
        OWNER_ACCESS_REQUIRED: OwnerAccessRequired,
        CANNOT_UNINITIALIZE_RESOURCE: CannotUninitializeResource,
    },
});

/**
 * Connect session behavior to its specification and declared refusal.
 */
const sessioning = registerConcept({
    class: SessioningConcept,
    spec: sessioningSpec,
    refusals: {
        INVALID_SESSION: InvalidSession,
    },
});

/**
 * Declare the concepts available to the application.
 */
export const applicationConceptSet = conceptSet({
    RecipeRecording: recipeRecording,
    PasswordAuthenticating: passwordAuthenticating,
    Collecting: collecting,
    CookingLog: cookingLog,
    Sharing: sharing,
    Sessioning: sessioning,
});

export const { concepts } = applicationConceptSet;
