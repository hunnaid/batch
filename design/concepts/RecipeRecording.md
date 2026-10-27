# RecipeRecording

## Purpose

Keep original recipes in a consistent format so cooks can return to them later.

## Principle

After a cook records a recipe, they can retrieve its original details using its identifier. Editing replaces those details while keeping the same identifier. Recording or editing one recipe leaves other recipes unchanged. Deleting a recipe makes its details unavailable without changing other recipes.

## Types

```types
opaque RecipeContent
  An ordered list of sections, each with an optional heading and an ordered list of text items.
  Represented as { heading?: string; items: string[] }[] in TypeScript.
  A plain string[] is also accepted for older recipes and represents one untitled section.
```

## State

```state
a set of Recipes with
  a title String
  an ingredients RecipeContent
  an instructions RecipeContent
  an optional source String
  an optional notes String
  an optional description String
```

## Actions

```actions
record(title: String, ingredients: RecipeContent, instructions: RecipeContent, source?: String, notes?: String, description?: String) : returns (recipe: Recipe)
  where title is blank, either list is empty, a section has no items, any item is blank, or a list has an invalid structure
  then
    refuses INVALID_RECIPE "Recipe details must include a nonblank title and nonempty ingredient and instruction sections without blank items."
  where title is not blank and both lists have valid structure with at least one item in each section and no blank items
  then
    create a new recipe with the given title, ingredients, and instructions
    preserve section order, headings, and the order and text of items within each section
    allow absent, empty, or whitespace-only headings for untitled sections
    preserve a supplied plain list as a plain list for backward compatibility
    set source if provided, otherwise leave it absent
    set notes if provided, otherwise leave them absent
    preserve the supplied notes text, including line breaks
    set description if provided, otherwise leave it absent
    preserve the supplied description text, including line breaks
    returns recipe

edit(recipe: Recipe, title: String, ingredients: RecipeContent, instructions: RecipeContent, source?: String, notes?: String, description?: String) : returns ()
  where title is blank, either list is empty, a section has no items, any item is blank, or a list has an invalid structure
  then
    refuses INVALID_RECIPE "Recipe details must include a nonblank title and nonempty ingredient and instruction sections without blank items."
  where the supplied details are valid and recipe does not exist
  then
    refuses EDIT_RECIPE_NOT_FOUND "The recipe does not exist."
  where the supplied details are valid and recipe exists
  then
    replace its title, ingredients, instructions, source, notes, and description
    preserve the supplied text, line breaks, section headings, section order, and item order
    leave omitted optional fields absent, clearing any previous values
    preserve the recipe identifier and other recipes
    returns

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
_get(recipe: Recipe) : optional (title: String, ingredients: RecipeContent, instructions: RecipeContent, source?: String, notes?: String, description?: String)
  Return one row containing the original recipe details when the recipe exists.
  Return no rows when the recipe does not exist.
  Return ingredients and instructions in their stored format, keeping older plain lists readable without a migration.
  Omit source when it was not supplied.
  Omit notes when they were not supplied.
  Omit description when it was not supplied.
```
