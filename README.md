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

- [Live app](https://YOUR-APP-NAME.mit-sdg.dev)

Batch is deployed on the class platform. The deployed app uses a separate
MongoDB database, so local accounts and recipes are not available online.
Register an account to try it.

Further functionality and interface improvements are in progress.
