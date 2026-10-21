# Profiles

Profiling owns presentation details, independently of password authentication.
User identifiers are shared through the application type binding. Public account
names are looked up without returning credentials; a profile never changes the
login username or password.

A signed-in user opens their own profile through their session.[me]
They may also retrieve another user's public presentation by identifier.[get]
The response combines the registered username and an optional profile.[identity]
Profile details include the current display name, bio, and picture.[details]
An unknown account returns a null identity. An existing account without a profile
returns its username and null profile fields, without creating records during reads.

The profile editor defaults to the username and an initials avatar. Saving first
creates a profile; later saves update it.[save] The session determines which
user is written, even if a caller supplies another user's identifier. Empty bio
or picture values clear those optional details. Display names must be nonblank
and at most 80 characters, and bios at most 500 characters. Invalid requests are
refused without changing profiles. Simultaneous first saves may return a conflict;
the user can reload before retrying.

The header's Profile button opens the editor, with Sign out at the very bottom.
Leaving an edited form asks whether to discard unsaved changes. Choosing an image
previews it; the image is persisted only when Save profile succeeds. Users can
replace or remove their picture. The browser accepts JPEG, PNG and WebP files up
to 5 MiB, decodes and center-crops them to a 256-pixel square, and re-encodes a JPEG
avatar. The server independently validates the data reference, canonical base64,
raster signature, and a 256 KiB decoded size limit. It accepts only PNG, JPEG,
and WebP data references; arbitrary URLs, SVG and other formats are refused.
The embedded picture is stored with the profile in MongoDB, so it persists
across application restarts without relying on a local upload directory.

Cooking entries retain their author identifiers. The recipe page fetches each
distinct author's current identity when it loads, showing their display name
(or username before customization) and picture (or initials). Updating a profile
changes how existing attempts are identified on the next load; it does not rewrite
cooking entries or change editing permissions. Identity lookup failures leave the
recipe and cooking history usable and show an explicit retry option.

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
