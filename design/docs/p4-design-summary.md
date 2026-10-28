# Batch: Final Design Summary

Batch keeps original recipes, cooking adjustments, and results together. The main journey follows a cook saving their family recipes from their mother, recording an adjustment, and sharing it so someone else can understand and try their version of the recipe. The friend then tries the recipe with an adjustment, and contribute their own attempt. This gives later cooks a record of what people tried and how it turned out.

## Changes from P1

Cooking entries still belong to a recipe, and recording an attempt leaves its instructions unchanged. Attempts do not branch from one another, so cooks must describe which earlier adjustment they followed.

Decisions during implementation:
- **Save first, organize later.** The MVP required a collection before saving a recipe. My recipes now allows personal saves without a collection. Saving records when each user first added the recipe, supporting sorting by date added.
- **Keep one recipe across collections.** Collections reference the same recipe instead of creating copies. Its instructions and cooking history stay together wherever it appears.
- **Share individual recipes.** Users can share one recipe without sharing a whole collection. Receiving access does not automatically add it to My recipes.
- **Support more detailed recipes.** Separate rows replaced multiline ingredients/instructions fields. Optional section headings organize parts such as rice and marinade. Descriptions introduce the dish, while notes hold extra tips.
- **Reduce manual entry.** Website and pasted content imports fill an editable form for review. Importing does not save anything automatically. Users check the result before saving through the existing recipe flow.
- **Recognize contributors.** Profiles provide display names and pictures without changing login usernames.

## Concepts and permissions

Collecting manages organization, Saving manages personal lists, and Sharing manages ownership and membership. Sharing has separate instances for collections and individual recipes. Compositions connect them: creating a collection establishes its sharing owner, while creating a recipe establishes its direct owner and personal save. Contributing to someone else's collection does not transfer recipe ownership.

Permissions are enforced in the backend. Collection owners manage collection membership, names, and deletion. Recipe owners manage original-recipe edits, direct sharing, and permanent deletion. Members can contribute cooking entries, but only an entry's author can edit it while retaining access.

I added original-recipe editing so owners can correct instructions without creating another recipe. It keeps the recipe identifier, personal saves, collection memberships, permissions, and cooking entries. The tradeoff is that entries are not snapshots: after an edit, earlier attempts could describe an older version of the instructions.

Removal and deletion have different scopes. Removing a recipe from one collection preserves its other uses. Deleting a collection preserves recipes and cooking history. Permanently deleting a recipe removes its history, saves, collection references, and direct sharing.

RecipeImporting returns drafts without storing recipes. Authentication and collection access are checked before importing and again when saving. Separating extraction from saving lets users correct missing or inaccurate details and keeps ownership rules in the existing save flow.

## Visuals and interactions

The final interface carries forward the P3 visual study. Dried herbs inspire the muted sage buttons, spices and wooden kitchens inspire the warm beige background. The reds from spicy spices inspire errors and deletions.

Ingredients and instructions are side by side on wide screens and stacked on thinner screens. Optional sections make longer recipes easier to follow by dividing them into subsections.

Later changes focused on interactions within this design. Ingredient and instruction sections make longer recipes easier to follow. A shared recipe chooser lets collection owners and members add existing recipes without re-entering them. Management controls stay below the cooking content. Confirmation dialogs explain the difference between removal and permanent deletion, and picture cropping lets users preview their profile picture before saving it.

## Testing and lessons

Concept and composition tests cover validation, permissions, repeated actions, sharing, profiles, imports, and deletion. Recipe composition tests follow saving a recipe, adding an attempt, editing its result, and retrieving both while checking that the original recipe stays unchanged. Refusal tests check that rejected requests preserve the relevant state.

Testing caught a membership check that returned an error while still adding a different recipe. I changed it to check the identifiers supplied by the request and verified that the refusal leaves the destination unchanged. This showed why testing stored state matters alongside checking the responses.

For P3, I also tested the interface with 2 accounts, including persistence after refresh, sharing and revocation, entry authorship, invalid inputs, and mobile use. Automated import tests use an injected extractor. Live website extraction needs separate validation.

## Remaining limitations

Imports depend on page access and provider availability, and extracted details need review. Unfinished recipe and cooking entry drafts can be lost during navigation. Changes from other sessions require reloading. Recipe version history, recipe images, and password recovery remain future work.

For P5, I want to observe whether someone unfamiliar with the app can save a recipe, distinguish general notes from cooking entries, use an earlier attempt to decide what to try, and share a recipe without help. I also want to check whether the distinction is clear between personal recipes, collections, and shared access.
