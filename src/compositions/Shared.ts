import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, no, view, where, whether } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { isRecipeContent } from "../recipe-content.ts";
import { composition as recipes } from "./Recipes.ts";

const {
    Sessioning, Sharing, RecipeSharing, Collecting,
    RecipeRecording, CookingLog, Saving, PasswordAuthenticating,
} = concepts;

/** Validate the session and text inputs before invoking concept actions. */
function inputWith(...fields: string[]) {
    return (value: unknown) => {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return { ok: false };
        }
        const input = value as Record<string, unknown>;
        return {
            ok: (input.session === null || typeof input.session === "string") &&
                fields.every((field) => typeof input[field] === "string"),
        };
    };
}

const recipeOwner = view(
    "(user) owns direct sharing of (recipe)",
    ({ user, recipe }) => where(RecipeSharing._get({ resource: recipe }).is({ owner: user }))
).holds();

/** Before direct sharing existed, only recipe creation produced personal saves. */
const legacyRecipeOwner = view(
    "(user) personally saved (recipe) before direct ownership existed",
    ({ user, recipe }) => where(
        Saving._forUser({ user }).is({ item: recipe }),
        RecipeRecording._get({ recipe }),
        no(RecipeSharing._get({ resource: recipe }))
    )
).holds();

/** Return only resources shared with members and visible to this user. */
const sharedOverview = former(
    "the shared collections and individual recipes of (user)",
    ({ user }, { collection, owner, name, recipe, title }) => form({
        collections: each(Sharing._shared({ user }).is({ resource: collection, owner }))
            .where(Collecting._get({ collection }).is({ name }))
            .form({
                collection, owner, name,
                recipes: each(Collecting._items({ collection }).is({ item: recipe }))
                    .where(RecipeRecording._get({ recipe }).is({ title }))
                    .form({ recipe, title }),
            }),
        recipes: each(RecipeSharing._shared({ user }).is({ resource: recipe, owner }))
            .where(RecipeRecording._get({ recipe }).is({ title }))
            .form({ recipe, owner, title }),
    })
);

const ListShared = endpoint(
    "/shared/list",
    ({ session, user }) => receive({ session })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(respond({ overview: sharedOverview({ user }) })),
    { validators: { input: inputWith() } }
);

