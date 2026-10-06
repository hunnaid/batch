# Concept Design

## Concepts

### RecipeRecording
```
concept RecipeRecording

purpose
    keep recipe instructions available in a consistent structure so cooks can return to them when preparing a dish

principle
    after a recipe is recorded with title, ingredients, instructions, and optional source, a cook can return to those details later to prepare the dish

state
    a set of Recipes with
        a title String
        an ingredients seq of String
        an instructions seq of String
        an optional source String

actions
    record (
        title: String,
        ingredients: seq of String,
        instructions: seq of String,
        source?: String
    ): returns (recipe: Recipe)
        where
            title is not blank
            ingredients and instructions each contain at least one item
            no item in ingredients or instructions is blank
        then
            create a new Recipe with the given title, ingredients, and instructions
            set its source to the given source if provided, otherwise leave it absent
            return the new recipe
```

### CookingLog
```
concept CookingLog [User, Recipe]

purpose
    help cooks remember what they changed and how it turned out so they can repeat successful attempts and avoid past mistakes

principle
    after a cook records an entry for a recipe with their adjustments and results, they can return to that entry later. recording another attempt keeps earlier entries available for comparison

state
    a set of Entries with
        an author User
        a recipe Recipe
        a changes String
        a result String
        a createdAt DateTime

actions
    record (
        author: User,
        recipe: Recipe,
        changes: String,
        result: String
    ) : returns (entry: Entry)
        where
            changes or result is not blank
        then
            create a new Entry with the given author, recipe, changes, and result
            set its createdAt to the current date and time
            return the new entry

    edit (
        author: User,
        entry: Entry,
        changes: String,
        result: String
    )
        where
            entry exists
            entry's author matches the given author
            changes or result is not blank
        then
            set entry's changes to the given changes
            set entry's result to the given result
```

### Collecting [User, Item]
```
concept Collecting [User, Item]

purpose
    making related items easier to find by keeping them together in named collections

principle
    after a user creates a collection and adds items, they can return to that collection to find those items. removing an item from the collection leaves it available in any other collection it still exists in

state
    a set of Collections with
        a creator User
        a name String
        an items set of Item

actions
    create (
        creator: User,
        name: String
    ): returns (collection: Collection)
        where
            name is not blank
        then
            create a new Collection with the given creator and name and an empty set of items
            return the new collection

    add (
        collection: Collection,
        item: Item
    )
        where
            collection exists
            item is not in collection's items
        then
            add item to collection's items

    remove (
        collection: Collection,
        item: Item
    )
        where
            collection exists
            item is in collection's items
        then
            remove item from collection's items

    rename (
        collection: Collection,
        name: String
    )
        where
            collection exists
            name is not blank
        then
            set collection's name to the given name
```

### Sharing [User, Resource]
```
concept Sharing [User, Resource]

purpose
    let users give others access to a resource while retaining the ability to withdraw access

principle
    after a resource is initialized with an owner, the owner can grant another user access. that user can then be authorized to access the resource unless the owner revokes their access

state
    a set of Resources with
        an owner User
        a members set of Users

actions
    initialize (
        resource: Resource,
        owner: User
    )
        where
            resource is not in Resources
        then
            add resource to Resources with the given owner and an empty set of members

    grant (
        owner: User,
        resource: Resource,
        member: User
    )
        where
            resource is in Resources
            resource's owner is the given owner
            member is not the owner
            member is not in the resource's members
        then
            add member to resource's members

    revoke (
        owner: User,
        resource: Resource,
        member: User
    )
        where
            resource is in Resources
            resource's owner is the given owner
            member is not the owner
            member is in the resource's members
        then
            remove member from resource's members

    authorize (
        user: User,
        resource: Resource
    )
        where
            resource is in Resources
            user equals resource's owner or user is in resource's members
        then
            make no state change
```

### PasswordAuthenticating
```
concept PasswordAuthenticating

purpose
    identify users and prevent one user from impersonating another user

principle
    after a user registers with a username and password, they can authenticate with those credentials and be recognized as the same user

state
    a set of Users with
        a unique username String
        a password String

actions
    register (
        username: String,
        password: String
    ): returns (user: User)
        where
            username and password are not blank
            no user has the given username
        then
            create a new User with the given username and password
            return the new user

    authenticate (
        username: String,
        password: String
    ): returns (user: User)
        where
            a user exists with the given username and matching password
        then
            return that user without changing the state
```

## Essential Reactions

Actions matched within a reaction belong to the same request flow. The user in a request is the authenticated user. If an optional source is omitted, it is also omitted from the corresponding record action. Requesting represents requests from the application interface.

```
reaction initializeCollectionSharing
    when
        Collecting.create (creator, name): (collection)
    then
        Sharing.initialize (collection, creator)

reaction recordRecipeInCollection
    when
        Requesting.saveRecipe (
            user, collection, title, ingredients, instructions, source
        )
    where
        collection is in Collecting.Collections
        collection is in Sharing.Resources
        user equals collection's owner in Sharing or user is in collection's members in Sharing
    then
        RecipeRecording.record (
            title, ingredients, instructions, source
        )

reaction addRecordedRecipeToCollection
    when
        Requesting.saveRecipe (
            user, collection, title, ingredients, instructions, source
        )
        RecipeRecording.record (
            title, ingredients, instructions, source
        ): (recipe)
    then
        Collecting.add (collection, recipe)

reaction recordCookingEntry
    when
        Requesting.addCookingEntry (
            user, collection, recipe, changes, result
        )
    where
        collection is in Collecting.Collections
        collection is in Sharing.Resources
        user equals collection's owner in Sharing or user is in collection's members in Sharing
        recipe is in RecipeRecording.Recipes
        recipe is in collection's items in Collecting
    then
        CookingLog.record (user, recipe, changes, result)
```

## Concept Roles

RecipeRecording stores the original recipe's title, ingredients, instructions, and optional source. Saved recipes remain unchanged so cooking entries keep a consistent reference. CookingLog stores each attempt's adjustments and results separately, allowing users to record new attempts without overwriting earlier ones. Authors can edit their own entries to correct details or add results.

Collecting organizes recipes into named collections. Its generic Item type is bound to RecipeRecording's Recipe type. CookingLog's Recipe type refers to those same recipes. Sharing controls collection access, so its Resource type is bound to Collecting's Collection type. All external User types refer to users created by PasswordAuthenticating.

When a collection is created, a reaction initializes its creator as its owner in Sharing. The owner can grant or revoke access for other users. Owners and members can view the collection, contribute recipes, and record cooking entries. Application requests use the authenticated user's identity, and reactions check access before allowing operations. Editing an entry also requires that the user is its author.

Cooking entries belong to recipes, so someone with access to a recipe through a collection can see its entries. If the same recipe appears in multiple collections, those collections show the same cooking history. Removing a recipe from a collection removes that membership without deleting the recipe or its entries.
