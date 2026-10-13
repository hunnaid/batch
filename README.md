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

Collection members can read recipes and contribute recipes and cooking entries.
Only owners can manage collection membership, and only an entry's author can
edit that entry.

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

Otherwise, with Podman installed and running, create a local database container:

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

On macOS, start your existing Podman machine with `podman machine start`.
If you have never created one, run `podman machine init` first.

The named volume preserves database contents across container restarts.
The `dev` credentials are for local development.

For later runs, start the existing container instead of creating it again:

```sh
podman start batch-mongo
```

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

### Manual user journey

1. Register and sign in.
2. Create a collection called "Family Recipes."
3. Enter a recipe with ingredients, ordered instructions, and its source.
4. Add a cooking entry with adjustments, then edit it to record the result.
5. Register another account in a separate browser profile or private window.
6. Share the collection with that account by username.
7. Confirm the recipient can read the recipe and add their own entry,
   but cannot edit the original user's entry.
8. Revoke access and confirm the collection is no longer accessible.
9. Restart the application and confirm saved recipes and entries remain.

## Project Organization

- `src/concepts/`: independent concepts and MongoDB storage.
- `src/compositions/`: endpoints, reactions, and response formers.
- `web/src/`: Vue components and the generated-client integration.
- `design/concepts/`: implementation specifications.
- `design/compositions/`: composition documentation.
- `design/docs/`: P1 design documents.
- `generated/`: generated application documentation and API types.
- `tests/`: concept and composition tests.

## Current Limitations

- Recipes are entered manually; website imports are not implemented.
- Collections cannot yet be renamed or deleted through the interface.
- Cooking entries refer to the original recipe rather than branching
  from other entries.
- Shared changes appear when data is reloaded; there are no live updates.
- Unsaved form text can be lost when navigating away or refreshing.
- The interface is intentionally plain. Visual design is planned for P3.

The checker currently reports endpoint-coverage advisories and two
source-order notices. These are not failed checks or proof of correctness.
Selected refusal paths are tested, and list queries specify their ordering.

The frontend build also reports Node-module externalization warnings from
sync-engine dependencies. The built frontend's main workflow was manually
tested successfully.
