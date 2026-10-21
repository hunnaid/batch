# Profiles

Profiling stores display names, bios, and pictures separately from login
credentials. It uses the same user identifiers as PasswordAuthenticating.
Looking up a username does not return credentials. Editing a profile does
not change the login username or password.

A signed-in user opens their own profile through their session.[me]
Any signed-in user may retrieve another registered user's username,
display name, bio, and picture by identifier.[get]
The response combines the registered username and an optional profile.[identity]
Profile details include the current display name, bio, and picture.[details]
An unknown account returns a null identity. An account without a profile
returns its username and null profile fields. Reading a profile creates no records.

The editor starts with the username and an initials avatar. The first save
creates a profile; later saves update it.[save] The session identifies whose
profile to update. Supplying another user's identifier does not change this.
Empty bio or picture values clear those details.

Display names must be nonblank and at most 80 characters. Bios can contain
up to 500 characters. Invalid requests leave profiles unchanged. If two requests
try to create the same profile at once, one may return a conflict. The user can
reload before trying again.

The header's Profile button opens the editor. Sign out is at the bottom of
the page. Leaving an edited form asks whether to discard unsaved changes.
Choosing an image shows a preview. The picture is saved only when Save profile
succeeds. Users can replace or remove it.

The browser accepts JPEG, PNG, and WebP files up to 5 MiB. It decodes the image,
crops the center to a 256-pixel square, and converts it to a JPEG avatar.
The server checks the image data reference, canonical base64 encoding,
file signature, and decoded size limit of 256 KiB. It accepts PNG, JPEG,
and WebP data references. It refuses arbitrary URLs, SVG, and other formats.
Pictures are stored with profiles in MongoDB,
so they survive application restarts without a local upload directory.

Cooking entries keep their author identifiers. When a recipe page loads,
it looks up each author's current profile. It shows their display name,
or their username if they have no profile. It shows their picture,
or initials if they have no picture.
Profile updates appear beside existing attempts the next time the page loads.
They do not change cooking entries or editing permissions. If a profile lookup
fails, the recipe and history remain usable, and the page offers a retry button.

[me]: reaction:Profiles.GetMyProfile
[get]: reaction:Profiles.GetProfile
[save]: reaction:Profiles.SaveMyProfile
[identity]: former:Profiles.Identity
[details]: former:Profiles.ProfileDetails

```endpoints
Profiles.GetMyProfile at /profiles/me
Profiles.GetProfile at /profiles/get
Profiles.SaveMyProfile at /profiles/save
```
