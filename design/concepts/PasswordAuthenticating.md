# PasswordAuthenticating

## Purpose

Identify users by verifying their registered credentials.

## Principle

After a user registers with a unique username and password, authenticating
with those credentials returns the same user identity. Incorrect credentials
are refused without changing the stored account.

## Types

```types
opaque PasswordHash
  A salted password hash used to verify a supplied password.
```

## State

```state
a set of Users with
  a unique username String
  a passwordHash PasswordHash

Rule: Usernames are case-sensitive and stored exactly as supplied.
Rule: Plaintext passwords are not retained.
```

## Actions

```actions
register(username: String, password: String) : returns (user: User)
  where username or password is blank
  then
    refuses INVALID_REGISTRATION "Username and password cannot be blank."
  where neither field is blank and the username is already registered
  then
    refuses USERNAME_TAKEN "That username is already registered."
  where neither field is blank and the username is not registered
  then
    create a new user with the supplied username and a salted hash of the exact supplied password
    returns user

authenticate(username: String, password: String) : returns (user: User)
  where no user has the supplied username or the password does not verify against that user's stored hash
  then
    refuses INVALID_CREDENTIALS "Invalid username or password."
  where a user has the supplied username and the password verifies against their stored hash
  then
    make no state change
    returns user
```

## Queries

```queries
_byUsername(username: String) : optional (user: User)
  Return the identifier of the user with the exact given username.
  Return no rows when the username is not registered.
  Do not return credential information.
```
