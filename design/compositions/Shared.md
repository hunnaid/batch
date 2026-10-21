# Shared collections and individual recipes

The Shared tab lists collections and directly shared recipes in separate
sections.[list] The overview includes both lists.[overview]
Each list shows items the signed-in user has shared with others and items
shared with them. It excludes private items, items they cannot access, and
memberships that have been revoked.

Removing the last member also removes the item from its owner's Shared list.
The ownership record stays, so the owner can share it again.

Owners have a crown and an "Owner" label. Other authorized users have a person
icon and a "Member" label. A recipe appears in the individual list only when
it is shared directly. Being in a shared collection does not add it to that
list. Directly shared recipes can also belong to collections, but each recipe
appears only once in the individual list.

[list]: reaction:Shared.ListShared
[overview]: former:Shared.SharedOverview

```endpoints
Shared.ListShared at /shared/list
```

## Direct recipe ownership and sharing

RecipeSharing is a separate instance of Sharing with its own storage. It uses
recipe identifiers instead of collection identifiers. Creating a recipe through
either save endpoint makes its creator the direct-sharing owner, with no members.
Creating a recipe in someone else's collection does not give the collection
owner control of its direct sharing.

Only the recipe's direct owner can manage access by registered username.[owner]
Granting access adds a member.[share] Revoking access removes one.[revoke]
The request is refused if the username is unknown, access was already granted,
the owner tries to share with themselves, or the user being revoked is not a
member. Direct sharing does not add personal saves or collection memberships.

The ownership-status endpoint reports whether the signed-in user can manage
this recipe's direct sharing.[status] It does not return recipe contents or
another user's identity.

Older recipes may have personal saves but no direct-sharing owner. A user can
prepare such a recipe for sharing if they have saved it, the recipe exists,
and it has no direct owner.[legacy] The preparation endpoint records that user
as the owner.[prepare] The existing save endpoints created personal saves only
for recipe creators. Once a direct owner is recorded, another personal save or
collection ownership cannot replace them.

If two requests try to prepare the same recipe at once, one may be refused and
can be retried. Collection membership alone cannot establish ownership of an
older recipe without a personal save. Preparation does not grant anyone access.
If a later sharing request is refused, the owner stays recorded and no member
is added.

[owner]: view:Shared.RecipeOwner
[legacy]: view:Shared.LegacyRecipeOwner
[share]: reaction:Shared.ShareRecipe
[revoke]: reaction:Shared.RevokeRecipeAccess
[status]: reaction:Shared.RecipeSharingStatus
[prepare]: reaction:Shared.PrepareRecipeSharing

```endpoints
Shared.RecipeSharingStatus at /recipes/sharing-status
Shared.PrepareRecipeSharing at /recipes/prepare-sharing
Shared.ShareRecipe at /recipes/share
Shared.RevokeRecipeAccess at /recipes/revoke
```

## Managing recipients

Owners can retrieve a recipe's direct recipients through their session.[recipients]
The endpoint checks direct ownership and returns member identifiers and registered
usernames, excluding the owner.[recipient-list] Members and unrelated users are
refused. A legacy personal saver who can prepare ownership can read an empty
list before preparation; reading does not initialize sharing or change records.

Manage sharing lists direct recipients with a Revoke access button beside each
username. A separate username field grants new access. Grants and revocations
update the list without a page refresh. A failed load offers a retry instead of
claiming there are no recipients. The list includes only direct recipe grants.
Collection permissions remain separate, and revoking a direct recipient preserves
any access through a collection or personal save.

[recipients]: reaction:Shared.ListRecipeRecipients
[recipient-list]: former:Shared.RecipeRecipients

```endpoints
Shared.ListRecipeRecipients at /recipes/recipients
```

## Opening and contributing

Opening an individual recipe checks RecipeSharing access.[get] The response
contains the same details and cooking history as opening it from My recipes
or a collection.[details] Members can add cooking entries.[add] They can also
edit their own entries.[edit] Editing checks recipe access and verifies that
the entry belongs to that recipe. CookingLog checks that the user wrote the
entry. Direct or collection membership does not give control of direct sharing.

Owners can manage direct sharing from any recipe view. Members see the same
recipe and cooking-entry form, without the owner's sharing controls. Owners
can also add their personally saved recipes to collections.

Revoking direct access immediately blocks reads and entry changes through
that permission. It preserves the recipe, personal saves, cooking history,
and collection access. A user who still has access through a personal save
or collection can use that route. Deleting or unsharing a collection also
leaves direct recipe access intact. All endpoints identify the user through
the session and check input types.

[get]: reaction:Shared.GetSharedRecipe
[details]: former:Shared.DirectRecipeDetails
[add]: reaction:Shared.AddSharedCookingEntry
[edit]: reaction:Shared.EditSharedCookingEntry

```endpoints
Shared.GetSharedRecipe at /recipes/get-shared
Shared.AddSharedCookingEntry at /entries/add-shared
Shared.EditSharedCookingEntry at /entries/edit-shared
```

## Permanently deleting a recipe

Only the recipe's direct owner can permanently delete it.[delete-recipe]
The endpoint checks the session and uses the same ownership rule as sharing.
For an older recipe with no direct owner, a personal saver can establish
ownership if the recipe exists. Another personal save, collection ownership,
or shared membership cannot replace an existing owner.

After checking ownership, the endpoint removes the original recipe, its
references in every collection, all cooking entries (including other users'
attempts), all personal saves, and its direct-sharing record. It leaves the
collections themselves and unrelated recipes, saves, histories, and permissions
unchanged. The endpoint calls each concept to remove its own records.

The recipe page shows "Delete recipe permanently" only to the owner. The
confirmation explains that everyone loses access and all cooking history is
deleted. After success, the page returns to the refreshed overview. Deleting
an already deleted recipe or deleting without ownership is refused without
changing unrelated state. The actions run in order. The endpoint returns
success only after every cleanup action finishes.

Deletion is not transactional across concepts. If a cleanup action fails,
earlier changes may remain even though the endpoint does not return success.
The recipe may be partially deleted and require repair.

[delete-recipe]: reaction:Shared.DeleteRecipe

```endpoints
Shared.DeleteRecipe at /recipes/delete
```
