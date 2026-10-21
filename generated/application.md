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
- `remove(collection: Collection, item: Item) : returns ()`
  - Refuses `REMOVE_COLLECTION_NOT_FOUND`: The collection does not exist.
  - Refuses `ITEM_NOT_COLLECTED`: The item is not in the collection.
- `removeItem(item: Item) : returns ()`

#### Queries

- `_get(collection: Collection) : optional (creator: User, name: String, items: ItemSequence)`
- `_items(collection: Collection) : many (item: Item)`

#### Instances

- `Collecting` — instance of `Collecting` — [Application types](../design/types.md), line 22.
  - `Item` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 24.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 23.

### CookingLog

Defined in [CookingLog](../design/concepts/CookingLog.md), line 1.

#### Actions

- `record(author: User, recipe: Recipe, changes: String, result: String) : returns (entry: Entry)`
  - Refuses `INVALID_COOKING_ENTRY`: A cooking entry needs changes or a result.
- `edit(author: User, entry: Entry, changes: String, result: String) : returns ()`
  - Refuses `COOKING_ENTRY_NOT_FOUND`: The cooking entry does not exist.
  - Refuses `COOKING_ENTRY_NOT_OWNED`: Only the author can edit this cooking entry.
  - Refuses `INVALID_COOKING_ENTRY_EDIT`: A cooking entry needs changes or a result.
- `clearRecipe(recipe: Recipe) : returns ()`

#### Queries

- `_get(entry: Entry) : optional (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)`
- `_forRecipe(recipe: Recipe) : many (_id: Entry, author: User, recipe: Recipe, changes: String, result: String, createdAt: DateTime)`

#### Instances

- `CookingLog` — instance of `CookingLog` — [Application types](../design/types.md), line 26.
  - `Recipe` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 28.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 27.

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
- `_byUser(user: User) : optional (username: String)`

#### Instances

- `PasswordAuthenticating` — instance of `PasswordAuthenticating` — [Application types](../design/types.md), line 13.

### Profiling

Defined in [Profiling](../design/concepts/Profiling.md), line 1.

#### Actions

- `create(user: User, displayName: String, bio: String, picture: String) : returns ()`
  - Refuses `INVALID_PROFILE`: The profile details are invalid.
  - Refuses `PROFILE_ALREADY_EXISTS`: The user already has a profile.
- `update(user: User, displayName: String, bio: String, picture: String) : returns ()`
  - Refuses `INVALID_PROFILE`: The profile details are invalid.
  - Refuses `PROFILE_NOT_FOUND`: The profile does not exist.

#### Queries

- `_get(user: User) : optional (displayName: String, bio: String, picture: String)`

#### Instances

- `Profiling` — instance of `Profiling` — [Application types](../design/types.md), line 15.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 16.

### RecipeRecording

Defined in [RecipeRecording](../design/concepts/RecipeRecording.md), line 1.

#### Actions

- `record(title: String, ingredients: TextSequence, instructions: TextSequence, source?: String) : returns (recipe: Recipe)`
  - Refuses `INVALID_RECIPE`: Recipe details must include a nonblank title and nonempty ingredient and instruction sequences without blank items.
- `delete(recipe: Recipe) : returns ()`
  - Refuses `DELETE_RECIPE_NOT_FOUND`: The recipe does not exist.

#### Queries

- `_get(recipe: Recipe) : optional (title: String, ingredients: TextSequence, instructions: TextSequence, source?: String)`

#### Instances

- `RecipeRecording` — instance of `RecipeRecording` — [Application types](../design/types.md), line 11.

### Saving

Defined in [Saving](../design/concepts/Saving.md), line 1.

#### Actions

- `save(user: User, item: Item) : returns ()`
- `authorize(user: User, item: Item) : returns ()`
  - Refuses `ITEM_NOT_SAVED`: This item is not in your saved list.
- `removeItem(item: Item) : returns ()`

#### Queries

- `_forUser(user: User) : many (item: Item, savedAt: DateTime)`

#### Instances

- `Saving` — instance of `Saving` — [Application types](../design/types.md), line 18.
  - `Item` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 20.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 19.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(user: User) : returns (session: Session, expiresAt: DateTime)`
- `resolve(session: Session) : returns (user: User)`
  - Refuses `INVALID_SESSION`: The session is invalid or has expired.
- `end(session: Session) : returns ()`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Application types](../design/types.md), line 38.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 39.

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
- `_get(resource: Resource) : optional (owner: User)`
- `_shared(user: User) : many (resource: Resource, owner: User)`

#### Instances

- `RecipeSharing` — instance of `Sharing` — [Application types](../design/types.md), line 34.
  - `Resource` is `RecipeRecording.Recipe` — [Application types](../design/types.md), line 36.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 35.
- `Sharing` — instance of `Sharing` — [Application types](../design/types.md), line 30.
  - `Resource` is `Collecting.Collection` — [Application types](../design/types.md), line 32.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 31.

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

### (user) owns direct sharing of (recipe)

Authored path: `Shared.RecipeOwner`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 33.

```view
(user) owns direct sharing of (recipe) — inputs (user, recipe); outputs (); bindings ()
  where RecipeSharing._get (resource: recipe) has (owner: user)
```

### (user) personally saved (recipe) before direct ownership existed

Authored path: `Shared.LegacyRecipeOwner`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 45.

```view
(user) personally saved (recipe) before direct ownership existed — inputs (user, recipe); outputs (); bindings ()
  where
    Saving._forUser (user) has (item: recipe)
    RecipeRecording._get (recipe)
    no RecipeSharing._get (resource: recipe)
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

### the directly shared recipe (recipe) accessible to (user)

Authored path: `Shared.DirectRecipeDetails`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 74.

```former
Former "the directly shared recipe (recipe) accessible to (user)" — inputs (user, recipe); bindings (title, ingredients, instructions, source, entry, author, changes, result, createdAt); promises at most one record — forms:
  a record of
    where RecipeSharing._accessible (user) has (resource: recipe)
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

### the profile of (user)

Authored path: `Profiles.ProfileDetails`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 12.

```former
Former "the profile of (user)" — inputs (user); bindings (displayName, bio, picture); promises at most one record — forms:
  a record of
    where Profiling._get (user) has (bio, displayName, picture)
    bio
    displayName
    picture
