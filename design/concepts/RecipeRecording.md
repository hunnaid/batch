# RecipeRecording

## Purpose

Keep original recipe instructions available in a consistent structure so cooks can return to them when preparing a dish.

## Principle

After a cook records a recipe, they can retrieve its original details using its identifier. Recording another recipe leaves the earlier recipe unchanged. Deleting a recipe makes its original details unavailable without changing other recipes.

## Types

```types
opaque TextSequence
  An ordered sequence of strings, represented as string[] in TypeScript.
```

## State

```state
a set of Recipes with
  a title String
  an ingredients seq of String
  an instructions seq of String
  an optional source String
```

## Actions

```actions
record(title: String, ingredients: TextSequence, instructions: TextSequence, source?: String) : returns (recipe: Recipe)
  where title is blank, either sequence is empty, or any sequence item is blank
  then
    refuses INVALID_RECIPE "Recipe details must include a nonblank title and nonempty ingredient and instruction sequences without blank items."
  where title is not blank, both sequences are nonempty, and no sequence item is blank
  then
    create a new recipe with the given title, ingredients, and instructions
    preserve the order and text of the supplied items
    set source if provided, otherwise leave it absent
    returns recipe
delete(recipe: Recipe) : returns ()
  where recipe does not exist
  then
    refuses DELETE_RECIPE_NOT_FOUND "The recipe does not exist."
  where recipe exists
  then
    remove the original recipe
    leave other recipes unchanged
    returns

```

## Queries

```queries
_get(recipe: Recipe) : optional (title: String, ingredients: TextSequence, instructions: TextSequence, source?: String)
  Return one row containing the original recipe details when the recipe exists.
  Return no rows when the recipe does not exist.
  Omit source when it was not supplied.
```
