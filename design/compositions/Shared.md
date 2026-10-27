# Shared collections and individual recipes

## The Shared tab

The Shared tab has separate lists for collections and directly shared recipes.[list] The overview includes both lists.[overview] Each shows resources the signed-in user has shared with others and resources shared with them. It excludes private resources, unrelated resources, and revoked memberships.

Revoking the last member removes the resource from its owner's Shared list. The owner stays recorded and can share it again. Owners have a crown and an "Owner" label; other members have a person icon and a "Member" label.

Shared collection cards offer Add recipe to both owners and members. It opens the same chooser as the Collections tab: create a new recipe or add an existing recipe from personal saves or accessible collections. The existing-recipe list excludes recipes already in the destination. Adding keeps the same recipe and cooking history, and updates the collection's recipe count without a page refresh.

A recipe appears in the individual list only if it is shared directly. Being in a shared collection does not add it to that list. A directly shared recipe can also belong to collections, but appears only once in the individual list.

[list]: reaction:Shared.ListShared
[overview]: former:Shared.SharedOverview

```endpoints
Shared.ListShared at /shared/list
```

## Direct recipe sharing

RecipeSharing is a separate instance of Sharing with its own storage. It uses recipe identifiers as resources. Creating a recipe through either save endpoint makes its creator the direct owner, with no members. Creating it in someone else's collection does not give the collection owner control of direct sharing.

Only the direct owner can manage access by registered username.[owner] Sharing adds a member,[share] and revoking access removes one.[revoke] Unknown usernames, duplicate grants, self-sharing, and revoking a nonmember are refused. Direct sharing does not create personal saves or collection memberships.

The sharing-status endpoint reports whether the signed-in user can manage this recipe's direct sharing.[status] It does not return recipe contents or another user's identity.

[owner]: view:Shared.RecipeOwner
[share]: reaction:Shared.ShareRecipe
[revoke]: reaction:Shared.RevokeRecipeAccess
[status]: reaction:Shared.RecipeSharingStatus

```endpoints
Shared.RecipeSharingStatus at /recipes/sharing-status
Shared.ShareRecipe at /recipes/share
Shared.RevokeRecipeAccess at /recipes/revoke
```

## Recipes saved before direct sharing

Some older recipes have a personal save but no direct owner. A user can prepare one for sharing if they have saved it, the recipe still exists, and no direct owner is recorded.[legacy] Preparation makes that user the owner.[prepare] This relies on the existing save endpoints creating personal saves only for recipe creators.

Once an owner is recorded, another personal save or collection ownership cannot replace them. Collection membership alone cannot establish ownership of an older recipe. If two preparation requests happen at once, one may be refused and can be retried.

Preparation grants no members access. If a later sharing request is refused, the ownership record stays and no member is added.

[legacy]: view:Shared.LegacyRecipeOwner
[prepare]: reaction:Shared.PrepareRecipeSharing

```endpoints
Shared.PrepareRecipeSharing at /recipes/prepare-sharing
```

## Managing recipients

Only the owner can retrieve a recipe's direct recipients.[recipients] The endpoint checks ownership and returns member identifiers and usernames, excluding the owner.[recipient-list] Members and unrelated users are refused. For an older recipe, a personal saver who qualifies to prepare ownership can read an empty list before preparation. Reading does not create ownership or change records.

Manage sharing shows a Revoke access button beside each username and a separate field for adding someone else. Grants and revocations update the list without a page refresh. A failed load offers a retry rather than showing an empty list.

This list covers direct recipe access only. Revoking it leaves any access through a collection or personal save unchanged.

[recipients]: reaction:Shared.ListRecipeRecipients
[recipient-list]: former:Shared.RecipeRecipients

```endpoints
Shared.ListRecipeRecipients at /recipes/recipients
```

## Opening recipes and recording attempts

Opening a directly shared recipe checks RecipeSharing access.[get] It returns the same recipe details and history as the personal and collection routes.[details] Members can add entries[add] and edit their own entries.[edit] Editing checks recipe access and that the entry belongs to that recipe. CookingLog checks authorship. Neither direct nor collection membership grants control of direct sharing.

Owners can manage direct sharing from any recipe view. Members see the recipe and entry form without the owner's sharing controls. Owners can also add their personally saved recipes to collections.

Revoking direct access blocks further reads and entry changes through that route. It leaves the recipe, personal saves, history, and collection access unchanged. Someone who still has a personal save or collection access can use that route instead. Deleting or unsharing a collection also preserves direct recipe access. All endpoints identify the user from the session and check input types.

[get]: reaction:Shared.GetSharedRecipe
[details]: former:Shared.DirectRecipeDetails
[add]: reaction:Shared.AddSharedCookingEntry
[edit]: reaction:Shared.EditSharedCookingEntry

```endpoints
Shared.GetSharedRecipe at /recipes/get-shared
Shared.AddSharedCookingEntry at /entries/add-shared
Shared.EditSharedCookingEntry at /entries/edit-shared
```

## Editing an original recipe

Only the direct owner can edit an original recipe.[edit-recipe] A personal saver of an older recipe without direct ownership can also edit it under the existing legacy ownership rule. Editing does not initialize sharing. Collection ownership, membership, and another personal save do not override an existing recipe owner.

The endpoint checks the session, ownership, input types, and recipe details before replacing the original fields. It keeps the same recipe identifier, personal saves and save dates, collection memberships, direct permissions, and cooking entries. All access paths show the updated recipe. Existing cooking entries keep their text and authorship; they are not snapshots of earlier recipe details.

The owner opens Edit recipe under Manage recipe. The existing form starts with the saved title, ingredients, instructions, source, notes, and description. It explains that changes apply everywhere the recipe is shared while cooking history stays unchanged. Cancel returns without saving. Save changes updates the recipe page without a browser refresh. Invalid details, missing recipes, and unauthorized requests are refused without changing recipe details or related records. Omitted optional fields default to empty strings, which clear their previous content.

[edit-recipe]: reaction:Shared.EditRecipe

```endpoints
Shared.EditRecipe at /recipes/edit
```

## Permanently deleting a recipe

Only the direct owner can permanently delete a recipe.[delete-recipe] The endpoint checks the session and uses the same ownership rule as sharing. For an older recipe without an owner, a personal saver can establish ownership if the recipe exists. Personal saves, collection ownership, and shared access cannot replace an existing owner.

After authorization, deletion removes the original recipe, references in every collection, all cooking entries including other users' attempts, all personal saves, and direct sharing. It leaves collections themselves and unrelated recipes, saves, entries, and permissions unchanged. Each concept removes its own records.

Only the owner sees "Delete recipe permanently." The confirmation explains that everyone loses access and all cooking history is deleted. After success, the page returns to the refreshed overview. Repeated or unauthorized deletion is refused without changing unrelated state.

The deletion actions run one after another, and success is returned only when all finish. If one fails, earlier deletions are not undone. Some related records may remain and need repair.

[delete-recipe]: reaction:Shared.DeleteRecipe

```endpoints
Shared.DeleteRecipe at /recipes/delete
```