```

### the presentation of (user)

Authored path: `Profiles.Identity`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 11.

```former
Former "the presentation of (user)" — inputs (user); bindings (username); promises at most one record — forms:
  a record of
    where PasswordAuthenticating._byUser (user) has (username)
    profile: whether former "the profile of (user)" with (user)
    user
    username
```

### the recipe (recipe) in collection (collection)

Authored path: `Recipes.RecipeDetails`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 20.

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

### the saved recipe (recipe) of (user)

Authored path: `Recipes.SavedRecipeDetails`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 127.

```former
Former "the saved recipe (recipe) of (user)" — inputs (user, recipe); bindings (title, ingredients, instructions, source, entry, author, changes, result, createdAt); promises at most one record — forms:
  a record of
    where Saving._forUser (user) has (item: recipe)
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

### the saved recipes of (user)

Authored path: `Recipes.PersonalRecipes`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 109.

```former
Former "the saved recipes of (user)" — inputs (user); bindings (recipe, title, savedAt); promises exactly one record — forms:
  a record of
    recipes: each Saving._forUser (user) has (item: recipe, savedAt)
      where RecipeRecording._get (recipe) has (title)
      form a record of
        recipe
        savedAt
        title
```

### the shared collections and individual recipes of (user)

Authored path: `Shared.SharedOverview`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 4.

