# CookingLog

## Purpose

Help cooks remember their adjustments and results so they can repeat successful attempts and avoid past mistakes.

## Principle

After a cook records an attempt, they can retrieve its changes and result. They can edit their own entry to add results later. Recording another attempt preserves earlier entries. Clearing a recipe’s history removes all its attempts while preserving other recipes’ histories.

## Types

```types
external User
  The identity of the cook who authored an entry.

external Recipe
  The identity of the original recipe used for an attempt.
```

## State

```state
a set of Entries with
  an author User
  a recipe Recipe
  a changes String
  a result String
  a createdAt DateTime
```

## Actions

```actions
record(author: User, recipe: Recipe, changes: String, result: String) : returns (entry: Entry)
  where changes and result are both blank
  then
    refuses INVALID_COOKING_ENTRY "A cooking entry needs changes or a result."
  where changes or result is not blank
  then
    create a new entry with the given author, recipe, changes, and result
    set its createdAt to the current date and time
    leave earlier entries unchanged
    returns entry

edit(author: User, entry: Entry, changes: String, result: String) : returns ()
  where entry does not exist
  then
    refuses COOKING_ENTRY_NOT_FOUND "The cooking entry does not exist."
  where entry exists and its author differs from the given author
  then
    refuses COOKING_ENTRY_NOT_OWNED "Only the author can edit this cooking entry."
  where entry exists, its author matches the given author, and changes and result are both blank
  then
    refuses INVALID_COOKING_ENTRY_EDIT "A cooking entry needs changes or a result."
  where entry exists, its author matches the given author, and changes or result is not blank
  then
    replace the entry's changes and result with the given text
    preserve its identifier, author, recipe, and createdAt
    leave other entries unchanged
    returns
clearRecipe(recipe: Recipe) : returns ()
  where true
  then
    remove every entry associated with recipe regardless of author
    preserve entries for other recipes
    succeed without changes if recipe has no entries
    returns

```

## Queries

```queries
_get(entry: Entry) : optional (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)
  Return one row containing the entry's identifier and recorded details.
  Return no rows when the entry does not exist.
_forRecipe(recipe: Recipe) : many (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)
  Return all entries associated with the given recipe, newest first.
  Break ties in createdAt by sorting entry identifiers in ascending order.
  Return no rows when the recipe has no entries.
```
