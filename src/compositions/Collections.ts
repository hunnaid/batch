import {
    each,
    form,
    former,
    no,
    reaction,
    when,
    where,
} from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import {
    endpoint,
    receive,
    respond,
} from "@mit-sdg/sync-engine/boundary";

const {
    Collecting,
    Sharing,
    Sessioning,
    PasswordAuthenticating,
    RecipeRecording,
} = concepts;

/**
 * Accept endpoint input only when it contains a session token or null.
 * The HTTP adapter supplies null when the browser has no session cookie.
 */
function hasSessionInput(
    value: unknown
): value is Record<string, unknown> {
    if (
        typeof value !== "object" ||
        value === null ||
        Array.isArray(value)
    ) {
        return false;
    }

    const input = value as Record<string, unknown>;

    return typeof input.session === "string" || input.session === null;
}

/**
 * Give each newly created collection an owner and an empty membership set.
 */
const InitializeCollectionSharing = reaction(({ creator, collection }) =>
    when(Collecting.create({ creator }).responds({ collection }))
        .then(
        Sharing.initialize({
            resource: collection,
            owner: creator,
        })
    )
);

/**
 * Create a collection using the authenticated user's identity.
 * Wait for sharing initialization before returning success.
 */
const CreateCollection = endpoint(
    "/collections/create",
    ({ session, name, user, collection }) =>
        receive({ session, name })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            Collecting.create({ creator: user, name })
            .responds({ collection })
        )
        .afterFlowSettles()
        .then(Sharing.authorize({ user, resource: collection }))
        .then(respond({ collection })),
    {
        validators: {
            input: (value: unknown) => ({
                ok: hasSessionInput(value) && typeof value.name === "string",
            }),
        },
    }
);

/**
 * Give a registered user access to a collection.
 * Sharing verifies that the signed-in user owns the collection.
 */
const ShareCollection = endpoint(
    "/collections/share",
    ({ session, collection, username, owner, member }) =>
        receive({ session, collection, username })
            .then(Sessioning.resolve({ session }).responds({ user: owner }))
            .then(Sharing.authorize({ user: owner, resource: collection }))
            .then(
        where(
            PasswordAuthenticating._byUsername({ username })
                .is({ user: member })
        )
            .then(
                Sharing.grant({
                    owner,
                    resource: collection,
                    member,
                })
            )
            .then(respond({ collection }))
            .named("registered-recipient"),

            where(no(PasswordAuthenticating._byUsername({ username })))
                .then(respond({ error: "RECIPIENT_NOT_FOUND" }))
                .named("unknown-recipient")
        ),
    {
        validators: {
            input: (value: unknown) => ({
                ok:
                    hasSessionInput(value) &&
                    typeof value.collection === "string" &&
                    typeof value.username === "string",
            }),
        },
    }
);

/**
 * Build the collections screen from resources the user can access.
 * Include recipe identifiers and titles without loading full cooking histories.
 */
const accessibleCollections = former(
    "the accessible collections of (user)",
    ({ user }, { collection, owner, name, recipe, title }) =>
        form({
            collections: each(
                Sharing._accessible({ user }).is({
                    resource: collection,
                    owner,
                })
            )
            .where(Collecting._get({ collection }).is({ name }))
            .form({
                collection,
                owner,
                name,
                recipes: each(
                    Collecting._items({ collection }).is({ item: recipe })
                )
                    .where(RecipeRecording._get({ recipe }).is({ title }))
                    .form({
                        recipe,
                        title,
                    }),
            }),
        })
);

/**
 * List collections using the identity established by the session.
 */
const ListCollections = endpoint(
    "/collections/list",
    ({ session, user }) =>
        receive({ session })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            respond({
                overview: accessibleCollections({ user }),
            })
        ),
    {
        validators: {
            input: (value: unknown) => ({
                ok: hasSessionInput(value),
            }),
        },
    }
);

/**
 * Remove a registered user's access to a collection.
 * Sharing enforces that only the owner can revoke membership.
 */
const RevokeCollectionAccess = endpoint(
    "/collections/revoke",
    ({ session, collection, username, owner, member }) =>
        receive({ session, collection, username })
            .then(Sessioning.resolve({ session }).responds({ user: owner }))
            .then(Sharing.authorize({ user: owner, resource: collection }))
            .then(
                where(
                PasswordAuthenticating._byUsername({ username })
                    .is({ user: member })
                )
                    .then(
                        Sharing.revoke({
                        owner,
                        resource: collection,
                        member,
                        })
                    )
                    .then(respond({ collection }))
                    .named("registered-recipient"),

                where(no(PasswordAuthenticating._byUsername({ username })))
                    .then(respond({ error: "RECIPIENT_NOT_FOUND" }))
                    .named("unknown-recipient")
        ),
    {
        validators: {
            input: (value: unknown) => ({
                ok:
                    hasSessionInput(value) &&
                    typeof value.collection === "string" &&
                    typeof value.username === "string",
            }),
        },
    }
);

/** Rename a collection after verifying the signed-in user owns it. */
const RenameCollection = endpoint(
    "/collections/rename",
    ({ session, collection, name, user }) =>
        receive({ session, collection, name })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorizeOwner({ user, resource: collection }))
        .then(Collecting.rename({ collection, name }))
        .then(respond({ collection })),
    {
        validators: {
            input: (value: unknown) => ({
                ok:
                    hasSessionInput(value) &&
                    typeof value.collection === "string" &&
                    typeof value.name === "string",
            }),
        },
    }
);

/**
 * Remove sharing first, then delete the collection.
 * Recipes and cooking entries remain stored independently.
 */
const DeleteCollection = endpoint(
    "/collections/delete",
    ({ session, collection, user }) =>
        receive({ session, collection })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            Sharing.uninitialize({
                resource: collection,
                owner: user,
            })
        )
        .then(Collecting.delete({ collection }))
        .then(respond({ collection })),
    {
        validators: {
            input: (value: unknown) => ({
                ok:
                hasSessionInput(value) &&
                typeof value.collection === "string",
            }),
        },
    }
);

export const composition = {
    InitializeCollectionSharing,
    CreateCollection,
    ShareCollection,
    ListCollections,
    AccessibleCollections: accessibleCollections,
    RevokeCollectionAccess,
    RenameCollection,
    DeleteCollection,
};
