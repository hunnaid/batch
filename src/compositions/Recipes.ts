import {
    endpoint,
    receive,
    respond,
} from "@mit-sdg/sync-engine/boundary";
import {
    each,
    form,
    former,
    no,
    where,
    whether,
    view,
} from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { recipeInput, sessionInput } from "../input-validation.ts";

const {
    Sessioning,
    Sharing,
    RecipeSharing,
    RecipeRecording,
    Collecting,
    CookingLog,
    Saving,
} = concepts;

/** Test membership using the supplied collection and recipe IDs. */
const recipeInCollection = view(
    "(recipe) belongs to (collection)",
    ({ collection, recipe }) =>
        where(
            Collecting._items({ collection }).is({ item: recipe })
        )
).holds();

/** Test an entry against the supplied recipe ID. */
const entryInRecipe = view(
    "(entry) belongs to (recipe)",
    ({ entry, recipe }) =>
        where(
            CookingLog._get({ entry }).is({ recipe })
        )
).holds();

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
        notes,
        description,
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
            notes,
            description,
        })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorize({ user, resource: collection }))
        .then(
            RecipeRecording.record({
                title,
                ingredients,
                instructions,
                source,
                notes,
                description,
            }).responds({ recipe })
        )
        .then(RecipeSharing.initialize({ resource: recipe, owner: user }))
        .then(Saving.save({ user, item: recipe }))
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
                notes: "",
                description: "",
            },
        },
        validators: { input: recipeInput("collection") },
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
      notes,
      description,
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
        whether(RecipeRecording._get({ recipe }).is({ source })),
        whether(RecipeRecording._get({ recipe }).is({ notes })),
        whether(RecipeRecording._get({ recipe }).is({ description }))
    ).form({
        recipe,
        title,
        ingredients,
        instructions,
        source,
        notes,
        description,
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
        validators: { input: sessionInput("collection", "recipe") },
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
            where(recipeInCollection({ collection, recipe }))
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

            where(no(recipeInCollection({ collection, recipe })))
                .then(respond({ error: "RECIPE_NOT_IN_COLLECTION" }))
                .named("recipe-not-in-collection")
        ),
    {
        validators: { input: sessionInput("collection", "recipe", "changes", "result") },
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
                recipeInCollection({ collection, recipe }),
                entryInRecipe({ entry, recipe })
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

            where(no(recipeInCollection({ collection, recipe })))
                .then(respond({ error: "RECIPE_NOT_IN_COLLECTION" }))
                .named("recipe-not-in-collection"),

            where(
                recipeInCollection({ collection, recipe }),
                no(entryInRecipe({ entry, recipe }))
            )
                .then(respond({ error: "ENTRY_NOT_IN_RECIPE" }))
                .named("entry-not-in-recipe")
        ),
    {
        validators: { input: sessionInput("collection", "recipe", "entry", "changes", "result") },
    }
);

/**
 * Add an existing recipe to another accessible collection.
 * Reuse its identifier so the original details and cooking history stay together.
 */
const AddRecipeToCollection = endpoint(
    "/recipes/add-to-collection",
    ({ session, sourceCollection, destinationCollection, recipe, user }) =>
        receive({
            session,
            sourceCollection,
            destinationCollection,
            recipe,
        })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(
            Sharing.authorize({
                user,
                resource: sourceCollection,
            })
        )
        .then(
            Sharing.authorize({
                user,
                resource: destinationCollection,
            })
        )
        .then(
            where(
                recipeInCollection({
                    collection: sourceCollection,
                    recipe,
                })
            )
                .then(
                    Collecting.add({
                        collection: destinationCollection,
                        item: recipe,
                    })
                )
                .then(
                    respond({
                        recipe,
                        collection: destinationCollection,
                    })
                )
                .named("recipe-in-source"),

            where(
                no(
                    recipeInCollection({
                        collection: sourceCollection,
                        recipe,
                    })
                )
            )
                .then(respond({ error: "RECIPE_NOT_IN_COLLECTION" }))
                .named("recipe-not-in-source")
        ),
    {
        validators: { input: sessionInput("sourceCollection", "destinationCollection", "recipe") },
    }
);

/**
 * Create a recipe in the signed-in user's personal list.
 * Establish direct-sharing ownership without granting anyone else access.
 */
const SavePersonalRecipe = endpoint(
    "/recipes/save-personal",
    ({
        session,
        title,
        ingredients,
        instructions,
        source,
        notes,
        description,
        user,
        recipe,
    }) =>
        receive({
            session,
            title,
            ingredients,
            instructions,
            source,
            notes,
            description,
        })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(
                RecipeRecording.record({
                    title,
                    ingredients,
                    instructions,
                    source,
                    notes,
                    description,
                }).responds({ recipe })
            )
            .then(RecipeSharing.initialize({ resource: recipe, owner: user }))
            .then(Saving.save({ user, item: recipe }))
            .then(respond({ recipe })),
    {
        input: {
            required: [
                "session",
                "title",
                "ingredients",
                "instructions",
            ],
            defaults: {
                source: "",
                notes: "",
                description: "",
            },
        },
        validators: { input: recipeInput() },
    }
);

/**
 * Combine personal saves with recipe titles for the homepage.
 * Merely receiving collection access does not create a personal save.
 */
const personalRecipes = former(
    "the saved recipes of (user)",
    ({ user }, { recipe, title, savedAt }) =>
        form({
            recipes: each(
                Saving._forUser({ user }).is({
                    item: recipe,
                    savedAt,
                })
            )
                .where(
                    RecipeRecording._get({ recipe }).is({ title })
                )
                .form({
                    recipe,
                    title,
                    savedAt,
                }),
        })
);

