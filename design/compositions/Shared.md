# Shared collections and individual recipes

The Shared tab lists collections and directly shared recipes in separate
sections.[list] The overview combines the two kinds of shared resources.[overview]
Each list includes resources the signed-in user owns
and has shared with at least one other user, and resources where they are a
member. Private resources, unrelated resources, and revoked memberships are
excluded. Revoking the final member also removes the resource from its owner's
Shared list. Ownership remains recorded so it can be shared again.

The interface labels owners with a crown and "Owner", and other authorized
users with a person icon and "Member". A recipe belongs to the individual list
only when it is shared directly; being inside a shared collection is not enough.
Directly shared recipes can also belong to collections. Each direct recipe is
listed once, regardless of its collection memberships.

[list]: reaction:Shared.ListShared
[overview]: former:Shared.SharedOverview

```endpoints
Shared.ListShared at /shared/list
```

## Direct recipe ownership and sharing

RecipeSharing is a separate instance of Sharing with separate storage, using
recipe identifiers as resources. Creating a recipe through either save endpoint
initializes RecipeSharing with the signed-in creator as owner and no members.
Creating a recipe inside someone else's collection does not give that collection
owner ownership of the recipe's direct sharing.

Only the direct owner can grant or revoke access by registered username.[owner]
Granting adds a member.[share] Revoking removes a member.[revoke]
Unknown recipients, duplicate grants, self-sharing, and revoking nonmembers are
refused. Direct sharing does not create personal saves or collection memberships.
The ownership-status endpoint returns only whether the signed-in user may manage
this recipe's direct sharing; knowing its identifier does not reveal recipe
contents or another user's identity.[status]

For personally saved recipes created before RecipeSharing existed, a personal
save plus an existing recipe and absent direct ownership permits initialization
through an explicit preparation endpoint before sharing.[legacy]
Preparation establishes the ownership record.[prepare] Existing application save endpoints created
personal saves only for recipe creators. The first sharing owner is then fixed;
later personal saves or collection ownership cannot replace it. Concurrent first
preparations may refuse initialization and can be retried. Older recipes with no
personal-saving record cannot claim ownership through collection membership.
Preparation grants no members access. A later refused grant leaves that prepared
ownership intact and does not add any member.

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

## Opening and contributing

Opening an individual recipe checks RecipeSharing access.[get] It returns the
same recipe details and complete cooking history as the personal and collection
routes.[details] Members can add cooking entries and edit their own entries.[add]
Editing uses a separate endpoint.[edit]
Editing checks both recipe access and the entry's association with that recipe;
CookingLog enforces authorship. Neither direct membership nor collection membership
permits managing direct recipe sharing.

The recipe page offers direct sharing to owners from any access path. Direct
members use the same recipe display and cooking-entry form, without the owner's
sharing controls. Owners can organize their personally saved recipe into
collections using the existing personal route.

Revoking direct access blocks direct reads and entry changes immediately. It
preserves recipe data, personal saves, cooking history, and collection access.
A user with another access path can still open the recipe through that path.
Deleting or unsharing a collection likewise leaves direct recipe access intact.
All endpoints resolve identity from the session and validate supplied field types.

[get]: reaction:Shared.GetSharedRecipe
[details]: former:Shared.DirectRecipeDetails
[add]: reaction:Shared.AddSharedCookingEntry
[edit]: reaction:Shared.EditSharedCookingEntry

```endpoints
Shared.GetSharedRecipe at /recipes/get-shared
Shared.AddSharedCookingEntry at /entries/add-shared
Shared.EditSharedCookingEntry at /entries/edit-shared
```
