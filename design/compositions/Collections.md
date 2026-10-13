# Collections

When a collection is successfully created, its creator becomes its sharing
owner, with no additional members.[initialize] This connects collection
organization to access management while keeping their concepts independent.

[initialize]: reaction:Collections.InitializeCollectionSharing

A signed-in user creates a collection through the application endpoint.[create]
The session determines the creator. Before returning success, the endpoint
waits for the initialization reaction and verifies the creator's access.

[create]: reaction:Collections.CreateCollection

```endpoints
Collections.CreateCollection at /collections/create
```

A collection owner grants access by entering another registered user's
username.[share] The endpoint resolves the signed-in user, checks collection
access, and looks up the recipient. Sharing enforces ownership before adding
the recipient as a member. Unknown usernames produce an error response.

[share]: reaction:Collections.ShareCollection

```endpoints
Collections.ShareCollection at /collections/share
```

A signed-in user lists their accessible collections.[list]
The collections overview combines owned and shared resources with collection
names and recipe titles.[overview] Each collection includes its owner so the
interface can distinguish owned collections from shared ones. Empty lists
remain visible as empty arrays.

[list]: reaction:Collections.ListCollections
[overview]: former:Collections.AccessibleCollections

```endpoints
Collections.ListCollections at /collections/list
```

The owner can withdraw a registered user's collection access.[revoke]
Revoking membership leaves the collection and its contents intact. The former
member can no longer access it through that collection, and it disappears
from their accessible collections list.

[revoke]: reaction:Collections.RevokeCollectionAccess

```endpoints
Collections.RevokeCollectionAccess at /collections/revoke
```

Collection endpoints validate input types before invoking concept actions.
Session inputs accept a token or null for a missing cookie. Collection
creation requires a string name; sharing and revocation require string
collection identifiers and usernames.

Only the collection owner can rename a collection.[rename]
Renaming preserves its recipes and membership.

Only the owner can delete a collection.[delete] Deletion first removes its
sharing information, then removes the collection. Recipes and cooking entries
remain stored, preserving any use through other collections. Recipes with no
remaining collection are no longer discoverable through the interface.

These steps are not transactional. If collection deletion fails after sharing
is removed, the collection remains stored without access and requires repair.

[rename]: reaction:Collections.RenameCollection
[delete]: reaction:Collections.DeleteCollection

```endpoints
Collections.RenameCollection at /collections/rename
Collections.DeleteCollection at /collections/delete
```
