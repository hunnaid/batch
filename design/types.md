# Application types

The application currently contains RecipeRecording, which owns the
Recipe identities used to retrieve original recipe details.

```instances
instantiate RecipeRecording
instantiate PasswordAuthenticating
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
