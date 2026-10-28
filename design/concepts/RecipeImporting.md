# RecipeImporting

## Purpose

Read a recipe from a public website or pasted page content and return an editable draft for the cook to review.

## Principle

After extracting a recipe, the cook receives a draft with its title, ingredients, instructions, source, description, and notes. Extraction does not save the recipe. Importing again leaves earlier drafts and saved recipes unchanged.

## Types

```types
opaque ImportedRecipeDraft
  A title, ordered ingredient and instruction sections with optional headings, an optional source URL, description, and notes.
```

## State

```state
Rule: No persistent state. Drafts are returned to the caller.
Rule: At most two extractions run at once per instance; temporary request slots are released on success or failure.
```

## Actions

```actions
extract(url: String) : returns (draft: ImportedRecipeDraft)
  where url is not an accepted public HTTP or HTTPS website URL
  then
    refuses INVALID_IMPORT_URL "Enter a public recipe page URL."
  where both extraction slots are occupied or the provider reports quota limits or persistent temporary overload
  then
    refuses RECIPE_IMPORT_BUSY "Website import is busy. Try again shortly."
  where the public page cannot be retrieved safely, requires a subscription, or yields no complete, valid recipe
  then
    refuses NO_RECIPE_FOUND "A complete recipe could not be read from this page."
  where the service is not configured or the provider request fails
  then
    refuses RECIPE_IMPORT_UNAVAILABLE "Website import is temporarily unavailable."
  where the requested page is retrieved and a complete valid recipe is extracted
  then
    build a draft with its title, ordered ingredient and instruction sections, description, and notes
    set source to the normalized submitted URL, ignoring any provider-supplied source
    create no recipe identifier, personal save, collection membership, or permission
    returns draft

extractText(text: String) : returns (draft: ImportedRecipeDraft)
  where text is blank, exceeds 750000 UTF-8 bytes, or is plain text longer than 100000 characters
  then
    refuses INVALID_IMPORT_TEXT "Paste the recipe page content. If it is too long, paste just the recipe."
  where both extraction slots are occupied or the provider reports quota limits or persistent temporary overload
  then
    refuses RECIPE_IMPORT_BUSY "Website import is busy. Try again shortly."
  where the supplied text or HTML yields no complete, valid recipe
  then
    refuses NO_RECIPE_FOUND "A complete recipe could not be read from this content."
  where the service is not configured or the provider request fails
  then
    refuses RECIPE_IMPORT_UNAVAILABLE "Website import is temporarily unavailable."
  where a complete valid recipe is extracted from the supplied content
  then
    build a draft with its title, ordered ingredient and instruction sections, description, and notes
    set source to an empty string, ignoring any provider-supplied source
    retrieve no website and create no recipe identifier, personal save, collection membership, or permission
    returns draft
```

## Queries

```queries
```
