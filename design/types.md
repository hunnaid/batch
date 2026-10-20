# Application types

PasswordAuthenticating owns user identities, and RecipeRecording owns
recipe identities. Saving maintains each user's personal recipe list.
Collecting organizes recipes into collections, Sharing controls collection
access, CookingLog records cooking attempts, and Sessioning identifies
signed-in users.

```instances
instantiate RecipeRecording

instantiate PasswordAuthenticating

instantiate Saving with
    User is PasswordAuthenticating.User
    Item is RecipeRecording.Recipe

instantiate Collecting with
    User is PasswordAuthenticating.User
    Item is RecipeRecording.Recipe

instantiate CookingLog with
    User is PasswordAuthenticating.User
    Recipe is RecipeRecording.Recipe

instantiate Sharing with
    User is PasswordAuthenticating.User
    Resource is Collecting.Collection

instantiate Sessioning with
    User is PasswordAuthenticating.User
```