/** Expose only whether this signed-in user may manage direct recipe sharing. */
const RecipeSharingStatus = endpoint(
    "/recipes/sharing-status",
    ({ session, recipe, user }) => receive({ session, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            where(recipeOwner({ user, recipe }))
                .then(respond({ canManage: true })).named("owner"),
            where(legacyRecipeOwner({ user, recipe }))
                .then(respond({ canManage: true })).named("legacy-owner"),
            where(no(recipeOwner({ user, recipe })), no(legacyRecipeOwner({ user, recipe })))
                .then(respond({ canManage: false })).named("not-owner")
        ),
    { validators: { input: inputWith("recipe") } }
);

const recipeRecipients = former(
    "the direct recipients of recipe (recipe)",
    ({ recipe }, { member, username }) => form({
        recipients: each(RecipeSharing._members({ resource: recipe }).is({ member }))
            .where(PasswordAuthenticating._byUser({ user: member }).is({ username }))
            .form({ user: member, username }),
    })
);

/** A legacy owner can inspect an empty list without a read creating sharing records. */
const ListRecipeRecipients = endpoint(
    "/recipes/recipients",
    ({ session, recipe, user }) => receive({ session, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            where(legacyRecipeOwner({ user, recipe }))
                .then(respond({ sharing: recipeRecipients({ recipe }) })).named("legacy-owner"),
            where(no(legacyRecipeOwner({ user, recipe })))
                .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
                .then(respond({ sharing: recipeRecipients({ recipe }) })).named("existing-owner")
        ),
    { validators: { input: inputWith("recipe") } }
);

/** Establish ownership for a pre-existing personal recipe without granting access. */
const PrepareRecipeSharing = endpoint(
    "/recipes/prepare-sharing",
    ({ session, recipe, user }) => receive({ session, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Saving.authorize({ user, item: recipe }))
        .then(
            where(legacyRecipeOwner({ user, recipe }))
                .then(RecipeSharing.initialize({ resource: recipe, owner: user }))
                .then(respond({ recipe })).named("initialize-legacy-owner"),
            where(no(legacyRecipeOwner({ user, recipe })))
                .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
                .then(respond({ recipe })).named("existing-owner")
        ),
    { validators: { input: inputWith("recipe") } }
);

/** Direct access can be granted only by its established owner. */
const ShareRecipe = endpoint(
    "/recipes/share",
    ({ session, recipe, username, user, member }) => receive({ session, recipe, username })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
        .then(
            where(PasswordAuthenticating._byUsername({ username }).is({ user: member }))
                .then(RecipeSharing.grant({ owner: user, resource: recipe, member }))
                .then(respond({ recipe })).named("registered-recipient"),
            where(no(PasswordAuthenticating._byUsername({ username })))
                .then(respond({ error: "RECIPIENT_NOT_FOUND" })).named("unknown-recipient")
        ),
    { validators: { input: inputWith("recipe", "username") } }
);

const RevokeRecipeAccess = endpoint(
    "/recipes/revoke",
    ({ session, recipe, username, user, member }) => receive({ session, recipe, username })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
        .then(
            where(PasswordAuthenticating._byUsername({ username }).is({ user: member }))
                .then(RecipeSharing.revoke({ owner: user, resource: recipe, member }))
                .then(respond({ recipe })).named("registered-recipient"),
            where(no(PasswordAuthenticating._byUsername({ username })))
                .then(respond({ error: "RECIPIENT_NOT_FOUND" })).named("unknown-recipient")
        ),
    { validators: { input: inputWith("recipe", "username") } }
);

/** Direct and collection access expose the same original recipe and cooking entries. */
const directRecipeDetails = former(
    "the directly shared recipe (recipe) accessible to (user)",
    ({ user, recipe }, { title, ingredients, instructions, source, notes, description, entry, author, changes, result, createdAt }) =>
        where(
            RecipeSharing._accessible({ user }).is({ resource: recipe }),
            RecipeRecording._get({ recipe }).is({ title, ingredients, instructions }),
            whether(RecipeRecording._get({ recipe }).is({ source })),
            whether(RecipeRecording._get({ recipe }).is({ notes })),
            whether(RecipeRecording._get({ recipe }).is({ description }))
        ).form({
            recipe, title, ingredients, instructions, source, notes, description,
            entries: each(CookingLog._forRecipe({ recipe }).is({
                _id: entry, author, changes, result, createdAt,
            })).form({ entry, author, changes, result, createdAt }),
        })
).optional();

const GetSharedRecipe = endpoint(
    "/recipes/get-shared",
    ({ session, recipe, user }) => receive({ session, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(RecipeSharing.authorize({ user, resource: recipe }))
        .then(respond({ recipe: directRecipeDetails({ user, recipe }) })),
    { validators: { input: inputWith("recipe") } }
);

const AddSharedCookingEntry = endpoint(
    "/entries/add-shared",
    ({ session, recipe, changes, result, user, entry }) => receive({ session, recipe, changes, result })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(RecipeSharing.authorize({ user, resource: recipe }))
        .then(CookingLog.record({ author: user, recipe, changes, result }).responds({ entry }))
        .then(respond({ entry })),
    { validators: { input: inputWith("recipe", "changes", "result") } }
);

const EditSharedCookingEntry = endpoint(
    "/entries/edit-shared",
    ({ session, recipe, entry, changes, result, user }) => receive({ session, recipe, entry, changes, result })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(RecipeSharing.authorize({ user, resource: recipe }))
        .then(
            where(recipes.EntryInRecipe({ entry, recipe }))
                .then(CookingLog.edit({ author: user, entry, changes, result }))
                .then(respond({ entry })).named("entry-in-recipe"),
            where(no(recipes.EntryInRecipe({ entry, recipe })))
                .then(respond({ error: "ENTRY_NOT_IN_RECIPE" })).named("entry-not-in-recipe")
        ),
    { validators: { input: inputWith("recipe", "entry", "changes", "result") } }
);

/** Update the same original recipe through direct ownership or an eligible legacy save. */
const EditRecipe = endpoint(
    "/recipes/edit",
    ({ session, recipe, title, ingredients, instructions, source, notes, description, user }) =>
        receive({ session, recipe, title, ingredients, instructions, source, notes, description })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(
                where(legacyRecipeOwner({ user, recipe }))
                    .then(RecipeRecording.edit({ recipe, title, ingredients, instructions, source, notes, description }))
                    .then(respond({ recipe })).named("legacy-owner"),
                where(no(legacyRecipeOwner({ user, recipe })))
                    .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
                    .then(RecipeRecording.edit({ recipe, title, ingredients, instructions, source, notes, description }))
                    .then(respond({ recipe })).named("existing-owner")
            ),
    {
        input: {
            required: ["session", "recipe", "title", "ingredients", "instructions"],
            defaults: { source: "", notes: "", description: "" },
        },
        validators: {
            input: (value: unknown) => {
                if (!inputWith("recipe", "title")(value).ok) return { ok: false };
                const input = value as Record<string, unknown>;
                return { ok: isRecipeContent(input.ingredients) && isRecipeContent(input.instructions) &&
                    [input.source, input.notes, input.description].every((item) =>
                        item === undefined || typeof item === "string") };
            },
        },
    }
);

/** Permanent deletion uses the same ownership rule as direct sharing, including legacy saves. */
const DeleteRecipe = endpoint(
    "/recipes/delete",
    ({ session, recipe, user }) => receive({ session, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            where(legacyRecipeOwner({ user, recipe }))
                .then(RecipeSharing.initialize({ resource: recipe, owner: user }))
                .named("initialize-legacy-owner"),
            where(no(legacyRecipeOwner({ user, recipe })))
                .then(RecipeSharing.authorizeOwner({ user, resource: recipe }))
                .named("existing-owner")
        )
        .then(RecipeRecording.delete({ recipe }))
        .then(Collecting.removeItem({ item: recipe }))
        .then(CookingLog.clearRecipe({ recipe }))
        .then(Saving.removeItem({ item: recipe }))
        .then(RecipeSharing.uninitialize({ resource: recipe, owner: user }))
        .then(respond({ recipe })),
    { validators: { input: inputWith("recipe") } }
);

export const composition = {
    ListShared,
    DeleteRecipe,
    EditRecipe,
    SharedOverview: sharedOverview,
    RecipeOwner: recipeOwner,
    LegacyRecipeOwner: legacyRecipeOwner,
    RecipeSharingStatus,
    ListRecipeRecipients,
    RecipeRecipients: recipeRecipients,
    PrepareRecipeSharing,
    ShareRecipe,
    RevokeRecipeAccess,
    GetSharedRecipe,
    DirectRecipeDetails: directRecipeDetails,
    AddSharedCookingEntry,
    EditSharedCookingEntry,
};
