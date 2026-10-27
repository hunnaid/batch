# Profiling

## Purpose

Keep display names, bios, and pictures so users can recognize one another.

## Principle

After a user creates a profile, they can retrieve their display name, bio, and picture. Updating the profile replaces those details while keeping the same user identity and leaving other profiles unchanged.

## Types

```types
external User
  A generic user identifier supplied by the application.
```

## State

```state
a set of Profiles with
  a user User
  a displayName String
  a bio String
  a picture String

Rule: Each user has at most one profile.
Rule: Empty bio and picture strings represent absent optional details.
Rule: A valid displayName is nonblank and at most 80 characters; bio is at most 500 characters.
Rule: A nonempty picture is a canonical base64 PNG, JPEG, or WebP data reference with a matching raster signature and at most 256 KiB of decoded data.
```

## Actions

```actions
create(user: User, displayName: String, bio: String, picture: String) : returns ()
  where the supplied details violate the profile validation rules
  then
    refuses INVALID_PROFILE "The profile details are invalid."
  where the supplied details are valid and user already has a profile
  then
    refuses PROFILE_ALREADY_EXISTS "The user already has a profile."
  where the supplied details are valid and user has no profile
  then
    create the user's profile with the supplied details
    preserve other profiles
    returns

update(user: User, displayName: String, bio: String, picture: String) : returns ()
  where the supplied details violate the profile validation rules
  then
    refuses INVALID_PROFILE "The profile details are invalid."
  where the supplied details are valid and user has no profile
  then
    refuses PROFILE_NOT_FOUND "The profile does not exist."
  where the supplied details are valid and user has a profile
  then
    replace the user's displayName, bio and picture with the supplied details
    preserve other profiles
    returns
```

## Queries

```queries
_get(user: User) : optional (displayName: String, bio: String, picture: String)
  Return the user's presentation details, or no rows if no profile has been created.
```
