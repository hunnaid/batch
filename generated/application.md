<!-- Generated from the Application assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Application — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Collecting

Defined in [Collecting](../design/concepts/Collecting.md), line 1.

#### Actions

- `create(creator: User, name: String) : returns (collection: Collection)`
  - Refuses `INVALID_COLLECTION_NAME`: The collection name cannot be blank.
- `add(collection: Collection, item: Item) : returns ()`
  - Refuses `COLLECTION_NOT_FOUND`: The collection does not exist.
  - Refuses `ITEM_ALREADY_COLLECTED`: The item is already in the collection.
- `rename(collection: Collection, name: String) : returns ()`
  - Refuses `INVALID_COLLECTION_RENAME`: The collection name cannot be blank.
  - Refuses `RENAME_COLLECTION_NOT_FOUND`: The collection does not exist.
- `delete(collection: Collection) : returns ()`
  - Refuses `DELETE_COLLECTION_NOT_FOUND`: The collection does not exist.

#### Queries

- `_get(collection: Collection) : optional (creator: User, name: String, items: ItemSequence)`
- `_items(collection: Collection) : many (item: Item)`

#### Instances

- `Collecting` — instance of `Collecting` — [Application types](../design/types.md), line 9.
  - `Item` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 11.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 10.

### CookingLog

Defined in [CookingLog](../design/concepts/CookingLog.md), line 1.

#### Actions

- `record(author: User, recipe: Recipe, changes: String, result: String) : returns (entry: Entry)`
  - Refuses `INVALID_COOKING_ENTRY`: A cooking entry needs changes or a result.
- `edit(author: User, entry: Entry, changes: String, result: String) : returns ()`
  - Refuses `COOKING_ENTRY_NOT_FOUND`: The cooking entry does not exist.
  - Refuses `COOKING_ENTRY_NOT_OWNED`: Only the author can edit this cooking entry.
  - Refuses `INVALID_COOKING_ENTRY_EDIT`: A cooking entry needs changes or a result.

#### Queries

- `_get(entry: Entry) : optional (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)`
- `_forRecipe(recipe: Recipe) : many (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)`

#### Instances

- `CookingLog` — instance of `CookingLog` — [Application types](../design/types.md), line 12.
  - `Recipe` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 14.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 13.

### PasswordAuthenticating

