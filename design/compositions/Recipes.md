# Recipes

A signed-in cook saves a recipe into a collection they can access.[save]
The endpoint resolves the session and checks collection access before
recording the recipe. It initializes direct-sharing ownership with no members,
then saves the new recipe to the creator's personal
list, adds it to the collection, and returns its identifier.

Ingredients and instructions retain their supplied order. Cooks can include
optional notes for extra tips or reminders when saving a recipe, with or
without a collection. Notes belong to the original recipe and are visible to
anyone who can open it. Notes keep their text and line breaks. An omitted
source or notes field defaults to an empty string at either save endpoint.

[save]: reaction:Recipes.SaveRecipe

```endpoints
Recipes.SaveRecipe at /recipes/save
```

A signed-in cook retrieves a recipe through a collection they can access.[get]
The recipe details combine collection membership with the original recipe
data.[details] If the recipe does not belong to the collection or does not
exist, the response contains a null recipe. An absent source or notes field
is shown as null. Older recipes without notes remain accessible. The recipe
page shows notes below the instructions when they contain text.

[get]: reaction:Recipes.GetRecipe
[details]: former:Recipes.RecipeDetails

```endpoints
Recipes.GetRecipe at /recipes/get
```

Recipe details also include the recipe's cooking entries, newest first.
Each entry includes its identifier, author, adjustments, result, and creation
time. A recipe without cooking entries has an empty entries list.

A signed-in cook adds a cooking entry to a recipe in an accessible
collection.[add-entry] The session determines the author. The endpoint checks
collection access and recipe membership before recording the attempt.
A recipe outside the collection produces an error response.

[add-entry]: reaction:Recipes.AddCookingEntry

```endpoints
Recipes.AddCookingEntry at /entries/add
```

A cook edits an existing entry through an accessible collection.[edit-entry]
The endpoint verifies that the recipe belongs to the collection and the entry
belongs to that recipe. CookingLog checks that the signed-in user is the author.
Editing replaces the changes and result while preserving the entry's original
author, recipe, and creation time.

[edit-entry]: reaction:Recipes.EditCookingEntry

```endpoints
Recipes.EditCookingEntry at /entries/edit
```

Recipe and cooking-entry endpoints validate incoming field types before
invoking concept actions. Session inputs accept a token or null for a missing
cookie. Identifiers and text fields must be strings, and ingredient and
instruction lists must contain only strings.

## Adding an existing recipe to another collection

A signed-in user can add a recipe from one accessible collection to
another.[add-to-collection] The endpoint resolves the session, checks
access to both collections, and verifies that the source contains the
recipe before adding it to the destination.

Both collections refer to the same recipe. The original collection keeps
it, and both show the same instructions and cooking history. Members of
either collection can see existing and future cooking entries. Removing
access to one collection does not remove access through another.

If the source does not contain the recipe, the endpoint reports
RECIPE_NOT_IN_COLLECTION. Collecting refuses the addition if the
destination already contains the recipe.

[add-to-collection]: reaction:Recipes.AddRecipeToCollection

```endpoints
Recipes.AddRecipeToCollection at /recipes/add-to-collection
```

## Checking recipe and entry membership

Before adding a cooking entry, editing one, or adding an existing
recipe to another collection, the application checks that the
specified recipe belongs to the specified collection.[recipe-membership]
Both identifiers are inputs to the check, preserving the recipe
selected by the request.

When editing a cooking entry, the application also checks that the
specified entry belongs to the specified recipe.[entry-membership]
Collection access and entry authorship are enforced separately by
Sharing and CookingLog.

[recipe-membership]: view:Recipes.RecipeInCollection
[entry-membership]: view:Recipes.EntryInRecipe

## Personal recipes

A signed-in cook can create a recipe without choosing a collection.[save-personal]
The endpoint records the recipe and saves its identifier in that user's
personal list before returning success. It also initializes direct-sharing
ownership for the creator with no members. This operation does not share it.

The My recipes endpoint lists the signed-in user's personal saves.[list-mine]
Each result includes the recipe identifier, title, and the date that user
first saved it.[personal-recipes] Access to a shared collection alone does
not add its recipes to this list.

[save-personal]: reaction:Recipes.SavePersonalRecipe
[list-mine]: reaction:Recipes.ListMyRecipes
[personal-recipes]: former:Recipes.PersonalRecipes

```endpoints
Recipes.SavePersonalRecipe at /recipes/save-personal
Recipes.ListMyRecipes at /recipes/mine
```

## Opening a personal recipe

A signed-in cook can open a recipe from their personal list without
supplying a collection.[get-personal] Saving verifies that the recipe
has been saved by the user identified by the session.

The response includes the original recipe and its cooking history.[saved-details]
An item absent from the user's personal list is refused. If the personal
save exists but the recipe record is missing, the response contains a
null recipe.

[get-personal]: reaction:Recipes.GetPersonalRecipe
[saved-details]: former:Recipes.SavedRecipeDetails

```endpoints
Recipes.GetPersonalRecipe at /recipes/get-personal
```

## Cooking entries for personal recipes

A signed-in cook can record an attempt for a recipe in their personal
saved list without choosing a collection.[add-personal-entry]
The session determines the entry's author.

To edit an attempt, the recipe must be personally saved, the entry must
belong to that recipe, and the signed-in user must be its original
author.[edit-personal-entry] Editing preserves the entry's identity,
recipe association, author, and creation time.

These endpoints use the same cooking history as the collection-based
endpoints.

[add-personal-entry]: reaction:Recipes.AddPersonalCookingEntry
[edit-personal-entry]: reaction:Recipes.EditPersonalCookingEntry

```endpoints
Recipes.AddPersonalCookingEntry at /entries/add-personal
Recipes.EditPersonalCookingEntry at /entries/edit-personal
```

## Personal recipes and collections

Creating a new recipe through a collection also saves that recipe to
the signed-in creator's personal list.[save-personal-membership]
Other collection members do not receive a personal save merely
because they can access the collection.

A cook can add a personally saved recipe to a collection they can
access.[personal-to-collection] The endpoint verifies personal recipe
access and destination collection access before adding the recipe.

The personal save remains available. The collection references the
same recipe identifier, including its existing and future cooking
history. An existing destination membership is refused.

[save-personal-membership]: reaction:Recipes.SaveRecipe
[personal-to-collection]: reaction:Recipes.AddPersonalRecipeToCollection

```endpoints
Recipes.AddPersonalRecipeToCollection at /recipes/add-personal-to-collection
```

## Removing a recipe from a collection

Only the collection owner can remove a recipe membership.[remove-membership]
The endpoint resolves the session and checks collection ownership before
calling Collecting.remove. A member, including the recipe's creator, cannot
remove it from someone else's collection. The request is refused if the
recipe is not in the collection.

Removal changes only the selected collection's item set. It preserves the
recipe, cooking history, all personal saves and save dates, other collection
memberships, and direct sharing. The creator can still open it from My recipes.
The interface distinguishes "Remove from collection" from permanent deletion
and explains this scope before asking for confirmation.

[remove-membership]: reaction:Recipes.RemoveRecipeFromCollection

```endpoints
Recipes.RemoveRecipeFromCollection at /recipes/remove-from-collection
```
