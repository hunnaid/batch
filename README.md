# Batch

Batch keeps original recipes, cooking adjustments, and results together so home cooks can repeat dishes they enjoyed and share how they actually made them.

## P1: Design

- [Problem framing and stakeholders](design/docs/problem-framing.md)
- [Application pitch](design/docs/pitch.md)
- [Concept specifications, essential reactions, and concept roles](design/docs/concepts.md)
- [UI Sketches and interaction notes](design/docs/ui-sketches.md)
- [User journey](design/docs/user-journey.md)

This repository contains the public project design and implementation work. The chronological design notebook is kept separately in a private repository.

----

## P2: Working MVP

Batch currently supports:

- Registering, signing in, and signing out.
- Creating collections and entering recipes manually.
- Recording cooking adjustments and results.
- Editing your own cooking entries.
- Sharing collections with registered users and revoking access.
- Renaming and deleting collections you own.

Collection members can read recipes and contribute recipes and cooking entries.
Only owners can rename or delete collections and manage membership.
Only an entry's author can edit that entry.

Deleting a collection removes the collection and its sharing permissions.
The original recipes and cooking entries remain stored separately.

## Requirements

- Bun (developed and tested with version 1.4.2).
- MongoDB 8.0.
- Podman if running MongoDB in a container.

The backend uses Bun and sync-engine. The frontend uses Vue and Vite.

## Setup

Clone the repository and install dependencies:

```sh
git clone https://github.com/hunnaid/batch.git
cd batch
bun install
```

For a fresh checkout, copy the environment template:

```sh
cp .env.example .env
```

The local development connection string is:

```env
MONGODB_URL=mongodb://dev:dev@127.0.0.1:27017/batch?authSource=admin
```

Keep `.env` untracked. Adjust it if your MongoDB credentials or address differ.

### Start MongoDB

If MongoDB is already running on port 27017 with matching credentials,
reuse it and skip the container-creation commands below.

Otherwise, start Podman. On macOS, start your existing Podman machine:

```sh
podman machine start
```

If you have never created a Podman machine, run `podman machine init` before starting it. If the machine is already running, continue to the next step.

Create a local database container:

```sh
podman volume create batch-mongo-data

podman run -d \
  --name batch-mongo \
  -p 127.0.0.1:27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=dev \
  -e MONGO_INITDB_ROOT_PASSWORD=dev \
  -v batch-mongo-data:/data/db \
  docker.io/library/mongo:8.0
```

The named volume preserves database contents across container restarts. The `dev` credentials are for local development.

If you created the container above, start it on later runs instead of creating it again:

```sh
podman start batch-mongo
```

If you reused an existing MongoDB container, start that container by its own name instead.

### Start Batch

With MongoDB running, use two terminals from the repository root.

Backend:

```sh
bun run start
```

Frontend:

```sh
bun run dev:frontend
```

Open http://localhost:5173.

The backend listens on port 8080. Vite forwards frontend `/api` requests
to it. Use `localhost` consistently for browser session cookies.

Register an account through the interface. A fresh database does not include
preconfigured accounts or recipes.

Press Ctrl+C in each application terminal to stop its server.

## Checks and Tests

MongoDB must be running for the database-backed tests.

```sh
bun test
bun run check
bun run check:frontend
bun run build:frontend
```

Tests cover the six concepts and selected composition flows. Each test file
uses a temporary database and removes it afterward.

After changing concept specifications or compositions, regenerate the
application documentation and API contract:

```sh
bun run generate
bun run check
```

The frontend uses the generated HTTP client contract in `generated/wire.ts`.

## Project Organization

- `src/concepts/`: independent concepts and MongoDB storage.
- `src/compositions/`: endpoints, reactions, and response formers.
- `src/http-policy.ts`: HTTP error mappings, session cookies, and request origins.
- `web/src/`: Vue components and the generated-client integration.
- `design/concepts/`: current concept specifications.
- `design/compositions/`: composition documentation.
- `design/docs/`: original P1 design documents.
- `generated/`: generated application documentation and API types.
- `tests/`: concept and composition tests.
- `AGENTS.md`: instructions for coding assistants working on the project.

## Current Limitations

- Recipes are entered manually; website imports are not implemented.
- Cooking entries refer to the original recipe rather than branching from other entries.
- The interface does not yet support adding an existing recipe to another collection.
- Deleting a collection retains its recipes and cooking entries in storage. Recipes that belong only to that collection become inaccessible through the interface; recovery is not implemented.
- Shared changes appear when data is reloaded; there are no live updates.
- Unsaved form text can be lost when navigating away or refreshing.
- The interface is intentionally plain. Visual polish is planned for later.

## Links

