# Batch: Final Design Summary

Batch keeps original recipes, cooking adjustments, and results together. The main journey follows a cook saving their family recipes from their mother, recording an adjustment, and sharing it so someone else can understand and try their version of the recipe.

## Changes from P1

The main ideas remain the same: cooking attempts belong to original recipe and recording an adjustment leaves the original instructions unchanged. Attempts do not branch from one another, this keeps the history straightforward, althought users must describe which earlier adjustments they followed.

The implementation changed in a couple ways:
- Personal recipes: The MVP required a collection before saving a recipe. I added My recipes so users can save first and organize later. Saving tracks when each user first added a recipe, supporting sorting by date added.
- Collections: A recipe can belong to multiple collections. Each collection references the same recipe, keeping its instructions and cooking history together.
- Direct sharing: Users can share one recipe without sharing a whole collection. Shared resources appear separately from personal saves.
- Recipe entry: Separate ingredient and instruction rows replaced multiline textbox. Descriptions introduce the dish, while notes hold extra tips that might not be necessary but can be good to have.
- Profiles: Display names and pictures help users recognize contributors without changing their login username or earlier cooking entries.

## Concepts and permissions

I kept organization, personal saves, and access management separate. Collecting manages collection contents, Saving manages personal lists, and Sharing manages ownership and memebership. Sharing has separate instances for collections and individual recipes.

This separation requires explicit composition rules. Creating a collection initializes its sharing owner. Creating a recipe establishes its direct owner and adds it to the creator's personal list. Contributing a recipe to someone else's collection does not transfer recipe ownership.

Permissions are enforced in the backend. Collection owners manage collection membership, names, and deletion. Recipe owners manage direct sharing and permanent deletion. Members can contribute cooking entries, but only an entry's author can edit it while retaining access.

Removal and deletion have different scopes. Removing a recipe from a collection preserves it elsewhere (e.g. the creator's My recipes list). Deleting a collection preserves recipes and cooking history. Permanently deleting a recipe removed its history, personal saves, collection references, and direct sharing.

## Visuals and interactions

The interface carries forward the P3 visual study. Dried herbs inspire the muted sage buttons, spices and wooden kitchens inspire the warm beige background. The reds from spicy spices inspire errors and deletions.

The headings are designed to give it a cookbook feel, with the serif text and recipe card that mimic both cookbooks and online recipe websites. Ingredients sit next to instructions on a wide screen, and stack on smaller screens. Notes are a separate addition to recipes for author recommended substitutions and other tips.

Sharing and management controls are collapsed under the recipe contents. Search and sorting helps user find recipes, and Owner and Member labels explain the user's role.

## Testing and lessons

Concept and composition tests cover validation, permissions, repeated actions, sharing, profiles, and deletion. Refusal tests check that rejected requests preserve the relevant state.

Testing caught a membership check that returned an error while still adding a different recipe, I changed it to check the identifiers supplied by the request and verified that the refusal leaves the destination unchanged. This showed why testing stored state matters alongside checking the responses.

For P3, I also tested the user journey with 2 accounts, including persistence after refresh, sharing and revocation, entry authorship, invalid inputs, and mobile use.

## Remaining limitations

Recipes still require manual entry. Unfinished recipe and cooking-entry drafts can be lost during navigation, and changes from other sessions require reloading. Grouped ingredients and instructions, recipe images, and password recovery remain future work.

For P5, I want to observe whether someone unfamiliar with the app can save a recipe, distinguish notes from cooking entries, and share it without help. I also want to check whether the difference between personal recipes, collections, and shared access is clear.