Defined in [PasswordAuthenticating](../design/concepts/PasswordAuthenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (user: User)`
  - Refuses `INVALID_REGISTRATION`: Username and password cannot be blank.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `authenticate(username: String, password: String) : returns (user: User)`
  - Refuses `INVALID_CREDENTIALS`: Invalid username or password.

#### Queries

- `_byUsername(username: String) : optional (user: User)`

#### Instances

- `PasswordAuthenticating` — instance of `PasswordAuthenticating` — [Application types](../design/types.md), line 8.

### RecipeRecording

Defined in [RecipeRecording](../design/concepts/RecipeRecording.md), line 1.

#### Actions

- `record(title: String, ingredients: TextSequence, instructions: TextSequence, source?: String) : returns (recipe: Recipe)`
  - Refuses `INVALID_RECIPE`: Recipe details must include a nonblank title and nonempty ingredient and instruction sequences without blank items.

#### Queries

- `_get(recipe: Recipe) : optional (title: String, ingredients: TextSequence, instructions: TextSequence, source?: String)`

#### Instances

- `RecipeRecording` — instance of `RecipeRecording` — [Application types](../design/types.md), line 7.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(user: User) : returns (session: Session, expiresAt: DateTime)`
- `resolve(session: Session) : returns (user: User)`
  - Refuses `INVALID_SESSION`: The session is invalid or has expired.
- `end(session: Session) : returns ()`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 18.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 19.

### Sharing

Defined in [Sharing](../design/concepts/Sharing.md), line 1.

#### Actions

- `initialize(resource: Resource, owner: User) : returns ()`
  - Refuses `RESOURCE_ALREADY_INITIALIZED`: Sharing is already initialized for this resource.
- `grant(owner: User, resource: Resource, member: User) : returns ()`
  - Refuses `GRANT_RESOURCE_NOT_FOUND`: The resource does not exist.
  - Refuses `GRANT_NOT_OWNER`: Only the owner can grant access.
  - Refuses `CANNOT_GRANT_OWNER`: The owner already has access.
  - Refuses `MEMBER_ALREADY_ADDED`: The user already has access.
- `revoke(owner: User, resource: Resource, member: User) : returns ()`
  - Refuses `REVOKE_RESOURCE_NOT_FOUND`: The resource does not exist.
  - Refuses `REVOKE_NOT_OWNER`: Only the owner can revoke access.
  - Refuses `CANNOT_REVOKE_OWNER`: The owner's access cannot be revoked.
  - Refuses `MEMBER_NOT_ADDED`: The user is not a member of this resource.
- `authorize(user: User, resource: Resource) : returns ()`
  - Refuses `ACCESS_DENIED`: You do not have access to this resource.
- `authorizeOwner(user: User, resource: Resource) : returns ()`
  - Refuses `OWNER_ACCESS_REQUIRED`: Only the owner can perform this action.
- `uninitialize(resource: Resource, owner: User) : returns ()`
  - Refuses `CANNOT_UNINITIALIZE_RESOURCE`: Only the owner can remove sharing for an existing resource.

#### Queries

- `_accessible(user: User) : many (resource: Resource, owner: User)`

#### Instances

- `Sharing` — instance of `Sharing` — [Application types](../design/types.md), line 15.
  - `Resource` is `Collecting.Collection` — [Application types](../design/types.md), line 17.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 16.

## Views

_Views name reusable conditions. Multiple `where` blocks are alternatives._

### (entry) belongs to (recipe)

Authored path: `Recipes.EntryInRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 93.

```view
(entry) belongs to (recipe) — inputs (entry, recipe); outputs (); bindings ()
  where CookingLog._get (entry) has (recipe)
```

### (recipe) belongs to (collection)

Authored path: `Recipes.RecipeInCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 88.

```view
(recipe) belongs to (collection) — inputs (collection, recipe); outputs (); bindings ()
  where Collecting._items (collection) has (item: recipe)
```

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the accessible collections of (user)

Authored path: `Collections.AccessibleCollections`.
- Covered by [Collections](../design/compositions/Collections.md), line 32.

```former
Former "the accessible collections of (user)" — inputs (user); bindings (collection, owner, name, recipe, title); promises exactly one record — forms:
  a record of
    collections: each Sharing._accessible (user) has (owner, resource: collection)
      where Collecting._get (collection) has (name)
      form a record of
        collection
        name
        owner
        recipes: each Collecting._items (collection) has (item: recipe)
          where RecipeRecording._get (recipe) has (title)
          form a record of
            recipe
            title
```

### the recipe (recipe) in collection (collection)

Authored path: `Recipes.RecipeDetails`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 19.

```former
Former "the recipe (recipe) in collection (collection)" — inputs (collection, recipe); bindings (title, ingredients, instructions, source, entry, author, changes, result, createdAt); promises at most one record — forms:
  a record of
    where Collecting._items (collection) has (item: recipe)
    where RecipeRecording._get (recipe) has (ingredients, instructions, title)
    where whether RecipeRecording._get (recipe) has (source)
    entries: each CookingLog._forRecipe (recipe) has (_id: entry, author, changes, createdAt, result)
      form a record of
        author
        changes
        createdAt
        entry
        result
    ingredients
    instructions
    recipe
    source
    title
```

## Reactions

### Accounts.CurrentUser

Authored path: `Accounts.CurrentUser`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 9.
- Covered by [Accounts](../design/compositions/Accounts.md), line 22.

```reaction
when RequestBoundary.request (path: "/sessions/current", requestId, session)
then
  Sessioning.resolve (session)
```

### Accounts.CurrentUser#2

Authored path: `Accounts.CurrentUser`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 9.
- Covered by [Accounts](../design/compositions/Accounts.md), line 22.

```reaction
when Sessioning.resolve (session, user), asked by Accounts.CurrentUser
where
  earlier, RequestBoundary.request (path: "/sessions/current", requestId, session)
then
  RequestBoundary.respond (requestId, user)
```

### Accounts.Login

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 21.

```reaction
when RequestBoundary.request (password, path: "/sessions/start", requestId, username)
then
  PasswordAuthenticating.authenticate (password, username)
```

### Accounts.Login#2

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 21.

```reaction
when PasswordAuthenticating.authenticate (password, username, user), asked by Accounts.Login
then
  Sessioning.start (user)
```

### Accounts.Login#3

Authored path: `Accounts.Login`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 7.
- Covered by [Accounts](../design/compositions/Accounts.md), line 21.

```reaction
when Sessioning.start (user, expiresAt, session), asked by Accounts.Login#2
where
  earlier, RequestBoundary.request (password, path: "/sessions/start", requestId, username)
then
  RequestBoundary.respond (expiresAt, requestId, session, user)
```

### Accounts.Logout

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 10.
- Covered by [Accounts](../design/compositions/Accounts.md), line 23.

```reaction
when RequestBoundary.request (path: "/sessions/end", requestId, session)
then
  Sessioning.end (session)
```

### Accounts.Logout#2

Authored path: `Accounts.Logout`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 10.
- Covered by [Accounts](../design/compositions/Accounts.md), line 23.

```reaction
when Sessioning.end (session), asked by Accounts.Logout
where
  earlier, RequestBoundary.request (path: "/sessions/end", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### Accounts.Register

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 3.
- Covered by [Accounts](../design/compositions/Accounts.md), line 20.

```reaction
when RequestBoundary.request (password, path: "/accounts/register", requestId, username)
then
  PasswordAuthenticating.register (password, username)
```

### Accounts.Register#2

Authored path: `Accounts.Register`.
- Covered by [Accounts](../design/compositions/Accounts.md), line 3.
- Covered by [Accounts](../design/compositions/Accounts.md), line 20.

```reaction
when PasswordAuthenticating.register (password, username, user), asked by Accounts.Register
where
  earlier, RequestBoundary.request (password, path: "/accounts/register", requestId, username)
then
  RequestBoundary.respond (requestId, user)
```

### Collections.CreateCollection

Authored path: `Collections.CreateCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 9.
- Covered by [Collections](../design/compositions/Collections.md), line 16.

```reaction
when RequestBoundary.request (name, path: "/collections/create", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.CreateCollection#2

Authored path: `Collections.CreateCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 9.
- Covered by [Collections](../design/compositions/Collections.md), line 16.

```reaction
when Sessioning.resolve (session, user), asked by Collections.CreateCollection
where
  earlier, RequestBoundary.request (name, path: "/collections/create", requestId, session)
then
  Collecting.create (creator: user, name)
```

### Collections.CreateCollection#3

Authored path: `Collections.CreateCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 9.
- Covered by [Collections](../design/compositions/Collections.md), line 16.

```reaction
when Collecting.create (creator: user, name, collection), asked by Collections.CreateCollection#2
at the flow's settlement frontier
then
  Sharing.authorize (resource: collection, user)
```

### Collections.CreateCollection#4

Authored path: `Collections.CreateCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 9.
- Covered by [Collections](../design/compositions/Collections.md), line 16.

```reaction
when Sharing.authorize (resource: collection, user), asked by Collections.CreateCollection#3
where
  earlier, RequestBoundary.request (name, path: "/collections/create", requestId, session)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.DeleteCollection

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 62.
- Covered by [Collections](../design/compositions/Collections.md), line 75.

```reaction
when RequestBoundary.request (collection, path: "/collections/delete", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.DeleteCollection#2

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 62.
- Covered by [Collections](../design/compositions/Collections.md), line 75.

```reaction
when Sessioning.resolve (session, user), asked by Collections.DeleteCollection
where
  earlier, RequestBoundary.request (collection, path: "/collections/delete", requestId, session)
then
  Sharing.uninitialize (owner: user, resource: collection)
```

### Collections.DeleteCollection#3

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 62.
- Covered by [Collections](../design/compositions/Collections.md), line 75.

```reaction
when Sharing.uninitialize (owner: user, resource: collection), asked by Collections.DeleteCollection#2
then
  Collecting.delete (collection)
```

### Collections.DeleteCollection#4

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 62.
- Covered by [Collections](../design/compositions/Collections.md), line 75.

```reaction
when Collecting.delete (collection), asked by Collections.DeleteCollection#3
where
  earlier, RequestBoundary.request (collection, path: "/collections/delete", requestId, session)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.InitializeCollectionSharing

Authored path: `Collections.InitializeCollectionSharing`.
- Covered by [Collections](../design/compositions/Collections.md), line 4.

```reaction
when Collecting.create (creator, collection)
then
  Sharing.initialize (owner: creator, resource: collection)
```

### Collections.ListCollections

Authored path: `Collections.ListCollections`.
- Covered by [Collections](../design/compositions/Collections.md), line 30.
- Covered by [Collections](../design/compositions/Collections.md), line 40.

```reaction
when RequestBoundary.request (path: "/collections/list", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.ListCollections#2

Authored path: `Collections.ListCollections`.
- Covered by [Collections](../design/compositions/Collections.md), line 30.
- Covered by [Collections](../design/compositions/Collections.md), line 40.

```reaction
when Sessioning.resolve (session, user), asked by Collections.ListCollections
where
  earlier, RequestBoundary.request (path: "/collections/list", requestId, session)
then
  RequestBoundary.respond (overview: former "the accessible collections of (user)" with (user), requestId)
```

### Collections.RenameCollection

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 59.
- Covered by [Collections](../design/compositions/Collections.md), line 74.

```reaction
when RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.RenameCollection#2

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 59.
- Covered by [Collections](../design/compositions/Collections.md), line 74.

```reaction
when Sessioning.resolve (session, user), asked by Collections.RenameCollection
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Sharing.authorizeOwner (resource: collection, user)
```

### Collections.RenameCollection#3

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 59.
- Covered by [Collections](../design/compositions/Collections.md), line 74.

```reaction
when Sharing.authorizeOwner (resource: collection, user), asked by Collections.RenameCollection#2
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Collecting.rename (collection, name)
```

### Collections.RenameCollection#4

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 59.
- Covered by [Collections](../design/compositions/Collections.md), line 74.

```reaction
when Collecting.rename (collection, name), asked by Collections.RenameCollection#3
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.RevokeCollectionAccess

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 43.
- Covered by [Collections](../design/compositions/Collections.md), line 51.

```reaction
when RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  Sessioning.resolve (session)
```

### Collections.RevokeCollectionAccess#2

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 43.
- Covered by [Collections](../design/compositions/Collections.md), line 51.

```reaction
when Sessioning.resolve (session, user: owner), asked by Collections.RevokeCollectionAccess
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  Sharing.authorize (resource: collection, user: owner)
```

### Collections.RevokeCollectionAccess:registered-recipient#3

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 43.
- Covered by [Collections](../design/compositions/Collections.md), line 51.

```reaction
when Sharing.authorize (resource: collection, user: owner), asked by Collections.RevokeCollectionAccess#2
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
  PasswordAuthenticating._byUsername (username) has (user: member)
then
  Sharing.revoke (member, owner, resource: collection)
```

### Collections.RevokeCollectionAccess:registered-recipient#4

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 43.
- Covered by [Collections](../design/compositions/Collections.md), line 51.

```reaction
when Sharing.revoke (member, owner, resource: collection), asked by Collections.RevokeCollectionAccess:registered-recipient#3
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.RevokeCollectionAccess:unknown-recipient#3

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 43.
- Covered by [Collections](../design/compositions/Collections.md), line 51.

```reaction
when Sharing.authorize (resource: collection, user: owner), asked by Collections.RevokeCollectionAccess#2
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
  no PasswordAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "RECIPIENT_NOT_FOUND", requestId)
```

### Collections.ShareCollection

Authored path: `Collections.ShareCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 20.
- Covered by [Collections](../design/compositions/Collections.md), line 27.

```reaction
when RequestBoundary.request (collection, path: "/collections/share", requestId, session, username)
then
  Sessioning.resolve (session)
```

### Collections.ShareCollection#2

Authored path: `Collections.ShareCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 20.
- Covered by [Collections](../design/compositions/Collections.md), line 27.

```reaction
when Sessioning.resolve (session, user: owner), asked by Collections.ShareCollection
where
  earlier, RequestBoundary.request (collection, path: "/collections/share", requestId, session, username)
then
  Sharing.authorize (resource: collection, user: owner)
```

### Collections.ShareCollection:registered-recipient#3

Authored path: `Collections.ShareCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 20.
- Covered by [Collections](../design/compositions/Collections.md), line 27.

```reaction
when Sharing.authorize (resource: collection, user: owner), asked by Collections.ShareCollection#2
where
  earlier, RequestBoundary.request (collection, path: "/collections/share", requestId, session, username)
  PasswordAuthenticating._byUsername (username) has (user: member)
then
  Sharing.grant (member, owner, resource: collection)
```

### Collections.ShareCollection:registered-recipient#4

Authored path: `Collections.ShareCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 20.
- Covered by [Collections](../design/compositions/Collections.md), line 27.

```reaction
when Sharing.grant (member, owner, resource: collection), asked by Collections.ShareCollection:registered-recipient#3
where
  earlier, RequestBoundary.request (collection, path: "/collections/share", requestId, session, username)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.ShareCollection:unknown-recipient#3

Authored path: `Collections.ShareCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 20.
- Covered by [Collections](../design/compositions/Collections.md), line 27.

```reaction
when Sharing.authorize (resource: collection, user: owner), asked by Collections.ShareCollection#2
where
  earlier, RequestBoundary.request (collection, path: "/collections/share", requestId, session, username)
  no PasswordAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "RECIPIENT_NOT_FOUND", requestId)
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Recipes.AddCookingEntry

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 34.
- Covered by [Recipes](../design/compositions/Recipes.md), line 41.

```reaction
when RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.AddCookingEntry#2

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 34.
- Covered by [Recipes](../design/compositions/Recipes.md), line 41.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.AddCookingEntry
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.AddCookingEntry:recipe-in-collection#3

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 34.
- Covered by [Recipes](../design/compositions/Recipes.md), line 41.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.AddCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
  view "(recipe) belongs to (collection)" with (collection, recipe)
then
  CookingLog.record (author: user, changes, recipe, result)
```

### Recipes.AddCookingEntry:recipe-in-collection#4

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 34.
- Covered by [Recipes](../design/compositions/Recipes.md), line 41.

```reaction
when CookingLog.record (author: user, changes, recipe, result, entry), asked by Recipes.AddCookingEntry:recipe-in-collection#3
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.AddCookingEntry:recipe-not-in-collection#3

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 34.
- Covered by [Recipes](../design/compositions/Recipes.md), line 41.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.AddCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
  no view "(recipe) belongs to (collection)" with (collection, recipe)
then
  RequestBoundary.respond (error: "RECIPE_NOT_IN_COLLECTION", requestId)
```

### Recipes.AddRecipeToCollection

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
then
  Sessioning.resolve (session)
```

### Recipes.AddRecipeToCollection#2

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.AddRecipeToCollection
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
then
  Sharing.authorize (resource: sourceCollection, user)
```

### Recipes.AddRecipeToCollection#3

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when Sharing.authorize (resource: sourceCollection, user), asked by Recipes.AddRecipeToCollection#2
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
then
  Sharing.authorize (resource: destinationCollection, user)
```

### Recipes.AddRecipeToCollection:recipe-in-source#4

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when Sharing.authorize (resource: destinationCollection, user), asked by Recipes.AddRecipeToCollection#3
where
  earlier, Sharing.authorize (resource: sourceCollection, user), asked by Recipes.AddRecipeToCollection#2
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
  view "(recipe) belongs to (collection)" with (collection: sourceCollection, recipe)
then
  Collecting.add (collection: destinationCollection, item: recipe)
```

### Recipes.AddRecipeToCollection:recipe-in-source#5

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when Collecting.add (collection: destinationCollection, item: recipe), asked by Recipes.AddRecipeToCollection:recipe-in-source#4
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
then
  RequestBoundary.respond (collection: destinationCollection, recipe, requestId)
```

### Recipes.AddRecipeToCollection:recipe-not-in-source#4

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 64.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when Sharing.authorize (resource: destinationCollection, user), asked by Recipes.AddRecipeToCollection#3
where
  earlier, Sharing.authorize (resource: sourceCollection, user), asked by Recipes.AddRecipeToCollection#2
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
  no view "(recipe) belongs to (collection)" with (collection: sourceCollection, recipe)
then
  RequestBoundary.respond (error: "RECIPE_NOT_IN_COLLECTION", requestId)
```

### Recipes.EditCookingEntry

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.EditCookingEntry#2

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.EditCookingEntry
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.EditCookingEntry:entry-in-collection#3

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.EditCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
  view "(recipe) belongs to (collection)" with (collection, recipe)
  view "(entry) belongs to (recipe)" with (entry, recipe)
then
  CookingLog.edit (author: user, changes, entry, result)
```

### Recipes.EditCookingEntry:entry-in-collection#4

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when CookingLog.edit (author: user, changes, entry, result), asked by Recipes.EditCookingEntry:entry-in-collection#3
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.EditCookingEntry:entry-not-in-recipe#3

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.EditCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
  view "(recipe) belongs to (collection)" with (collection, recipe)
  no view "(entry) belongs to (recipe)" with (entry, recipe)
then
  RequestBoundary.respond (error: "ENTRY_NOT_IN_RECIPE", requestId)
```

### Recipes.EditCookingEntry:recipe-not-in-collection#3

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 44.
- Covered by [Recipes](../design/compositions/Recipes.md), line 53.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.EditCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
  no view "(recipe) belongs to (collection)" with (collection, recipe)
then
  RequestBoundary.respond (error: "RECIPE_NOT_IN_COLLECTION", requestId)
```

### Recipes.GetRecipe

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 17.
- Covered by [Recipes](../design/compositions/Recipes.md), line 26.

```reaction
when RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.GetRecipe#2

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 17.
- Covered by [Recipes](../design/compositions/Recipes.md), line 26.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.GetRecipe
where
  earlier, RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.GetRecipe#3

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 17.
- Covered by [Recipes](../design/compositions/Recipes.md), line 26.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.GetRecipe#2
where
  earlier, RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  RequestBoundary.respond (recipe: former "the recipe (recipe) in collection (collection)" with (collection, recipe), requestId)
```

### Recipes.SaveRecipe

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 14.

```reaction
when RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  Sessioning.resolve (session)
```

### Recipes.SaveRecipe#2

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 14.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.SaveRecipe
where
  earlier, RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.SaveRecipe#3

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 14.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.SaveRecipe#2
where
  earlier, RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  RecipeRecording.record (ingredients, instructions, source, title)
```

### Recipes.SaveRecipe#4

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 14.

```reaction
when RecipeRecording.record (ingredients, instructions, source, title, recipe), asked by Recipes.SaveRecipe#3
where
  earlier, Sharing.authorize (resource: collection, user), asked by Recipes.SaveRecipe#2
then
  Collecting.add (collection, item: recipe)
```

### Recipes.SaveRecipe#5

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 14.

```reaction
when Collecting.add (collection, item: recipe), asked by Recipes.SaveRecipe#4
where
  earlier, RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  RequestBoundary.respond (recipe, requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/accounts/register` — requires `password`, `username`
- `/collections/create` — requires `name`, `session`
- `/collections/delete` — requires `collection`, `session`
- `/collections/list` — requires `session`
- `/collections/rename` — requires `collection`, `name`, `session`
- `/collections/revoke` — requires `collection`, `session`, `username`
- `/collections/share` — requires `collection`, `session`, `username`
- `/entries/add` — requires `changes`, `collection`, `recipe`, `result`, `session`
- `/entries/edit` — requires `changes`, `collection`, `entry`, `recipe`, `result`, `session`
- `/recipes/add-to-collection` — requires `destinationCollection`, `recipe`, `session`, `sourceCollection`
- `/recipes/get` — requires `collection`, `recipe`, `session`
- `/recipes/save` — requires `session`, `collection`, `title`, `ingredients`, `instructions`; fills `source` with "" when absent
- `/sessions/current` — requires `session`
- `/sessions/end` — requires `session`
- `/sessions/start` — requires `password`, `username`
