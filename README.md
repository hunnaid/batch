# Batch

Batch keeps original recipes, cooking adjustments, and results together so home cooks can repeat dishes they enjoyed and share how they actually made them. Each recipe has a shared cooking history, so another cook can learn from earlier attempts without losing the original instructions.

**[Try Batch](https://batch.mit-sdg.dev)** - **[Final design summary](design/docs/p4-design-summary.md)** - **[Final narrated user journey]()** - **[Final user journey](design/docs/final-user-journey.md)**

Register an account to try the deployed app. It uses a separate database, so local accounts and recipes will not be available online.

## Using Batch

- **My recipes:** Save a recipe without choosing a collection. Search by title and sort A-Z, Z-A, newest first, or oldest first. Date added means when you first saved the recipe.
- **Recipe entry and editing:** Enter ingredients and instructions in ordered sections with optional headings, plus a description, source, and notes. Owners can edit the recipe later. Ingredients sit beside instructions on wider screens and stack on smaller screens.
- **Website import:** Import a public recipe URL or paste copied page text or HTML. Review and edit the filled form before saving to My recipes or the selected collection. URL imports include the source link; paste imports leave it blank for you to add. Importing alone does not save a recipe.
- **Cooking history:** Record adjustments and results, then edit your own entry after tasting the dish. Entries identify contributors by their current display names and pictures. A cook can read earlier attempts to decide which adjustments to try next.
- **Shared:** Open collections and individual recipes shared with you or by you. Collection owners and members can contribute recipes and cooking entries. Owners can see recipient usernames and revoke access beside each name.
- **Profiles:** Set a display name, optional bio, and picture. Crop and preview a picture before saving. Changing your display name leaves your login username unchanged. Sign out from the profile page.

My recipes contains personal saves. Receiving shared access does not automatically add a recipe there. Collections shows collections you own. Shared shows shared collections and directly shared recipes, including those you have shared with others.

## Ownership and access

The backend identifies users through their sessions and enforces permissions. Collection owners manage collection names, membership, deletion, and removal of recipes from that collection. A recipe's creator controls its original details, direct sharing, and permanent deletion, including when they created it in someone else's collection. Only a cooking entry's author can edit it, while they retain access to the recipe.

Collections and direct sharing refer to the same recipe and cooking history. Editing the original updates it everywhere. Existing cooking entries retain their text and are not snapshots of earlier recipe versions.

Removal and deletion have different consequences:

- **Remove from collection** removes only that collection membership.
- **Delete collection** removes the collection and its sharing permissions while preserving recipes, cooking history, personal saves, and direct recipe sharing.
- **Delete recipe permanently** removes the recipe, all cooking entries, personal saves, collection references, and direct sharing for everyone.

The interface explains these consequences before confirmation. Revoking one access path preserves any other access the user still has.

## Run locally

### Requirements

- Bun, developed with version 1.4.2.
- MongoDB 8.0.
- Podman if using the database container below.
- A Gemini API key with access and quota for the configured model, only for website or pasted-content importing.

The backend uses Bun, MongoDB, and sync-engine. The frontend uses Vue and Vite.

### Install and configure

```sh
git clone https://github.com/hunnaid/batch.git
cd batch
bun install
cp .env.example .env
```

Set the database connection in `.env`:

```env
MONGODB_URL=mongodb://dev:dev@127.0.0.1:27017/batch?authSource=admin
```

Keep `.env` untracked. Change the address or credentials if using a different MongoDB instance.

For importing, also set `GEMINI_API_KEY` in the backend environment. `GEMINI_MODEL` optionally overrides the configured model. Keep the key out of frontend code and variables prefixed with `VITE_`. Restart the backend after changing environment settings. Manual entry and the rest of Batch work without a Gemini key.

### Start MongoDB

If MongoDB is already running on port 27017 with matching credentials, use that instance. Otherwise, on macOS, start your Podman machine:

```sh
podman machine start
```

If no machine exists, run `podman machine init` first. If it is already running, continue.

Create the database container once:

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

The volume preserves data across container restarts. These credentials are for local development. On later runs, start the existing container:

```sh
podman start batch-mongo
```

If you use another existing container, start it by its own name.

### Start the app

Run these in separate terminals from the repository root:

```sh
bun run dev:backend
```

```sh
bun run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). The backend listens on port 8080, and Vite forwards `/api` requests to it. Use `localhost` consistently for browser session cookies. Register through the interface; a fresh database has no preconfigured accounts or recipes.

Press Ctrl+C in each terminal to stop the servers.

### Build and deployment configuration

Build the frontend with `bun run build:frontend`. The Bun server serves the built frontend and API; `bun run start` starts it without development watching.

The deployed backend needs its own `MONGODB_URL` and `PUBLIC_ORIGIN` set to its public origin, such as `https://batch.mit-sdg.dev`. It reads `HOST` and `PORT` from the environment. Set `NODE_ENV=production` for production request-origin handling. Configure `GEMINI_API_KEY` separately in the deployment environment if importing is enabled.

## Testing and validation

With MongoDB running, run:

```sh
bun test
bun run check
bun run check:frontend
bun run build:frontend
```

The [test suites](tests/) cover concept behavior and composition flows, including recipe saving, adding and editing cooking entries, original-recipe editing, sharing and revocation, permissions, repeated actions, deletion, profiles, and import drafts. Refusal tests check that relevant stored state stays unchanged. Database-backed suites use temporary databases and remove them afterward; fixtures create data through concept actions.

Automated import tests inject an extractor and make no Gemini requests. They do not establish that a particular website or live provider request works.

To save the full test output while preserving the test command's exit status:

```sh
mkdir -p test-results
set -o pipefail
bun test 2>&1 | tee test-results/p4-tests.txt
```

See the [P4 test output](test-results/p4-tests.txt) for automated test results and [final design summary](design/docs/p4-design-summary.md) for the validation findings and remaining limitations.

After changing specifications or compositions, regenerate the application documentation and API contract, then check them:

```sh
bun run generate
bun run check
```

The frontend uses `generated/wire.ts`. Generated files are produced from the authored application; update the source specifications and code, then regenerate them.

## Design and project materials

| Material | Link |
| --- | --- |
| P4 design summary: final decisions and changes from P1 and P3 | [Final design summary](design/docs/p4-design-summary.md) |
| P4 narrated video and demonstrated journey | [Final demo](design/docs/p4-demo.md) |
| P4 saved test execution | [Test output](test-results/p4-tests.txt) |
| P3 visual design study | [Color](design/visual-study/visual-study-colors.jpg), [Typography](design/visual-study/visual-study-typography.jpg) |
| Generated application reference | [Application](generated/application.md) |

Current specifications describe nine concepts. Sharing has separate instances for collection permissions and direct recipe permissions.

| Concept | Responsibility |
| --- | --- |
| [RecipeRecording](design/concepts/RecipeRecording.md) | Original recipe details and sections, editing, and deletion |
| [RecipeImporting](design/concepts/RecipeImporting.md) | Extracting unsaved recipe drafts for review |
| [CookingLog](design/concepts/CookingLog.md) | Cooking attempts, authorship, adjustments, and results |
| [Collecting](design/concepts/Collecting.md) | Named collections and recipe memberships |
| [Saving](design/concepts/Saving.md) | Personal saved lists and first-save dates |
| [Sharing](design/concepts/Sharing.md) | Resource ownership and access grants |
| [PasswordAuthenticating](design/concepts/PasswordAuthenticating.md) | Registration and credential verification |
| [Sessioning](design/concepts/Sessioning.md) | Login sessions and expiration |
| [Profiling](design/concepts/Profiling.md) | Display names, bios, and pictures |

[Accounts](design/compositions/Accounts.md), [Collections](design/compositions/Collections.md), [Recipes](design/compositions/Recipes.md), [Shared](design/compositions/Shared.md), [Profiles](design/compositions/Profiles.md), and [Imports](design/compositions/Imports.md) coordinate the concepts. The chronological design notebook is maintained in the separate private individual repository.

### Earlier milestones

- **P1:** [Problem framing](design/docs/problem-framing.md), [Pitch](design/docs/pitch.md), [Initial concept design](design/docs/concepts.md), [UI sketches](design/docs/ui-sketches.md), [Initial journey](design/docs/user-journey.md).
- **P2:** [User journey](design/docs/p2-user-journey.md), [Narrated MVP demo](https://drive.google.com/file/d/1vGsjhs8QBaca15tqGHWBKg4QrXVZNgVh/view?usp=sharing).
- **P3:** [User journey](design/docs/p3-user-journey.md), [Narrated beta demo](https://youtu.be/v7i8ic0bSIc), [Saved test output](test-results/p3-tests.txt).

## Repository structure

- `src/concepts/`: concept implementations and their storage.
- `src/compositions/`: application endpoints, reactions, views, and response formers.
- `src/http-policy.ts`: public errors, session cookies, and allowed request origins.
- `web/src/`: Vue interface and API client integration.
- `design/concepts/` and `design/compositions/`: current authored specifications.
- `design/docs/` and `design/visual-study/`: design documents, journeys, and visual references.
- `generated/`: generated application documentation and API contracts.
- `tests/` and `test-results/`: automated tests and saved execution output.

## Known limitations

- Imports depend on page access and provider availability. Some websites block retrieval or require login. Imported quantities, instructions, and sections need review before saving.
- Cooking entries refer to the recipe rather than branching from earlier attempts. Editing the original does not preserve earlier recipe versions.
- Changes from another session appear after navigation or Refresh; there are no live updates between sessions.
- Unsaved recipe and cooking-entry drafts can be lost when navigating away or refreshing. Profile edits have a discard confirmation.
- Permanent deletion runs across concepts in sequence. If a cleanup action fails, earlier deletions are not undone and related records may need repair.
- Password recovery is not implemented.
