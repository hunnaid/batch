# Saving

## Purpose

Keep a personal list of saved items and remember when each item was first saved.

## Principle

After a user saves an item, it appears in their personal list and can be
authorized for that user. Saving the same item again preserves its original
save time without creating a duplicate. Another user's saved list remains
independent. Removing an item everywhere clears its personal references while preserving saves for other items.

## Types

```types
external User

external Item
```

## State

```state
a set of Saves with
    a user User
    an item Item
    a savedAt DateTime

Rule: Each user and item pair has at most one Save.
```

## Actions

```actions
save(user: User, item: Item) : returns ()
  where no Save exists with the given user and item
  then
    create a Save with the given user and item
    set its savedAt to the current date and time
    returns
  where a Save exists with the given user and item
  then
    preserve the existing Save and its savedAt
    returns

authorize(user: User, item: Item) : returns ()
  where a Save exists with the given user and item
  then
    make no state change
    returns
  where no Save exists with the given user and item
  then
    refuses ITEM_NOT_SAVED "This item is not in your saved list."
removeItem(item: Item) : returns ()
  where true
  then
    remove every Save for item across all users
    preserve all other Saves and their original save times
    succeed without changes if item has no Saves
    returns

```

## Queries

```queries
_forUser(user: User) : many (item: Item, savedAt: DateTime)
  Return the given user's saved items and their original save times.
  Order by savedAt descending, with the stored Save identifier ascending
  as a tie-breaker. Return no rows when the user has no saved items.
```
