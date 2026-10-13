# Sharing

## Purpose

Let owners give other users access to a resource and withdraw that access later.

## Principle

After a resource is initialized, its owner can grant another user access. Both the owner and that member can then be authorized. Revoking membership prevents that member from being authorized while preserving the owner's access.

## Types

```types
external User
  The identity of an owner or member.

external Resource
  The identity of the resource whose access is managed.
```

## State

```state
a set of Resources with
  an owner User
  a members set of User
```

## Actions

```actions
initialize(resource: Resource, owner: User) : returns ()
  where resource is in Resources
  then
    refuses RESOURCE_ALREADY_INITIALIZED "Sharing is already initialized for this resource."
  where resource is not in Resources
  then
    add resource to Resources with the given owner and an empty set of members
    returns

grant(owner: User, resource: Resource, member: User) : returns ()
  where resource is not in Resources
  then
    refuses GRANT_RESOURCE_NOT_FOUND "The resource does not exist."
  where resource is in Resources and its owner differs from the given owner
  then
    refuses GRANT_NOT_OWNER "Only the owner can grant access."
  where resource is in Resources, its owner matches the given owner, and member equals its owner
  then
    refuses CANNOT_GRANT_OWNER "The owner already has access."
  where resource is in Resources, its owner matches the given owner, member differs from its owner, and member is in its members
  then
    refuses MEMBER_ALREADY_ADDED "The user already has access."
  where resource is in Resources, its owner matches the given owner, member differs from its owner, and member is not in its members
  then
    add member to the resource's members
    preserve its owner and other members
    returns

revoke(owner: User, resource: Resource, member: User) : returns ()
  where resource is not in Resources
  then
    refuses REVOKE_RESOURCE_NOT_FOUND "The resource does not exist."
  where resource is in Resources and its owner differs from the given owner
  then
    refuses REVOKE_NOT_OWNER "Only the owner can revoke access."
  where resource is in Resources, its owner matches the given owner, and member equals its owner
  then
    refuses CANNOT_REVOKE_OWNER "The owner's access cannot be revoked."
  where resource is in Resources, its owner matches the given owner, member differs from its owner, and member is not in its members
  then
    refuses MEMBER_NOT_ADDED "The user is not a member of this resource."
  where resource is in Resources, its owner matches the given owner, member differs from its owner, and member is in its members
  then
    remove member from the resource's members
    preserve its owner and other members
    returns

authorize(user: User, resource: Resource) : returns ()
  where resource is not in Resources or user is neither its owner nor a member
  then
    refuses ACCESS_DENIED "You do not have access to this resource."
  where resource is in Resources and user is its owner or a member
  then
    make no state change
    returns

authorizeOwner(user: User, resource: Resource) : returns ()
  where resource is not in Resources or its owner differs from user
  then
    refuses OWNER_ACCESS_REQUIRED "Only the owner can perform this action."
  where resource is in Resources and its owner equals user
  then
    make no state change
    returns

uninitialize(resource: Resource, owner: User) : returns ()
  where resource is not in Resources or its owner differs from the given owner
  then
    refuses CANNOT_UNINITIALIZE_RESOURCE "Only the owner can remove sharing for an existing resource."
  where resource is in Resources and its owner equals the given owner
  then
    remove resource from Resources along with its owner and members
    leave other resources unchanged
    returns
```

## Queries

```queries
_accessible(user: User) : many (resource: Resource, owner: User)
  Return one row for each resource where the user is the owner or a member.
  Include the resource identifier and its owner.
  Sort rows by resource identifier in ascending order.
  Return no rows when the user has access to no resources.
```
