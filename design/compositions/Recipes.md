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