- [Narrated MVP demo](https://drive.google.com/file/d/1vGsjhs8QBaca15tqGHWBKg4QrXVZNgVh/view?usp=sharing)
- [P2 user journey](design/docs/p2-user-journey.md)

---

## P3: Beta

- [Live app](https://batch.mit-sdg.dev)

Batch is deployed on the class platform. The deployed app uses a separate
MongoDB database, so local accounts and recipes are not available online.
Register an account to try it.

The beta adds personal recipes, direct recipe sharing, profiles, and recipe
deletion. This section describes the current app. The P1 and P2 sections above
describe those earlier milestones.

### Current functionality

- **My recipes:** Save a recipe without choosing a collection. Search by
  title and sort A-Z, Z-A, newest first, or oldest first.
- **Collections:** Create, rename, and delete collections you own. Add a new
  recipe or organize an existing recipe into multiple collections. Each
  collection has an expandable recipe list.
- **Shared:** View collections and individual recipes shared with you or
  by you. Owner and Member labels distinguish user roles. Owners can see
  recipient usernames and revoke access beside each name.
- **Recipe details:** Enter ordered ingredients and instructions, an optional
  source, description, and notes. Ingredients appear beside instructions and
  notes on wider screens and stack on smaller screens.
- **Cooking history:** Record adjustments and results without changing the
  original recipe. Edit your own attempts. Entries show the contributor's
  current display name and picture.
- **Profiles:** Set a display name, optional bio, and optional profile picture.
  Sign out from the profile page. Changing display name does not change the username used for login.
- **Removal and deletion:** Collection owners can remove a recipe from their collection without permanently deleting it. Recipe owners can permanently delete a recipe, including cooking history, personal saves, collection references, and direct sharing.

The Collections tab shows collections you own. Collections where you are a
member appear in Shared. Owned collections shared with others appear in both.
My recipes lists personal saves. Receiving shared access does not automatically put a recipe in that list.

### Ownership and access

The backend identifies users through their sessions and enforces permissions.
Collection owners manage collection membership, names, and deletion. A recipe's
creator owns its direct sharing and permanent deletion, even when the recipe
was created in someone else's collection. Members can read recipes and add
cooking entries; only an entry's author can edit it.

Collections refer to the same recipe, so its original details and cooking
history stay together. Removing one collection membership or revoking direct
sharing preserves other access paths. Deleting a collection preserves recipes,
cooking entries, personal saves, and direct recipe sharing.

### Current specifications

The beta uses eight concepts. Sharing is instantiated separately for collection
permissions and direct recipe permissions.

| Concept | Responsibility |
| --- | --- |
| [RecipeRecording](design/concepts/RecipeRecording.md) | Original recipe details, descriptions, and notes |
| [CookingLog](design/concepts/CookingLog.md) | Cooking attempts, authorship, and results |
| [Collecting](design/concepts/Collecting.md) | Named collections and recipe memberships |
| [Saving](design/concepts/Saving.md) | Personal saved lists and addition dates |
| [Sharing](design/concepts/Sharing.md) | Resource ownership and access grants |
| [PasswordAuthenticating](design/concepts/PasswordAuthenticating.md) | Registration and credential verification |
| [Sessioning](design/concepts/Sessioning.md) | Login sessions and expiration |
| [Profiling](design/concepts/Profiling.md) | Display names, bios, and pictures |

Compositions coordinate these concepts: [Accounts](design/compositions/Accounts.md),
[Collections](design/compositions/Collections.md), [Recipes](design/compositions/Recipes.md),
[Shared](design/compositions/Shared.md), and [Profiles](design/compositions/Profiles.md).

### Running the beta locally

Use the dependency and MongoDB setup above, with `MONGODB_URL` configured in
an untracked `.env` file. Run these commands in separate terminals:

```sh
bun run dev:backend
```

```sh
bun run dev:frontend
```

Open http://localhost:5173. The backend watches for code changes. Register an
account through the interface; a fresh database has no preconfigured users.

### Validation

With MongoDB running, check the beta using:

```sh
bun test
bun run check
bun run check:frontend
bun run build:frontend
```

The [tests](tests/) cover all eight concepts and composition flows, including
unauthorized access, revoked permissions, repeated actions, recipient privacy,
deletion cleanup, profile-picture validation, and older recipes without optional
fields. Refusal tests check that unrelated state remains unchanged. Fixtures use
concept actions, and each suite uses a separate temporary database that is
removed afterward.

### P3 submission materials

- **Beta user journey and narrated recording:** Links to be added when updated.
- **Visual design study:** [Color](design/visual-study/visual-study-colors.jpg), [Typography](design/visual-study/visual-study-typography.jpg)
- **Saved test execution output:** Link to be added.

### Remaining limitations

- Recipes are entered manually; website imports are not yet implemented.
- Changes from another user's session appear when data is reloaded through
  navigation or Refresh. There are no live updates between sessions.
- Unsaved recipe and cooking-entry drafts can be lost when navigating away.
  Profile edits have a discard confirmation.
