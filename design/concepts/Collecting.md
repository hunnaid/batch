# Collecting

## Purpose

Keep related items in named collections so users can find them later.

## Principle

After a user creates a collection and adds items, they can retrieve its name and contents. The same item can belong to several collections. Removing it from one collection leaves the others unchanged. Removing it from every collection leaves the collections themselves in place.

## Types

```types
external User
  The identity of a collection's creator.

external Item
  The identity of an item that can belong to a collection.

opaque ItemSequence
  A sequence of item identifiers, represented as string[] in TypeScript.
```

## State

```state
a set of Collections with
  a creator User
  a name String
  an items set of Item
```

## Actions

```actions
create(creator: User, name: String) : returns (collection: Collection)
  where name is blank
  then
    refuses INVALID_COLLECTION_NAME "The collection name cannot be blank."
  where name is not blank
  then
    create a new collection with the given creator and name
    initialize its items to an empty set
    returns collection

add(collection: Collection, item: Item) : returns ()
  where collection does not exist
  then
    refuses COLLECTION_NOT_FOUND "The collection does not exist."
  where collection exists and item is already in its items
  then
    refuses ITEM_ALREADY_COLLECTED "The item is already in the collection."
  where collection exists and item is not in its items
  then
    add item to the collection's items
    returns

rename(collection: Collection, name: String) : returns ()
  where name is blank
  then
    refuses INVALID_COLLECTION_RENAME "The collection name cannot be blank."
  where name is not blank and collection does not exist
  then
    refuses RENAME_COLLECTION_NOT_FOUND "The collection does not exist."
  where name is not blank and collection exists
  then
    set the collection's name to the given name
    preserve its creator and items
    returns

delete(collection: Collection) : returns ()
  where collection does not exist
  then
    refuses DELETE_COLLECTION_NOT_FOUND "The collection does not exist."
  where collection exists
  then
    remove the collection and its item memberships
    leave the items themselves and other collections unchanged
    returns
remove(collection: Collection, item: Item) : returns ()
  where collection does not exist
  then
    refuses REMOVE_COLLECTION_NOT_FOUND "The collection does not exist."
  where collection exists and item is not in its items
  then
    refuses ITEM_NOT_COLLECTED "The item is not in the collection."
  where collection exists and item is in its items
  then
    remove item from the collection's items
    preserve the collection's name, creator, and other items
    leave the item itself and other collections unchanged
    returns

removeItem(item: Item) : returns ()
  where true
  then
    remove item from every collection's items
    preserve all collections, their names, creators, and other items
    succeed without changes if no collection contains item
    returns

```

## Queries

```queries
_get(collection: Collection) : optional (creator: User, name: String, items: ItemSequence)
  Return one row containing the collection's creator, name, and item identifiers.
  Return the item identifiers sorted in ascending string order.
  Return no rows when the collection does not exist.
_items(collection: Collection) : many (item: Item)
  Return one row per item in the collection, sorted by item identifier.
  Return no rows when the collection is empty or does not exist.
```