```former
Former "the shared collections and individual recipes of (user)" — inputs (user); bindings (collection, owner, name, recipe, title); promises exactly one record — forms:
  a record of
    collections: each Sharing._shared (user) has (owner, resource: collection)
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
    recipes: each RecipeSharing._shared (user) has (owner, resource: recipe)
      where RecipeRecording._get (recipe) has (title)
      form a record of
        owner
        recipe
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
- Covered by [Collections](../design/compositions/Collections.md), line 67.
- Covered by [Collections](../design/compositions/Collections.md), line 83.

```reaction
when RequestBoundary.request (collection, path: "/collections/delete", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.DeleteCollection#2

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 67.
- Covered by [Collections](../design/compositions/Collections.md), line 83.

```reaction
when Sessioning.resolve (session, user), asked by Collections.DeleteCollection
where
  earlier, RequestBoundary.request (collection, path: "/collections/delete", requestId, session)
then
  Sharing.uninitialize (owner: user, resource: collection)
```

### Collections.DeleteCollection#3

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 67.
- Covered by [Collections](../design/compositions/Collections.md), line 83.

```reaction
when Sharing.uninitialize (owner: user, resource: collection), asked by Collections.DeleteCollection#2
then
  Collecting.delete (collection)
```

### Collections.DeleteCollection#4

Authored path: `Collections.DeleteCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 67.
- Covered by [Collections](../design/compositions/Collections.md), line 83.

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
- Covered by [Collections](../design/compositions/Collections.md), line 45.

```reaction
when RequestBoundary.request (path: "/collections/list", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.ListCollections#2

Authored path: `Collections.ListCollections`.
- Covered by [Collections](../design/compositions/Collections.md), line 30.
- Covered by [Collections](../design/compositions/Collections.md), line 45.

```reaction
when Sessioning.resolve (session, user), asked by Collections.ListCollections
where
  earlier, RequestBoundary.request (path: "/collections/list", requestId, session)
then
  RequestBoundary.respond (overview: former "the accessible collections of (user)" with (user), requestId)
```

### Collections.RenameCollection

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 64.
- Covered by [Collections](../design/compositions/Collections.md), line 82.

```reaction
when RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Sessioning.resolve (session)
```

### Collections.RenameCollection#2

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 64.
- Covered by [Collections](../design/compositions/Collections.md), line 82.

```reaction
when Sessioning.resolve (session, user), asked by Collections.RenameCollection
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Sharing.authorizeOwner (resource: collection, user)
```

### Collections.RenameCollection#3

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 64.
- Covered by [Collections](../design/compositions/Collections.md), line 82.

```reaction
when Sharing.authorizeOwner (resource: collection, user), asked by Collections.RenameCollection#2
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  Collecting.rename (collection, name)
```

### Collections.RenameCollection#4

Authored path: `Collections.RenameCollection`.
- Covered by [Collections](../design/compositions/Collections.md), line 64.
- Covered by [Collections](../design/compositions/Collections.md), line 82.

```reaction
when Collecting.rename (collection, name), asked by Collections.RenameCollection#3
where
  earlier, RequestBoundary.request (collection, name, path: "/collections/rename", requestId, session)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.RevokeCollectionAccess

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 48.
- Covered by [Collections](../design/compositions/Collections.md), line 56.

```reaction
when RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  Sessioning.resolve (session)
```

### Collections.RevokeCollectionAccess#2

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 48.
- Covered by [Collections](../design/compositions/Collections.md), line 56.

```reaction
when Sessioning.resolve (session, user: owner), asked by Collections.RevokeCollectionAccess
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  Sharing.authorize (resource: collection, user: owner)
```

### Collections.RevokeCollectionAccess:registered-recipient#3

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 48.
- Covered by [Collections](../design/compositions/Collections.md), line 56.

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
- Covered by [Collections](../design/compositions/Collections.md), line 48.
- Covered by [Collections](../design/compositions/Collections.md), line 56.

```reaction
when Sharing.revoke (member, owner, resource: collection), asked by Collections.RevokeCollectionAccess:registered-recipient#3
where
  earlier, RequestBoundary.request (collection, path: "/collections/revoke", requestId, session, username)
then
  RequestBoundary.respond (collection, requestId)
```

### Collections.RevokeCollectionAccess:unknown-recipient#3

Authored path: `Collections.RevokeCollectionAccess`.
- Covered by [Collections](../design/compositions/Collections.md), line 48.
- Covered by [Collections](../design/compositions/Collections.md), line 56.

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

### Profiles.GetMyProfile

Authored path: `Profiles.GetMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 8.
- Covered by [Profiles](../design/compositions/Profiles.md), line 54.

```reaction
when RequestBoundary.request (path: "/profiles/me", requestId, session)
then
  Sessioning.resolve (session)
```

### Profiles.GetMyProfile#2

Authored path: `Profiles.GetMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 8.
- Covered by [Profiles](../design/compositions/Profiles.md), line 54.

```reaction
when Sessioning.resolve (session, user), asked by Profiles.GetMyProfile
where
  earlier, RequestBoundary.request (path: "/profiles/me", requestId, session)
then
  RequestBoundary.respond (identity: former "the presentation of (user)" with (user), requestId)
```

### Profiles.GetProfile

Authored path: `Profiles.GetProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 10.
- Covered by [Profiles](../design/compositions/Profiles.md), line 55.

```reaction
when RequestBoundary.request (path: "/profiles/get", requestId, session, user)
then
  Sessioning.resolve (session)
```

### Profiles.GetProfile#2

Authored path: `Profiles.GetProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 10.
- Covered by [Profiles](../design/compositions/Profiles.md), line 55.

```reaction
when Sessioning.resolve (session, user: viewer), asked by Profiles.GetProfile
where
  earlier, RequestBoundary.request (path: "/profiles/get", requestId, session, user)
then
  RequestBoundary.respond (identity: former "the presentation of (user)" with (user), requestId)
```

### Profiles.SaveMyProfile

Authored path: `Profiles.SaveMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 17.
- Covered by [Profiles](../design/compositions/Profiles.md), line 56.

```reaction
when RequestBoundary.request (bio, displayName, path: "/profiles/save", picture, requestId, session)
then
  Sessioning.resolve (session)
```

### Profiles.SaveMyProfile:create-profile#2

Authored path: `Profiles.SaveMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 17.
- Covered by [Profiles](../design/compositions/Profiles.md), line 56.

```reaction
when Sessioning.resolve (session, user), asked by Profiles.SaveMyProfile
where
  no Profiling._get (user)
  earlier, RequestBoundary.request (bio, displayName, path: "/profiles/save", picture, requestId, session)
then
  Profiling.create (bio, displayName, picture, user)
```

### Profiles.SaveMyProfile:create-profile#3

Authored path: `Profiles.SaveMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 17.
- Covered by [Profiles](../design/compositions/Profiles.md), line 56.

```reaction
when Profiling.create (bio, displayName, picture, user), asked by Profiles.SaveMyProfile:create-profile#2
where
  earlier, RequestBoundary.request (bio, displayName, path: "/profiles/save", picture, requestId, session)
then
  RequestBoundary.respond (identity: former "the presentation of (user)" with (user), requestId)
```

### Profiles.SaveMyProfile:update-profile#2

Authored path: `Profiles.SaveMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 17.
- Covered by [Profiles](../design/compositions/Profiles.md), line 56.

```reaction
when Sessioning.resolve (session, user), asked by Profiles.SaveMyProfile
where
  Profiling._get (user)
  earlier, RequestBoundary.request (bio, displayName, path: "/profiles/save", picture, requestId, session)
then
  Profiling.update (bio, displayName, picture, user)
```

### Profiles.SaveMyProfile:update-profile#3

Authored path: `Profiles.SaveMyProfile`.
- Covered by [Profiles](../design/compositions/Profiles.md), line 17.
- Covered by [Profiles](../design/compositions/Profiles.md), line 56.

```reaction
when Profiling.update (bio, displayName, picture, user), asked by Profiles.SaveMyProfile:update-profile#2
where
  earlier, RequestBoundary.request (bio, displayName, path: "/profiles/save", picture, requestId, session)
then
  RequestBoundary.respond (identity: former "the presentation of (user)" with (user), requestId)
```

### Recipes.AddCookingEntry

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 35.
- Covered by [Recipes](../design/compositions/Recipes.md), line 42.

```reaction
when RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.AddCookingEntry#2

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 35.
- Covered by [Recipes](../design/compositions/Recipes.md), line 42.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.AddCookingEntry
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.AddCookingEntry:recipe-in-collection#3

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 35.
- Covered by [Recipes](../design/compositions/Recipes.md), line 42.

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
- Covered by [Recipes](../design/compositions/Recipes.md), line 35.
- Covered by [Recipes](../design/compositions/Recipes.md), line 42.

```reaction
when CookingLog.record (author: user, changes, recipe, result, entry), asked by Recipes.AddCookingEntry:recipe-in-collection#3
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.AddCookingEntry:recipe-not-in-collection#3

Authored path: `Recipes.AddCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 35.
- Covered by [Recipes](../design/compositions/Recipes.md), line 42.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.AddCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, path: "/entries/add", recipe, requestId, result, session)
  no view "(recipe) belongs to (collection)" with (collection, recipe)
then
  RequestBoundary.respond (error: "RECIPE_NOT_IN_COLLECTION", requestId)
```

### Recipes.AddPersonalCookingEntry

Authored path: `Recipes.AddPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 142.
- Covered by [Recipes](../design/compositions/Recipes.md), line 157.

```reaction
when RequestBoundary.request (changes, path: "/entries/add-personal", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.AddPersonalCookingEntry#2

Authored path: `Recipes.AddPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 142.
- Covered by [Recipes](../design/compositions/Recipes.md), line 157.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.AddPersonalCookingEntry
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-personal", recipe, requestId, result, session)
then
  Saving.authorize (item: recipe, user)
```

### Recipes.AddPersonalCookingEntry#3

Authored path: `Recipes.AddPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 142.
- Covered by [Recipes](../design/compositions/Recipes.md), line 157.

```reaction
when Saving.authorize (item: recipe, user), asked by Recipes.AddPersonalCookingEntry#2
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-personal", recipe, requestId, result, session)
then
  CookingLog.record (author: user, changes, recipe, result)
```

### Recipes.AddPersonalCookingEntry#4

Authored path: `Recipes.AddPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 142.
- Covered by [Recipes](../design/compositions/Recipes.md), line 157.

```reaction
when CookingLog.record (author: user, changes, recipe, result, entry), asked by Recipes.AddPersonalCookingEntry#3
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-personal", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.AddPersonalRecipeToCollection

Authored path: `Recipes.AddPersonalRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 169.
- Covered by [Recipes](../design/compositions/Recipes.md), line 180.

```reaction
when RequestBoundary.request (destinationCollection, path: "/recipes/add-personal-to-collection", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.AddPersonalRecipeToCollection#2

Authored path: `Recipes.AddPersonalRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 169.
- Covered by [Recipes](../design/compositions/Recipes.md), line 180.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.AddPersonalRecipeToCollection
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-personal-to-collection", recipe, requestId, session)
then
  Saving.authorize (item: recipe, user)
```

### Recipes.AddPersonalRecipeToCollection#3

Authored path: `Recipes.AddPersonalRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 169.
- Covered by [Recipes](../design/compositions/Recipes.md), line 180.

```reaction
when Saving.authorize (item: recipe, user), asked by Recipes.AddPersonalRecipeToCollection#2
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-personal-to-collection", recipe, requestId, session)
then
  Sharing.authorize (resource: destinationCollection, user)
```

### Recipes.AddPersonalRecipeToCollection#4

Authored path: `Recipes.AddPersonalRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 169.
- Covered by [Recipes](../design/compositions/Recipes.md), line 180.

```reaction
when Sharing.authorize (resource: destinationCollection, user), asked by Recipes.AddPersonalRecipeToCollection#3
where
  earlier, Saving.authorize (item: recipe, user), asked by Recipes.AddPersonalRecipeToCollection#2
then
  Collecting.add (collection: destinationCollection, item: recipe)
```

### Recipes.AddPersonalRecipeToCollection#5

Authored path: `Recipes.AddPersonalRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 169.
- Covered by [Recipes](../design/compositions/Recipes.md), line 180.

```reaction
when Collecting.add (collection: destinationCollection, item: recipe), asked by Recipes.AddPersonalRecipeToCollection#4
where
  earlier, RequestBoundary.request (destinationCollection, path: "/recipes/add-personal-to-collection", recipe, requestId, session)
then
  RequestBoundary.respond (collection: destinationCollection, recipe, requestId)
```

### Recipes.AddRecipeToCollection

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
- Covered by [Recipes](../design/compositions/Recipes.md), line 81.

```reaction
when RequestBoundary.request (destinationCollection, path: "/recipes/add-to-collection", recipe, requestId, session, sourceCollection)
then
  Sessioning.resolve (session)
```

### Recipes.AddRecipeToCollection#2

Authored path: `Recipes.AddRecipeToCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
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
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
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
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
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
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
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
- Covered by [Recipes](../design/compositions/Recipes.md), line 65.
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
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

```reaction
when RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.EditCookingEntry#2

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.EditCookingEntry
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.EditCookingEntry:entry-in-collection#3

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

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
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

```reaction
when CookingLog.edit (author: user, changes, entry, result), asked by Recipes.EditCookingEntry:entry-in-collection#3
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.EditCookingEntry:entry-not-in-recipe#3

Authored path: `Recipes.EditCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

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
- Covered by [Recipes](../design/compositions/Recipes.md), line 45.
- Covered by [Recipes](../design/compositions/Recipes.md), line 54.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.EditCookingEntry#2
where
  earlier, RequestBoundary.request (changes, collection, entry, path: "/entries/edit", recipe, requestId, result, session)
  no view "(recipe) belongs to (collection)" with (collection, recipe)
then
  RequestBoundary.respond (error: "RECIPE_NOT_IN_COLLECTION", requestId)
```

### Recipes.EditPersonalCookingEntry

Authored path: `Recipes.EditPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 147.
- Covered by [Recipes](../design/compositions/Recipes.md), line 158.

```reaction
when RequestBoundary.request (changes, entry, path: "/entries/edit-personal", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Recipes.EditPersonalCookingEntry#2

Authored path: `Recipes.EditPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 147.
- Covered by [Recipes](../design/compositions/Recipes.md), line 158.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.EditPersonalCookingEntry
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-personal", recipe, requestId, result, session)
then
  Saving.authorize (item: recipe, user)
```

### Recipes.EditPersonalCookingEntry:entry-in-personal-recipe#3

Authored path: `Recipes.EditPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 147.
- Covered by [Recipes](../design/compositions/Recipes.md), line 158.

```reaction
when Saving.authorize (item: recipe, user), asked by Recipes.EditPersonalCookingEntry#2
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-personal", recipe, requestId, result, session)
  view "(entry) belongs to (recipe)" with (entry, recipe)
then
  CookingLog.edit (author: user, changes, entry, result)
```

### Recipes.EditPersonalCookingEntry:entry-in-personal-recipe#4

Authored path: `Recipes.EditPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 147.
- Covered by [Recipes](../design/compositions/Recipes.md), line 158.

```reaction
when CookingLog.edit (author: user, changes, entry, result), asked by Recipes.EditPersonalCookingEntry:entry-in-personal-recipe#3
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-personal", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Recipes.EditPersonalCookingEntry:entry-not-in-personal-recipe#3

Authored path: `Recipes.EditPersonalCookingEntry`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 147.
- Covered by [Recipes](../design/compositions/Recipes.md), line 158.

```reaction
when Saving.authorize (item: recipe, user), asked by Recipes.EditPersonalCookingEntry#2
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-personal", recipe, requestId, result, session)
  no view "(entry) belongs to (recipe)" with (entry, recipe)
then
  RequestBoundary.respond (error: "ENTRY_NOT_IN_RECIPE", requestId)
```

### Recipes.GetPersonalRecipe

Authored path: `Recipes.GetPersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 124.
- Covered by [Recipes](../design/compositions/Recipes.md), line 136.

```reaction
when RequestBoundary.request (path: "/recipes/get-personal", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.GetPersonalRecipe#2

Authored path: `Recipes.GetPersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 124.
- Covered by [Recipes](../design/compositions/Recipes.md), line 136.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.GetPersonalRecipe
where
  earlier, RequestBoundary.request (path: "/recipes/get-personal", recipe, requestId, session)
then
  Saving.authorize (item: recipe, user)
```

### Recipes.GetPersonalRecipe#3

Authored path: `Recipes.GetPersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 124.
- Covered by [Recipes](../design/compositions/Recipes.md), line 136.

```reaction
when Saving.authorize (item: recipe, user), asked by Recipes.GetPersonalRecipe#2
where
  earlier, RequestBoundary.request (path: "/recipes/get-personal", recipe, requestId, session)
then
  RequestBoundary.respond (recipe: former "the saved recipe (recipe) of (user)" with (recipe, user), requestId)
```

### Recipes.GetRecipe

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 18.
- Covered by [Recipes](../design/compositions/Recipes.md), line 27.

```reaction
when RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.GetRecipe#2

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 18.
- Covered by [Recipes](../design/compositions/Recipes.md), line 27.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.GetRecipe
where
  earlier, RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  Sharing.authorize (resource: collection, user)
```

### Recipes.GetRecipe#3

Authored path: `Recipes.GetRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 18.
- Covered by [Recipes](../design/compositions/Recipes.md), line 27.

```reaction
when Sharing.authorize (resource: collection, user), asked by Recipes.GetRecipe#2
where
  earlier, RequestBoundary.request (collection, path: "/recipes/get", recipe, requestId, session)
then
  RequestBoundary.respond (recipe: former "the recipe (recipe) in collection (collection)" with (collection, recipe), requestId)
```

### Recipes.ListMyRecipes

Authored path: `Recipes.ListMyRecipes`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 107.
- Covered by [Recipes](../design/compositions/Recipes.md), line 118.

```reaction
when RequestBoundary.request (path: "/recipes/mine", requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.ListMyRecipes#2

Authored path: `Recipes.ListMyRecipes`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 107.
- Covered by [Recipes](../design/compositions/Recipes.md), line 118.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.ListMyRecipes
where
  earlier, RequestBoundary.request (path: "/recipes/mine", requestId, session)
then
  RequestBoundary.respond (overview: former "the saved recipes of (user)" with (user), requestId)
```

### Recipes.RemoveRecipeFromCollection

Authored path: `Recipes.RemoveRecipeFromCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 185.
- Covered by [Recipes](../design/compositions/Recipes.md), line 200.

```reaction
when RequestBoundary.request (collection, path: "/recipes/remove-from-collection", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Recipes.RemoveRecipeFromCollection#2

Authored path: `Recipes.RemoveRecipeFromCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 185.
- Covered by [Recipes](../design/compositions/Recipes.md), line 200.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.RemoveRecipeFromCollection
where
  earlier, RequestBoundary.request (collection, path: "/recipes/remove-from-collection", recipe, requestId, session)
then
  Sharing.authorizeOwner (resource: collection, user)
```

### Recipes.RemoveRecipeFromCollection#3

Authored path: `Recipes.RemoveRecipeFromCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 185.
- Covered by [Recipes](../design/compositions/Recipes.md), line 200.

```reaction
when Sharing.authorizeOwner (resource: collection, user), asked by Recipes.RemoveRecipeFromCollection#2
where
  earlier, RequestBoundary.request (collection, path: "/recipes/remove-from-collection", recipe, requestId, session)
then
  Collecting.remove (collection, item: recipe)
```

### Recipes.RemoveRecipeFromCollection#4

Authored path: `Recipes.RemoveRecipeFromCollection`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 185.
- Covered by [Recipes](../design/compositions/Recipes.md), line 200.

```reaction
when Collecting.remove (collection, item: recipe), asked by Recipes.RemoveRecipeFromCollection#3
where
  earlier, RequestBoundary.request (collection, path: "/recipes/remove-from-collection", recipe, requestId, session)
then
  RequestBoundary.respond (collection, recipe, requestId)
```

### Recipes.SavePersonalRecipe

Authored path: `Recipes.SavePersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 102.
- Covered by [Recipes](../design/compositions/Recipes.md), line 117.

```reaction
when RequestBoundary.request (ingredients, instructions, path: "/recipes/save-personal", requestId, session, source, title)
then
  Sessioning.resolve (session)
```

### Recipes.SavePersonalRecipe#2

Authored path: `Recipes.SavePersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 102.
- Covered by [Recipes](../design/compositions/Recipes.md), line 117.

```reaction
when Sessioning.resolve (session, user), asked by Recipes.SavePersonalRecipe
where
  earlier, RequestBoundary.request (ingredients, instructions, path: "/recipes/save-personal", requestId, session, source, title)
then
  RecipeRecording.record (ingredients, instructions, source, title)
```

### Recipes.SavePersonalRecipe#3

Authored path: `Recipes.SavePersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 102.
- Covered by [Recipes](../design/compositions/Recipes.md), line 117.

```reaction
when RecipeRecording.record (ingredients, instructions, source, title, recipe), asked by Recipes.SavePersonalRecipe#2
where
  earlier, Sessioning.resolve (session, user), asked by Recipes.SavePersonalRecipe
then
  RecipeSharing.initialize (owner: user, resource: recipe)
```

### Recipes.SavePersonalRecipe#4

Authored path: `Recipes.SavePersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 102.
- Covered by [Recipes](../design/compositions/Recipes.md), line 117.

```reaction
when RecipeSharing.initialize (owner: user, resource: recipe), asked by Recipes.SavePersonalRecipe#3
then
  Saving.save (item: recipe, user)
```

### Recipes.SavePersonalRecipe#5

Authored path: `Recipes.SavePersonalRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 102.
- Covered by [Recipes](../design/compositions/Recipes.md), line 117.

```reaction
when Saving.save (item: recipe, user), asked by Recipes.SavePersonalRecipe#4
where
  earlier, RequestBoundary.request (ingredients, instructions, path: "/recipes/save-personal", requestId, session, source, title)
then
  RequestBoundary.respond (recipe, requestId)
```

### Recipes.SaveRecipe

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

```reaction
when RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  Sessioning.resolve (session)
```

### Recipes.SaveRecipe#2

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

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
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

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
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

```reaction
when RecipeRecording.record (ingredients, instructions, source, title, recipe), asked by Recipes.SaveRecipe#3
where
  earlier, Sessioning.resolve (session, user), asked by Recipes.SaveRecipe
then
  RecipeSharing.initialize (owner: user, resource: recipe)
```

### Recipes.SaveRecipe#5

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

```reaction
when RecipeSharing.initialize (owner: user, resource: recipe), asked by Recipes.SaveRecipe#4
then
  Saving.save (item: recipe, user)
```

### Recipes.SaveRecipe#6

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

```reaction
when Saving.save (item: recipe, user), asked by Recipes.SaveRecipe#5
where
  earlier, Sharing.authorize (resource: collection, user), asked by Recipes.SaveRecipe#2
then
  Collecting.add (collection, item: recipe)
```

### Recipes.SaveRecipe#7

Authored path: `Recipes.SaveRecipe`.
- Covered by [Recipes](../design/compositions/Recipes.md), line 3.
- Covered by [Recipes](../design/compositions/Recipes.md), line 15.
- Covered by [Recipes](../design/compositions/Recipes.md), line 164.

```reaction
when Collecting.add (collection, item: recipe), asked by Recipes.SaveRecipe#6
where
  earlier, RequestBoundary.request (collection, ingredients, instructions, path: "/recipes/save", requestId, session, source, title)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.AddSharedCookingEntry

Authored path: `Shared.AddSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 74.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 97.

```reaction
when RequestBoundary.request (changes, path: "/entries/add-shared", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Shared.AddSharedCookingEntry#2

Authored path: `Shared.AddSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 74.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 97.

```reaction
when Sessioning.resolve (session, user), asked by Shared.AddSharedCookingEntry
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-shared", recipe, requestId, result, session)
then
  RecipeSharing.authorize (resource: recipe, user)
```

### Shared.AddSharedCookingEntry#3

Authored path: `Shared.AddSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 74.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 97.

```reaction
when RecipeSharing.authorize (resource: recipe, user), asked by Shared.AddSharedCookingEntry#2
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-shared", recipe, requestId, result, session)
then
  CookingLog.record (author: user, changes, recipe, result)
```

### Shared.AddSharedCookingEntry#4

Authored path: `Shared.AddSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 74.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 97.

```reaction
when CookingLog.record (author: user, changes, recipe, result, entry), asked by Shared.AddSharedCookingEntry#3
where
  earlier, RequestBoundary.request (changes, path: "/entries/add-shared", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Shared.DeleteRecipe

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RequestBoundary.request (path: "/recipes/delete", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Shared.DeleteRecipe:existing-owner#2

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Sessioning.resolve (session, user), asked by Shared.DeleteRecipe
where
  earlier, RequestBoundary.request (path: "/recipes/delete", recipe, requestId, session)
  no view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RecipeSharing.authorizeOwner (resource: recipe, user)
```

### Shared.DeleteRecipe:existing-owner#3

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.DeleteRecipe:existing-owner#2
then
  RecipeRecording.delete (recipe)
```

### Shared.DeleteRecipe:existing-owner#4

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeRecording.delete (recipe), asked by Shared.DeleteRecipe:existing-owner#3
then
  Collecting.removeItem (item: recipe)
```

### Shared.DeleteRecipe:existing-owner#5

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Collecting.removeItem (item: recipe), asked by Shared.DeleteRecipe:existing-owner#4
then
  CookingLog.clearRecipe (recipe)
```

### Shared.DeleteRecipe:existing-owner#6

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when CookingLog.clearRecipe (recipe), asked by Shared.DeleteRecipe:existing-owner#5
then
  Saving.removeItem (item: recipe)
```

### Shared.DeleteRecipe:existing-owner#7

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Saving.removeItem (item: recipe), asked by Shared.DeleteRecipe:existing-owner#6
where
  earlier, Sessioning.resolve (session, user), asked by Shared.DeleteRecipe
then
  RecipeSharing.uninitialize (owner: user, resource: recipe)
```

### Shared.DeleteRecipe:existing-owner#8

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeSharing.uninitialize (owner: user, resource: recipe), asked by Shared.DeleteRecipe:existing-owner#7
where
  earlier, RequestBoundary.request (path: "/recipes/delete", recipe, requestId, session)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.DeleteRecipe:initialize-legacy-owner#2

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Sessioning.resolve (session, user), asked by Shared.DeleteRecipe
where
  earlier, RequestBoundary.request (path: "/recipes/delete", recipe, requestId, session)
  view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RecipeSharing.initialize (owner: user, resource: recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#3

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeSharing.initialize (owner: user, resource: recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#2
then
  RecipeRecording.delete (recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#4

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeRecording.delete (recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#3
then
  Collecting.removeItem (item: recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#5

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Collecting.removeItem (item: recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#4
then
  CookingLog.clearRecipe (recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#6

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when CookingLog.clearRecipe (recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#5
then
  Saving.removeItem (item: recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#7

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when Saving.removeItem (item: recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#6
where
  earlier, Sessioning.resolve (session, user), asked by Shared.DeleteRecipe
then
  RecipeSharing.uninitialize (owner: user, resource: recipe)
```

### Shared.DeleteRecipe:initialize-legacy-owner#8

Authored path: `Shared.DeleteRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 103.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 129.

```reaction
when RecipeSharing.uninitialize (owner: user, resource: recipe), asked by Shared.DeleteRecipe:initialize-legacy-owner#7
where
  earlier, RequestBoundary.request (path: "/recipes/delete", recipe, requestId, session)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.EditSharedCookingEntry

Authored path: `Shared.EditSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 75.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 98.

```reaction
when RequestBoundary.request (changes, entry, path: "/entries/edit-shared", recipe, requestId, result, session)
then
  Sessioning.resolve (session)
```

### Shared.EditSharedCookingEntry#2

Authored path: `Shared.EditSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 75.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 98.

```reaction
when Sessioning.resolve (session, user), asked by Shared.EditSharedCookingEntry
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-shared", recipe, requestId, result, session)
then
  RecipeSharing.authorize (resource: recipe, user)
```

### Shared.EditSharedCookingEntry:entry-in-recipe#3

Authored path: `Shared.EditSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 75.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 98.

```reaction
when RecipeSharing.authorize (resource: recipe, user), asked by Shared.EditSharedCookingEntry#2
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-shared", recipe, requestId, result, session)
  view "(entry) belongs to (recipe)" with (entry, recipe)
then
  CookingLog.edit (author: user, changes, entry, result)
```

### Shared.EditSharedCookingEntry:entry-in-recipe#4

Authored path: `Shared.EditSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 75.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 98.

```reaction
when CookingLog.edit (author: user, changes, entry, result), asked by Shared.EditSharedCookingEntry:entry-in-recipe#3
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-shared", recipe, requestId, result, session)
then
  RequestBoundary.respond (entry, requestId)
```

### Shared.EditSharedCookingEntry:entry-not-in-recipe#3

Authored path: `Shared.EditSharedCookingEntry`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 75.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 98.

```reaction
when RecipeSharing.authorize (resource: recipe, user), asked by Shared.EditSharedCookingEntry#2
where
  earlier, RequestBoundary.request (changes, entry, path: "/entries/edit-shared", recipe, requestId, result, session)
  no view "(entry) belongs to (recipe)" with (entry, recipe)
then
  RequestBoundary.respond (error: "ENTRY_NOT_IN_RECIPE", requestId)
```

### Shared.GetSharedRecipe

Authored path: `Shared.GetSharedRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 72.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 96.

```reaction
when RequestBoundary.request (path: "/recipes/get-shared", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Shared.GetSharedRecipe#2

Authored path: `Shared.GetSharedRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 72.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 96.

```reaction
when Sessioning.resolve (session, user), asked by Shared.GetSharedRecipe
where
  earlier, RequestBoundary.request (path: "/recipes/get-shared", recipe, requestId, session)
then
  RecipeSharing.authorize (resource: recipe, user)
```

### Shared.GetSharedRecipe#3

Authored path: `Shared.GetSharedRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 72.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 96.

```reaction
when RecipeSharing.authorize (resource: recipe, user), asked by Shared.GetSharedRecipe#2
where
  earlier, RequestBoundary.request (path: "/recipes/get-shared", recipe, requestId, session)
then
  RequestBoundary.respond (recipe: former "the directly shared recipe (recipe) accessible to (user)" with (recipe, user), requestId)
```

### Shared.ListShared

Authored path: `Shared.ListShared`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 4.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 22.

```reaction
when RequestBoundary.request (path: "/shared/list", requestId, session)
then
  Sessioning.resolve (session)
```

### Shared.ListShared#2

Authored path: `Shared.ListShared`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 4.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 22.

```reaction
when Sessioning.resolve (session, user), asked by Shared.ListShared
where
  earlier, RequestBoundary.request (path: "/shared/list", requestId, session)
then
  RequestBoundary.respond (overview: former "the shared collections and individual recipes of (user)" with (user), requestId)
```

### Shared.PrepareRecipeSharing

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when RequestBoundary.request (path: "/recipes/prepare-sharing", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Shared.PrepareRecipeSharing#2

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when Sessioning.resolve (session, user), asked by Shared.PrepareRecipeSharing
where
  earlier, RequestBoundary.request (path: "/recipes/prepare-sharing", recipe, requestId, session)
then
  Saving.authorize (item: recipe, user)
```

### Shared.PrepareRecipeSharing:existing-owner#3

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when Saving.authorize (item: recipe, user), asked by Shared.PrepareRecipeSharing#2
where
  no view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RecipeSharing.authorizeOwner (resource: recipe, user)
```

### Shared.PrepareRecipeSharing:existing-owner#4

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.PrepareRecipeSharing:existing-owner#3
where
  earlier, RequestBoundary.request (path: "/recipes/prepare-sharing", recipe, requestId, session)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.PrepareRecipeSharing:initialize-legacy-owner#3

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when Saving.authorize (item: recipe, user), asked by Shared.PrepareRecipeSharing#2
where
  view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RecipeSharing.initialize (owner: user, resource: recipe)
```

### Shared.PrepareRecipeSharing:initialize-legacy-owner#4

Authored path: `Shared.PrepareRecipeSharing`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 46.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 65.

```reaction
when RecipeSharing.initialize (owner: user, resource: recipe), asked by Shared.PrepareRecipeSharing:initialize-legacy-owner#3
where
  earlier, RequestBoundary.request (path: "/recipes/prepare-sharing", recipe, requestId, session)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.RecipeSharingStatus

Authored path: `Shared.RecipeSharingStatus`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 40.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 64.

```reaction
when RequestBoundary.request (path: "/recipes/sharing-status", recipe, requestId, session)
then
  Sessioning.resolve (session)
```

### Shared.RecipeSharingStatus:legacy-owner#2

Authored path: `Shared.RecipeSharingStatus`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 40.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 64.

```reaction
when Sessioning.resolve (session, user), asked by Shared.RecipeSharingStatus
where
  earlier, RequestBoundary.request (path: "/recipes/sharing-status", recipe, requestId, session)
  view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RequestBoundary.respond (canManage: true, requestId)
```

### Shared.RecipeSharingStatus:not-owner#2

Authored path: `Shared.RecipeSharingStatus`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 40.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 64.

```reaction
when Sessioning.resolve (session, user), asked by Shared.RecipeSharingStatus
where
  earlier, RequestBoundary.request (path: "/recipes/sharing-status", recipe, requestId, session)
  no view "(user) owns direct sharing of (recipe)" with (recipe, user)
  no view "(user) personally saved (recipe) before direct ownership existed" with (recipe, user)
then
  RequestBoundary.respond (canManage: false, requestId)
```

### Shared.RecipeSharingStatus:owner#2

Authored path: `Shared.RecipeSharingStatus`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 40.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 64.

```reaction
when Sessioning.resolve (session, user), asked by Shared.RecipeSharingStatus
where
  earlier, RequestBoundary.request (path: "/recipes/sharing-status", recipe, requestId, session)
  view "(user) owns direct sharing of (recipe)" with (recipe, user)
then
  RequestBoundary.respond (canManage: true, requestId)
```

### Shared.RevokeRecipeAccess

Authored path: `Shared.RevokeRecipeAccess`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 67.

```reaction
when RequestBoundary.request (path: "/recipes/revoke", recipe, requestId, session, username)
then
  Sessioning.resolve (session)
```

### Shared.RevokeRecipeAccess#2

Authored path: `Shared.RevokeRecipeAccess`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 67.

```reaction
when Sessioning.resolve (session, user), asked by Shared.RevokeRecipeAccess
where
  earlier, RequestBoundary.request (path: "/recipes/revoke", recipe, requestId, session, username)
then
  RecipeSharing.authorizeOwner (resource: recipe, user)
```

### Shared.RevokeRecipeAccess:registered-recipient#3

Authored path: `Shared.RevokeRecipeAccess`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 67.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.RevokeRecipeAccess#2
where
  earlier, RequestBoundary.request (path: "/recipes/revoke", recipe, requestId, session, username)
  PasswordAuthenticating._byUsername (username) has (user: member)
then
  RecipeSharing.revoke (member, owner: user, resource: recipe)
```

### Shared.RevokeRecipeAccess:registered-recipient#4

Authored path: `Shared.RevokeRecipeAccess`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 67.

```reaction
when RecipeSharing.revoke (member, owner: user, resource: recipe), asked by Shared.RevokeRecipeAccess:registered-recipient#3
where
  earlier, RequestBoundary.request (path: "/recipes/revoke", recipe, requestId, session, username)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.RevokeRecipeAccess:unknown-recipient#3

Authored path: `Shared.RevokeRecipeAccess`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 67.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.RevokeRecipeAccess#2
where
  earlier, RequestBoundary.request (path: "/recipes/revoke", recipe, requestId, session, username)
  no PasswordAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "RECIPIENT_NOT_FOUND", requestId)
```

### Shared.ShareRecipe

Authored path: `Shared.ShareRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 66.

```reaction
when RequestBoundary.request (path: "/recipes/share", recipe, requestId, session, username)
then
  Sessioning.resolve (session)
```

### Shared.ShareRecipe#2

Authored path: `Shared.ShareRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 66.

```reaction
when Sessioning.resolve (session, user), asked by Shared.ShareRecipe
where
  earlier, RequestBoundary.request (path: "/recipes/share", recipe, requestId, session, username)
then
  RecipeSharing.authorizeOwner (resource: recipe, user)
```

### Shared.ShareRecipe:registered-recipient#3

Authored path: `Shared.ShareRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 66.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.ShareRecipe#2
where
  earlier, RequestBoundary.request (path: "/recipes/share", recipe, requestId, session, username)
  PasswordAuthenticating._byUsername (username) has (user: member)
then
  RecipeSharing.grant (member, owner: user, resource: recipe)
```

### Shared.ShareRecipe:registered-recipient#4

Authored path: `Shared.ShareRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 66.

```reaction
when RecipeSharing.grant (member, owner: user, resource: recipe), asked by Shared.ShareRecipe:registered-recipient#3
where
  earlier, RequestBoundary.request (path: "/recipes/share", recipe, requestId, session, username)
then
  RequestBoundary.respond (recipe, requestId)
```

### Shared.ShareRecipe:unknown-recipient#3

Authored path: `Shared.ShareRecipe`.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 34.
- Covered by [Shared collections and individual recipes](../design/compositions/Shared.md), line 66.

```reaction
when RecipeSharing.authorizeOwner (resource: recipe, user), asked by Shared.ShareRecipe#2
where
  earlier, RequestBoundary.request (path: "/recipes/share", recipe, requestId, session, username)
  no PasswordAuthenticating._byUsername (username)
then
  RequestBoundary.respond (error: "RECIPIENT_NOT_FOUND", requestId)
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
- `/entries/add-personal` — requires `changes`, `recipe`, `result`, `session`
- `/entries/add-shared` — requires `changes`, `recipe`, `result`, `session`
- `/entries/edit` — requires `changes`, `collection`, `entry`, `recipe`, `result`, `session`
- `/entries/edit-personal` — requires `changes`, `entry`, `recipe`, `result`, `session`
- `/entries/edit-shared` — requires `changes`, `entry`, `recipe`, `result`, `session`
- `/profiles/get` — requires `session`, `user`
- `/profiles/me` — requires `session`
- `/profiles/save` — requires `bio`, `displayName`, `picture`, `session`
- `/recipes/add-personal-to-collection` — requires `destinationCollection`, `recipe`, `session`
- `/recipes/add-to-collection` — requires `destinationCollection`, `recipe`, `session`, `sourceCollection`
- `/recipes/delete` — requires `recipe`, `session`
- `/recipes/get` — requires `collection`, `recipe`, `session`
- `/recipes/get-personal` — requires `recipe`, `session`
- `/recipes/get-shared` — requires `recipe`, `session`
- `/recipes/mine` — requires `session`
- `/recipes/prepare-sharing` — requires `recipe`, `session`
- `/recipes/remove-from-collection` — requires `collection`, `recipe`, `session`
- `/recipes/revoke` — requires `recipe`, `session`, `username`
- `/recipes/save` — requires `session`, `collection`, `title`, `ingredients`, `instructions`; fills `source` with "" when absent
- `/recipes/save-personal` — requires `session`, `title`, `ingredients`, `instructions`; fills `source` with "" when absent
- `/recipes/share` — requires `recipe`, `session`, `username`
- `/recipes/sharing-status` — requires `recipe`, `session`
- `/sessions/current` — requires `session`
- `/sessions/end` — requires `session`
- `/sessions/start` — requires `password`, `username`
- `/shared/list` — requires `session`
