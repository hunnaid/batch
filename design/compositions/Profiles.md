# Profiles

Profiling stores display names, bios, and pictures separately from login credentials. It uses the same user identifiers as PasswordAuthenticating. Looking up a username does not return credentials. Editing a profile does not change the login username or password.

## Reading and saving profiles

A signed-in user opens their own profile through their session.[me] Any signed-in user can also look up another registered user's public profile by identifier.[get]

The response includes the registered username and profile details.[identity] The profile contains the display name, bio, and picture.[details] An unknown account returns a null identity. An account without a profile returns its username and a profile object with null displayName, bio, and picture fields. Neither lookup returns credentials or creates records.

The editor starts with the username and an initial avatar. The first save creates a profile, later saves update it.[save] The session decides who's profile is saved, even if the request includes another user's identifier. An empty bio or picture clears that detail.

Display names must be nonempty and at most 80 characters. Bios can contain up to 500 characters. Invalid requests leave profiles unchanged. If two first saves happen at once, one may return a conflict. The user can reload and try again.

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

## Editing and pictures

The header's Profile button opens the editor, with Sign out at the bottom. Leaving with unsaved changes asks whether to discard them. Choosing a profile picture opens a crop dialog. Users can drag the picture, use arrow keys to move it, adjust the zoom, and reset the crop. The circular preview matches how avatars appear in the app. Use picture updates the profile preview; Cancel keeps the previous picture. The picture is stored only after Save profile succeeds. Users can replace or remove it.

The browser accepts JPEG, PNG, and WebP files up to 5 MiB. It starts with a centered crop, lets the user choose its position and zoom, then exports that crop as a 256-pixel square JPEG. Cropping happens in the browser without an upload. The server checks the data reference, canonical base64 encoding, file signature, and decoded size, which must be at most 256KiB. It accepts PNG, JPEG, and WebP data references and refuses external URLs, SVG, and other formats.

Pictures are stored with profiles in MongoDB, so they remain available after an application restart without a local upload directory.

## Identifying cooking entries

Cooking entries keep their author identifiers. When a recipe loads, the page looks up each author's current profile. It shows their display name, or if they have no profile, their username. A missing picture is replaced with their initials.

Profile changes appear beside existing entries the next time the page loads. They do not rewrite entries or change who can edit them. If a profile lookup fails, the recipe and history stay usable, and the page offers a retry.
