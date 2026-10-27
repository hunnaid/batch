# Collections


## Creating a collection

When a collection is created, its creator becomes its sharing owner, with no other members.[initialize] Collecting stores the collection, while Sharing manages who can access it.

A signed-in user creates a collection through the application endpoint.[create] The session determines the creator. Before returning success, the endpoint waits for the initialization reaction and verifies the creator's access.

[initialize]: reaction:Collections.InitializeCollectionSharing
[create]: reaction:Collections.CreateCollection

```endpoints
Collections.CreateCollection at /collections/create
```

## Sharing and recipients

The owner shares a collection by entering another registered user's username.[share] The endpoint checks the session and collection access, then looks up the recipient. Sharing checks ownership before adding them. An unknown username produces as error.

Only the owner can retrieve the current recipients.[recipients] The endpoint checks the session and ownership before returning member identifiers and usernames.[recipient-list] It excludes the owner and returns an empty list when nobody has been added. Reading it changes no records. Members and unrelated users cannot retrieve it.

Manage sharing shows a Revoke access button beside each recipient and a username field for adding someone else. The list updates after sharing or revoking access. If it fails to load, the page offers a retry instead of showing an empty list.

The owner can revoke a registered user's access.[revoke] This removes that user from the recipient list while preserving the collection, its recipes, and other recipients. The former member can no longer use that collection, and it disappears from their accessible collections list.

[share]: reaction:Collections.ShareCollection
[recipients]: reaction:Collections.ListCollectionRecipients
[recipient-list]: former:Collections.CollectionRecipients
[revoke]: reaction:Collections.RevokeCollectionAccess

```endpoints
Collections.ShareCollection at /collections/share
Collections.ListCollectionRecipients at /collections/recipients
Collections.RevokeCollectionAccess at /collections/revoke
```

## Listing collections

A signed-in user can list the collections they own or can access.[list] The overview includes each collection's name, owner, and recipe titles.[overview] Collections without recipes have an empty recipe list.

The collections tab shows only collections the user owns. Its search and empty state use that same list. Incoming shared collections appear in Shared. Owned collections shared with others appear in both tabs.

[list]: reaction:Collections.ListCollections
[overview]: former:Collections.AccessibleCollections

```endpoints
Collections.ListCollections at /collections/list
```

## Rename and delete

Only the owner can rename a collection.[rename] Renaming keeps its recipes and members unchanged.

Only the owner can delete a collection.[delete] The endpoint removed sharing first, then the collection. Recipes, cooking entries, personal saved, and direct recipe sharing remain stored. A recipe can still be opened through another collection, a personal save, or direct sharing. Without any of those, it is no longer accessible through the interface.

These are separate actions. If deleting the collection fails after sharing has been removed, the collection remains stored without collection access and needs repair.

[rename]: reaction:Collections.RenameCollection
[delete]: reaction:Collections.DeleteCollection

```endpoints
Collections.RenameCollection at /collections/rename
Collections.DeleteCollection at /collections/delete
```

Collection endpoints check input types before calling concept actions. Session inputs accept a token or null for a missing cookie. Names, collection identifiers, and recipient usernames must be strings.
