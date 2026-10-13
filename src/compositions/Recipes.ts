import {
    endpoint,
    receive,
    respond,
} from "@mit-sdg/sync-engine/boundary";
import {
    each,
    former,
    no,
    where,
    whether,
} from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const {
    Sessioning,
    Sharing,
    RecipeRecording,
    Collecting,
    CookingLog,
 } = concepts;

/**
 * Accept a session token or null when the HTTP cookie is missing.
 * Sessioning checks whether the token is valid.
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
 * Save an original recipe in a collection accessible to the signed-in user.
 */
const SaveRecipe = endpoint(
    "/recipes/save",
    ({
        session,
        collection,
        title,
        ingredients,
        instructions,
        source,
        user,
        recipe,
    }) =>
        receive({
            session,
            collection,
            title,
            ingredients,
            instructions,
            source,
        })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorize({ user, resource: collection }))
        .then(
            RecipeRecording.record({
                title,
                ingredients,
                instructions,
                source,
            }).responds({ recipe })
        )
        .then(Collecting.add({ collection, item: recipe }))
        .then(respond({ recipe })),
    {
        input: {
            required: [
                "session",
                "collection",
                "title",
                "ingredients",
                "instructions",
            ],
            defaults: {
                source: "",
            },
        },
        validators: {
            /**
             * Check incoming JSON types before concept methods use string/array
             * operations. The concept checks nonblank and nonempty requirements.
             */
            input: (value: unknown) => {
                if (!hasSessionInput(value)) {
                    return { ok: false };
                }

                const input = value;

                const isStringArray = (items: unknown): items is string[] =>
                    Array.isArray(items) &&
                    items.every((item) => typeof item === "string");

                return {
                    ok:
                        typeof input.collection === "string" &&
                        typeof input.title === "string" &&
                        isStringArray(input.ingredients) &&
                        isStringArray(input.instructions) &&
                        (input.source === undefined ||
                        typeof input.source === "string"),
                };
            },
        },
    }
);

/**
 * Combine an original recipe with its cooking history.
 * Collection membership is required before any details are returned.
 */
const recipeDetails = former(
  "the recipe (recipe) in collection (collection)",
  (
    { collection, recipe },
    {
      title,
      ingredients,
      instructions,
      source,
      entry,
      author,
      changes,
      result,
      createdAt,
    }
  ) =>
    where(
        Collecting._items({ collection }).is({ item: recipe }),
        RecipeRecording._get({ recipe }).is({
            title,
            ingredients,
            instructions,
        }),
        whether(RecipeRecording._get({ recipe }).is({ source }))
    ).form({
        recipe,
        title,
        ingredients,
        instructions,
        source,
        entries: each(
            CookingLog._forRecipe({ recipe }).is({
                _id: entry,
                author,
                changes,
                result,
                createdAt,
            })
        ).form({
            entry,
            author,
            changes,
            result,
            createdAt,
        }),
    })
).optional();

/**
 * Retrieve a recipe after checking the signed-in user's collection access.
 */
const GetRecipe = endpoint(
    "/recipes/get",
    ({ session, collection, recipe, user }) =>
        receive({ session, collection, recipe })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(Sharing.authorize({ user, resource: collection }))
            .then(
                respond({
                    recipe: recipeDetails({ collection, recipe }),
                })
            ),
    {
        validators: {
            input: (value: unknown) => ({
                ok:
                    hasSessionInput(value) &&
                    typeof value.collection === "string" &&
                    typeof value.recipe === "string",
            }),
        },
    }
);

/**
 * Record a cooking attempt for a recipe in an accessible collection.
 * The session determines the entry's author.
 */
const AddCookingEntry = endpoint(
    "/entries/add",
    ({ session, collection, recipe, changes, result, user, entry }) =>
    receive({ session, collection, recipe, changes, result })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorize({ user, resource: collection }))
        .then(
            where(Collecting._items({ collection }).is({ item: recipe }))
                .then(
                    CookingLog.record({
                        author: user,
                        recipe,
                        changes,
                        result,
                    }).responds({ entry })
                )
                .then(respond({ entry }))
                .named("recipe-in-collection"),

                where(no(Collecting._items({ collection }).is({ item: recipe })))
                    .then(respond({ error: "RECIPE_NOT_IN_COLLECTION" }))
                    .named("recipe-not-in-collection")
        ),
    {
        validators: {
            input: (value: unknown) => {
                if (!hasSessionInput(value)) {
                    return { ok: false };
                }

                const input = value;

                return {
                    ok:
                        typeof input.collection === "string" &&
                        typeof input.recipe === "string" &&
                        typeof input.changes === "string" &&
                        typeof input.result === "string",
                };
            },
        },
    }
);

/**
 * Edit an entry associated with a recipe in an accessible collection.
 * CookingLog enforces that only the original author can edit it.
 */
const EditCookingEntry = endpoint(
    "/entries/edit",
    ({ session, collection, recipe, entry, changes, result, user }) =>
        receive({ session, collection, recipe, entry, changes, result })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorize({ user, resource: collection }))
        .then(
            where(
                Collecting._items({ collection }).is({ item: recipe }),
                CookingLog._get({ entry }).is({ recipe })
            )
                .then(
                    CookingLog.edit({
                        author: user,
                        entry,
                        changes,
                        result,
                    })
                )
                .then(respond({ entry }))
                .named("entry-in-collection"),

            where(no(Collecting._items({ collection }).is({ item: recipe })))
                .then(respond({ error: "RECIPE_NOT_IN_COLLECTION" }))
                .named("recipe-not-in-collection"),

            where(
                Collecting._items({ collection }).is({ item: recipe }),
                no(CookingLog._get({ entry }).is({ recipe }))
            )
                .then(respond({ error: "ENTRY_NOT_IN_RECIPE" }))
                .named("entry-not-in-recipe")
        ),
    {
        validators: {
            input: (value: unknown) => {
                if (!hasSessionInput(value)) {
                    return { ok: false };
                }

                const input = value;

                return {
                    ok:
                        typeof input.collection === "string" &&
                        typeof input.recipe === "string" &&
                        typeof input.entry === "string" &&
                        typeof input.changes === "string" &&
                        typeof input.result === "string",
                };
            },
        },
    }
);

export const composition = {
    SaveRecipe,
    GetRecipe,
    RecipeDetails: recipeDetails,
    AddCookingEntry,
    EditCookingEntry,
};