/** List personal recipes using the identity established by the session. */
const ListMyRecipes = endpoint(
    "/recipes/mine",
    ({ session, user }) =>
        receive({ session })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(
                respond({
                    overview: personalRecipes({ user }),
                })
            ),
    {
        validators: { input: sessionInput() },
    }
);

/**
 * Retrieve a personally saved recipe and its shared cooking history.
 * Both the user and recipe are supplied inputs to this former.
 */
const savedRecipeDetails = former(
    "the saved recipe (recipe) of (user)",
    (
        { user, recipe },
        {
            title,
            ingredients,
            instructions,
            source,
            notes,
            description,
            entry,
            author,
            changes,
            result,
            createdAt,
        }
    ) =>
        where(
            Saving._forUser({ user }).is({ item: recipe }),
            RecipeRecording._get({ recipe }).is({
                title,
                ingredients,
                instructions,
            }),
            whether(
                RecipeRecording._get({ recipe }).is({ source })
            ),
            whether(RecipeRecording._get({ recipe }).is({ notes })),
            whether(RecipeRecording._get({ recipe }).is({ description }))
        ).form({
            recipe,
            title,
            ingredients,
            instructions,
            source,
            notes,
            description,
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
 * Open a recipe from the signed-in user's personal list.
 * Knowing a recipe identifier alone does not grant access.
 */
const GetPersonalRecipe = endpoint(
    "/recipes/get-personal",
    ({ session, recipe, user }) =>
        receive({ session, recipe })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(Saving.authorize({ user, item: recipe }))
            .then(
                respond({
                    recipe: savedRecipeDetails({ user, recipe }),
                })
            ),
    {
        validators: { input: sessionInput("recipe") },
    }
);

/**
 * Record an attempt for a personally saved recipe.
 * The session determines the author.
 */
const AddPersonalCookingEntry = endpoint(
    "/entries/add-personal",
    ({ session, recipe, changes, result, user, entry }) =>
        receive({ session, recipe, changes, result })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(Saving.authorize({ user, item: recipe }))
            .then(
                CookingLog.record({
                    author: user,
                    recipe,
                    changes,
                    result,
                }).responds({ entry })
            )
            .then(respond({ entry })),
    {
        validators: { input: sessionInput("recipe", "changes", "result") },
    }
);

/**
 * Edit an attempt through personal recipe access.
 * The entry must belong to the requested recipe, and CookingLog
 * still requires the signed-in user to be its original author.
 */
const EditPersonalCookingEntry = endpoint(
    "/entries/edit-personal",
    ({ session, recipe, entry, changes, result, user }) =>
        receive({ session, recipe, entry, changes, result })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(Saving.authorize({ user, item: recipe }))
            .then(
                where(entryInRecipe({ entry, recipe }))
                    .then(
                        CookingLog.edit({
                            author: user,
                            entry,
                            changes,
                            result,
                        })
                    )
                    .then(respond({ entry }))
                    .named("entry-in-personal-recipe"),

                where(no(entryInRecipe({ entry, recipe })))
                    .then(respond({ error: "ENTRY_NOT_IN_RECIPE" }))
                    .named("entry-not-in-personal-recipe")
            ),
    {
        validators: { input: sessionInput("recipe", "entry", "changes", "result") },
    }
);

/**
 * Add a personally saved recipe to an accessible collection.
 * Keep the personal save and reuse the same recipe and cooking history.
 */
const AddPersonalRecipeToCollection = endpoint(
    "/recipes/add-personal-to-collection",
    ({ session, destinationCollection, recipe, user }) =>
        receive({
            session,
            destinationCollection,
            recipe,
        })
            .then(Sessioning.resolve({ session }).responds({ user }))
            .then(Saving.authorize({ user, item: recipe }))
            .then(
                Sharing.authorize({
                    user,
                    resource: destinationCollection,
                })
            )
            .then(
                Collecting.add({
                    collection: destinationCollection,
                    item: recipe,
                })
            )
            .then(
                respond({
                    recipe,
                    collection: destinationCollection,
                })
            ),
    {
        validators: { input: sessionInput("destinationCollection", "recipe") },
    }
);

/** Only the collection owner may remove a membership; personal saves remain intact. */
const RemoveRecipeFromCollection = endpoint(
    "/recipes/remove-from-collection",
    ({ session, collection, recipe, user }) => receive({ session, collection, recipe })
        .then(Sessioning.resolve({ session }).responds({ user }))
        .then(Sharing.authorizeOwner({ user, resource: collection }))
        .then(Collecting.remove({ collection, item: recipe }))
        .then(respond({ collection, recipe })),
    {
        validators: { input: sessionInput("collection", "recipe") },
    }
);

export const composition = {
    SaveRecipe,
    RemoveRecipeFromCollection,
    GetRecipe,
    RecipeDetails: recipeDetails,
    RecipeInCollection: recipeInCollection,
    EntryInRecipe: entryInRecipe,
    AddCookingEntry,
    EditCookingEntry,
    AddRecipeToCollection,
    SavePersonalRecipe,
    ListMyRecipes,
    PersonalRecipes: personalRecipes,
    GetPersonalRecipe,
    SavedRecipeDetails: savedRecipeDetails,
    AddPersonalCookingEntry,
    EditPersonalCookingEntry,
    AddPersonalRecipeToCollection,
};
