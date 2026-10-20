# Recipes

A signed-in cook saves a recipe into a collection they can access.[save]
The endpoint resolves the session and checks collection access before recording
the recipe. It then adds the new recipe to that collection and returns its
identifier.

Ingredients and instructions retain their supplied order. An omitted source
defaults to an empty string at the endpoint.

[save]: reaction:Recipes.SaveRecipe

```endpoints
Recipes.SaveRecipe at /recipes/save
```

A signed-in cook retrieves a recipe through a collection they can access.[get]
The recipe details combine collection membership with the original recipe
data.[details] If the recipe does not belong to the collection or does not
exist, the response contains a null recipe. An absent source is shown as null.

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

The destination receives the same recipe identifier. The original
collection keeps the recipe, and both collections refer to the same
instructions and cooking history. Members of either collection can see
existing and future cooking entries. Removing access to one collection
does not remove access through another.

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
