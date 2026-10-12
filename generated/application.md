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

#### Queries

- `_get(collection: Collection) : optional (creator: User, name: String, items: ItemSequence)`

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

#### Instances

- `Sharing` — instance of `Sharing` — [Application types](../design/types.md), line 15.
  - `Resource` is `Collecting.Collection` — [Application types](../design/types.md), line 17.
  - `User` is `PasswordAuthenticating.User` — [Application types](../design/types.md), line 16.

## Reactions

### Collections.InitializeCollectionSharing

Authored path: `Collections.InitializeCollectionSharing`.
- Covered by [Collections](../design/compositions/Collections.md), line 4.

```reaction
when Collecting.create (creator, collection)
then
  Sharing.initialize (owner: creator, resource: collection)
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

