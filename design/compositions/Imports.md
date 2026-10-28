# Website recipe imports

## Importing for review

A signed-in cook can request a recipe draft for My recipes from a public website.[personal] When importing into a collection, the endpoint also checks that the cook owns the collection or is a member.[collection] These checks happen before retrieval and extraction.

Importing returns an editable draft. It does not create a recipe, personal save, collection membership, cooking entry, or sharing permission. The draft is held in browser memory. Canceling the review, leaving the screen, or refreshing the page discards it.

[personal]: reaction:Imports.ImportPersonalRecipe
[collection]: reaction:Imports.ImportRecipeToCollection

```endpoints
Imports.ImportPersonalRecipe at /recipes/import-personal
Imports.ImportRecipeToCollection at /recipes/import
```

## Reading the page

RecipeImporting retrieves the page and prepares its content for Gemini. It first looks for embedded Recipe JSON-LD, which contains structured recipe information. When that data is present, it also includes a limited amount of visible lists and headings to help preserve ingredient and instruction sections. If the page has no Recipe JSON-LD, it uses readable page text. Batch reads the returned HTML; it does not run the website's JavaScript.

The server checks the returned title, section headings, ingredients, instructions, description, and notes for valid types and sizes. A draft requires a nonblank title and at least one ingredient section and one instruction section. Every section must contain items, and every item must be nonblank. Blank headings are allowed. It sets the source to the normalized URL supplied by the user, even if retrieval followed a redirect. Provider-supplied recipe identifiers, ownership, permissions, and source fields are ignored.

Page content is treated as input to extract from. The extraction prompt tells Gemini to ignore instructions within that content and preserve the recipe's quantities, units, headings, and order. Users still need to review the result, since the server's format checks do not confirm that every detail matches the website.

The API key stays on the backend. Batch does not persist the retrieved HTML or raw provider responses.

## Pasting page content

Below the URL option, an "or" divider introduces a box for pasted website content. A cook can paste the page's copied text or HTML and choose Autofill recipe. This returns a draft for My recipes[personal-text] or the selected collection.[collection-text] The endpoints check the session and collection access just as URL imports do.

Pasted content is sent to Gemini without retrieving a website or following any links. HTML uses the same recipe-data and heading extraction as downloaded pages. Plain text is sent as supplied, with surrounding whitespace removed. Since the cook supplies the content, an HTML subscription marker does not block this path. Batch does not access the cook's website account.

Input must be nonblank and no larger than 750,000 UTF-8 bytes. Plain text is also limited to 100,000 characters. The draft uses the same field and section validation as URL imports. Its source starts blank, ignoring any source suggested by Gemini. The user can add a source URL in the review form before saving.

Pasted content is held in browser memory and is not stored on the server. Saving still requires Save recipe. Canceling the review returns to the import options with the pasted input available to edit or retry.

[personal-text]: reaction:Imports.ImportPersonalRecipeText
[collection-text]: reaction:Imports.ImportRecipeTextToCollection

```endpoints
Imports.ImportPersonalRecipeText at /recipes/import-text-personal
Imports.ImportRecipeTextToCollection at /recipes/import-text
```

## Reviewing and saving

Import from a website appears in the add-recipe options for My recipes, owned collections, and shared collections. The user enters a URL or pastes page content, and a successful import opens the filled recipe form. The form keeps the destination they started from.

Users can edit every field and section before choosing Save recipe. Saving uses the existing personal[save-personal] or collection[save-collection] endpoint, which checks permissions again. It then creates the recipe, records the creator's personal save and recipe ownership, and adds it to the collection if one was selected. The importing cook owns the recipe, including when the collection belongs to someone else.

After saving, imported recipes behave like manually entered recipes. They can be organized, shared, edited, and used for cooking entries.

An invalid URL, invalid pasted input, unreadable page, incomplete recipe, or service failure shows an error. Users can retry or return to recipe options for manual entry. Canceling an import closes the screen and aborts the browser request. Backend work already running may still finish, but its result is not shown or saved. A failed or canceled import does not change saved recipes.

Automated tests use fake page content and provider responses. Composition tests inject an extractor to check permissions, draft responses, and later saving. These tests make no live Gemini requests.

[save-personal]: reaction:Recipes.SavePersonalRecipe
[save-collection]: reaction:Recipes.SaveRecipe

## Retrieval limits

Only public HTTP and HTTPS pages are accepted. URLs containing login credentials, literal IP addresses, nonstandard ports, or local hostnames are refused. Every destination must resolve only to public IP addresses. The connection uses the checked address while preserving the website's hostname for TLS.

Retrieval allows up to four redirects and checks each destination again. The initial request and redirects share a 10-second deadline. Each response has a 2 MiB limit for both downloaded and decompressed content. Only HTTP 200 responses containing HTML or XHTML are accepted. Batch does not forward website login details, cookies, or subscription credentials. Embedded data declaring subscription-only content is refused before Gemini is called. The extraction prompt also tells Gemini to refuse content that requires a subscription.

## Provider configuration

The backend reads GEMINI_API_KEY. GEMINI_MODEL can select another compatible Gemini model; the default is gemini-3.1-flash-lite. Requests use structured JSON output and a low thinking level. If the API key is missing, import fails before page retrieval. Manual recipe entry still works without it.

After the content is prepared, one 60-second cancellation signal covers the Gemini request and any retry. Output is limited to 8,192 tokens, and oversized, malformed, or truncated responses are refused. Each RecipeImporting instance allows at most two imports at once, including retrieval and validation. A request releases its slot when it finishes or fails.

The Gemini SDK allows at most two attempts. Provider errors 502, 503, and 504 trigger one retry after a short randomized delay. Network failures may also be retried by the SDK. Batch does not automatically retry invalid requests, credential errors, quota errors, or unreadable pages. Provider quota errors and continued 502, 503, or 504 errors produce the busy-service error. Other API or network failures use the temporary-unavailability error. Raw provider error details are not sent to the browser.

URL and pasted-content imports share the same two request slots and provider limits. The HTTP gateway allows 75 seconds for all four import endpoints. Other endpoints keep their usual deadline.

Some websites block retrieval or require login. Users can enter those recipes manually. The review form reminds users to check quantities and instructions before saving.

The integration uses Google's [structured-output documentation](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). Google's [retry guidance](https://ai.google.dev/gemini-api/docs/troubleshooting) informed Batch's retry handling.
