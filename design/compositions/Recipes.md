# Recipes

## Saving and opening a recipe in a collection

A signed-in cook can save a recipe in a collection they can access.[save] The endpoint checks the session and collection access, then records the recipe. It makes the creator the direct-sharing owner with no members, saved the recipe to their personal list, and adds it to the collection.

Ingredients and instructions keep their order. A description introduces the dish, notes hold extra tips, and the source records where the recipe came from. These optional fields belong to the original recipe and are visible to anyone who can open it. Notes and descriptions keep their text and line breaks. Both save endpoints use an empty string when source, notes, or description is omitted.

Ingredients and instructions can each contain ordered sections with optional headings. Both save endpoints accept a section list, represented as `{ heading?: string, items: string[] }[]`, or an older plain `string[]`. They check the structure before calling RecipeRecording, which requires at least one section and at least one nonblank item in each section. A blank heading is allowed. A list cannot mix plain strings and section objects.

The form starts with one untitled ingredient section and one untitled instruction section. Add ingredient section and Add instruction section append another section and focus its optional heading. Each section has its own add/remove row controls. Extra sections can be removed, but the last section and its last row remain. Saving keeps section and item order. Editing an older plain list starts with one untitled section and saves the section format without changing recipe identity or history.

Opening a recipe through a collection requires collection access.[get] The response combines the recipe's details with its collection membership.[details] It returns a null recipe if the recipe is missing or is not in that collection. An absent source, notes, or description field appears as null, so recipes saved before those fields were added still work.

The recipe page shows a description beneath the title and notes below the instructions when they contain text. It also shows cooking entries, newest first. Each entry includes its identifier, author, changes, result, and creation time. A recipe without attempts has an empty history list.

On the recipe page, each nonblank section heading appears above its list. Ingredients use bullets. Instructions use numbered lists, restarting at 1 in each section. Older plain lists display as one untitled section. The personal, collection, and directly shared views all preserve the same section structure.

[save]: reaction:Recipes.SaveRecipe
[get]: reaction:Recipes.GetRecipe
[details]: former:Recipes.RecipeDetails

```endpoints
Recipes.SaveRecipe at /recipes/save
Recipes.GetRecipe at /recipes/get
```

## Cooking entries through a collection

A cook can add an entry to a recipe in an accessible collection.[add-entry] The session identifier the author. The endpoint checks collection access and that the recipe belongs to the collection before recording the attempt.

Editing also checks that the entry belongs to the requested recipe.[edit-entry] CookingLog allows only the original author to edit it. An edit replaces the changes and result, keeping the entry's identifier, author, recipe, and creation time unchanged.

[add-entry]: reaction:Recipes.AddCookingEntry
[edit-entry]: reaction:Recipes.EditCookingEntry

```endpoints
Recipes.AddCookingEntry at /entries/add
Recipes.EditCookingEntry at /entries/edit
```

## Adding a recipe to another collection

A cook can add an existing recipe from one accessible collection to another.[add-to-collection] The endpoint checks access to both collections and confirms that the source contains the requested recipe before adding it to the destination.

Both collections refer to the same recipe and cooking history. The recipe stays in the original collection. Members of either collection can see all existing and future cooking entries. Losing access to one collection does not remove access through another.

If the source does not contain the recipe, the endpoint returns RECIPE_NOT_IN_COLLECTION. Collecting refuses the addition if the destination already contains it.

[add-to-collection]: reaction:Recipes.AddRecipeToCollection

```endpoints
Recipes.AddRecipeToCollection at /recipes/add-to-collection
```

## Checking recipe and entry membership

Collection-based entry actions and recipe transfers check that the requested recipe belongs to the requested collection.[recipe-membership] Both identifiers are inputs to the check, so it tests that recipe rather than selecting a different one from the collection.

Editing an entry also checks that the requested entry belongs to the requested recipe.[entry-membership] Sharing checks collection access separately, and CookingLog checks authorship.

[recipe-membership]: view:Recipes.RecipeInCollection
[entry-membership]: view:Recipes.EntryInRecipe


## Personal recipes

A cook can save a new recipe without choosing a collection.[save-personal] The endpoint records the recipe, makes the creator its direct-sharing owner with no members, and saves it to their personal list. This does not share it with anyone.

My recipes lists the signed-in user's personal saves.[list-mine] Each result includes the recipe identifier, title, and the date that user first saved it.[personal-recipes] Access through a shared collection does not automatically add a recipe to My recipes.

[save-personal]: reaction:Recipes.SavePersonalRecipe
[list-mine]: reaction:Recipes.ListMyRecipes
[personal-recipes]: former:Recipes.PersonalRecipes

```endpoints
Recipes.SavePersonalRecipe at /recipes/save-personal
Recipes.ListMyRecipes at /recipes/mine
```

## Opening a personal recipe

A cook can open a personally saved recipe without supplying a collection.[get-personal] Saving checks that the user identified by the session has saved it.

The response includes the original recipe and its cooking history.[saved-details] A request for an item outside the user's personal list is refused. If the save exists but the recipe record is missing, the response contains a null recipe.

[get-personal]: reaction:Recipes.GetPersonalRecipe
[saved-details]: former:Recipes.SavedRecipeDetails

```endpoints
Recipes.GetPersonalRecipe at /recipes/get-personal
```

## Cooking entries for personal recipes

A cook can add an entry to a personally saved recipe without choosing a collection.[add-personal-entry] The session identifies the author.

To edit an entry, the user must have saved the recipe, the entry must belong to that recipe, and the user must be its author.[edit-personal-entry] Editing keeps the entry's identifier, recipe, author, and creation time unchanged. Personal and collection routes use the same cooking history.

[add-personal-entry]: reaction:Recipes.AddPersonalCookingEntry
[edit-personal-entry]: reaction:Recipes.EditPersonalCookingEntry

```endpoints
Recipes.AddPersonalCookingEntry at /entries/add-personal
Recipes.EditPersonalCookingEntry at /entries/edit-personal
```

## Personal recipes and collections

Creating a recipe inside a collection also saves it to the creator's personal list.[save-personal-membership] Other collection members do not receive a personal save just because they can access it.

A cook can add a personally saved recipe to an accessible collection.[personal-to-collection] The endpoint checks their personal save and destination access before adding it. The personal save remains, and the collection refers to the same recipe and history. Adding it to a collection that already contains it is refused.

[save-personal-membership]: reaction:Recipes.SaveRecipe
[personal-to-collection]: reaction:Recipes.AddPersonalRecipeToCollection

```endpoints
Recipes.AddPersonalRecipeToCollection at /recipes/add-personal-to-collection
```

## Removing a recipe from a collection

Only the collection owner can remove a recipe from it.[remove-membership] The endpoint checks the session and collection ownership before calling Collecting.remove. A member cannot remove a recipe from someone else's collection, even if they created the recipe. A request is also refused if the recipe is not in that collection.

Removal changes only that collection's contents. It keeps the recipe, cooking history, personal saves and save dates, other collection memberships, and direct sharing. The creator can still open the recipe from My recipes. The interface uses "Remove from collection" and explains what remains before asking for confirmation.

[remove-membership]: reaction:Recipes.RemoveRecipeFromCollection

```endpoints
Recipes.RemoveRecipeFromCollection at /recipes/remove-from-collection
```

Recipe and cooking-entry endpoints check input types before calling concept actions. Session inputs accept a token or null for a missing cookie. Identifiers and text fields must be strings. Ingredients and instructions must be arrays of strings.
