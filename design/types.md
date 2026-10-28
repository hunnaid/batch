# Application types

PasswordAuthenticating owns user identities, and RecipeRecording owns
recipe identities. Saving maintains each user's personal recipe list.
RecipeImporting reads public websites or pasted page content into unsaved recipe drafts for review.
Collecting organizes recipes into collections, Sharing controls collection
access. A separate Sharing instance, RecipeSharing, controls direct recipe
access. CookingLog records cooking attempts, and Sessioning identifies
signed-in users. Profiling maintains display names, bios, and pictures independently of credentials.

```instances
instantiate RecipeRecording

instantiate RecipeImporting

instantiate PasswordAuthenticating

instantiate Profiling with
    User is PasswordAuthenticating.User

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

instantiate Sharing as RecipeSharing with
    User is PasswordAuthenticating.User
    Resource is RecipeRecording.Recipe

instantiate Sessioning with
    User is PasswordAuthenticating.User
```
