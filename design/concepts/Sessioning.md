# Sessioning

## Purpose

Remember an authenticated user's identity across requests until their session expires or ends.

## Principle

After a session starts for a user, its secret token resolves to that user for seven days unless the session is ended earlier. Ending one session leaves the user's other sessions available.

## Types

```types
external User
  The identity of a user authenticated by the application.
```

## State

```state
a set of Sessions with
  a user User
  an expiresAt DateTime
```

## Actions

```actions
start(user: User) : returns (session: Session, expiresAt: DateTime)
  where true
  then
    create a new session with a randomly generated secret identifier
    associate the session with the given user
    set expiresAt to seven days after the current date and time
    leave existing sessions unchanged
    returns session, expiresAt

resolve(session: Session) : returns (user: User)
  where session does not exist or its expiresAt is at or before the current date and time
  then
    refuses INVALID_SESSION "The session is invalid or has expired."
  where session exists and its expiresAt is after the current date and time
  then
    let user be the session's associated user
    make no state change
    returns user

end(session: Session) : returns ()
  where session exists
  then
    remove the session
    leave other sessions unchanged
    returns
  where session does not exist
  then
    make no state change
    returns
```

## Queries

```queries
```
