# Working on Batch

Batch helps home cooks save original recipes, record cooking adjustments
and results, and share collections.

## Collaboration

- This is a learning project. Explain proposed changes and their purpose.
- Default to small steps that I can implement myself.
- Do not edit files unless I ask you to.
- Keep the MVP interface simple. Avoid adding features or dependencies
  without discussing why they are needed.
- Add useful comments explaining responsibilities, assumptions, and
  non-obvious behavior. Avoid comments that just repeat the code.

## Stack

- Bun and TypeScript
- MongoDB
- @mit-sdg/sync-engine 1.1.0
- @mit-sdg/sync-engine-http 1.1.0
- Vue with Vite

Use the installed package documentation to verify unfamiliar sync-engine
APIs. Keep the engine and HTTP adapter versions aligned.

## Organization

- src/concepts/: independent concepts and MongoDB persistence
- src/compositions/: reactions, endpoints, and application views
- src/http-policy.ts: HTTP errors, session cookies, and request origins
- web/src/: Vue interface and generated API client usage
- tests/: concept and composition tests
- design/concepts/: current concept specifications
- design/compositions/: current composition documentation
- design/docs/: original P1 design documents
- generated/: generated application documentation and wire types

Keep both TypeScript configurations: the root configuration checks the
backend, and web/tsconfig.json checks the frontend.

## Design rules

- Concepts must not depend on another concept's implementation or storage.
- Coordinate concepts through compositions.
- Derive the acting user's identity from their session.
- Enforce permissions on the backend, even when controls are hidden in Vue.
- Validate endpoint input at runtime; TypeScript types alone are insufficient.
- Preserve original recipes and previous cooking attempts.
- Deleting a collection leaves recipes and cooking entries stored.
- Update current design specifications when behavior changes.
- Do not rewrite P1 documents to make them appear to describe later decisions.

## Generated files

Do not manually edit generated files. Update their source definitions,
then run:

    bun run generate

## Verification

Run the checks relevant to the change:

    bun test
    bun run check
    bun run check:frontend
    bun run build:frontend

Add meaningful tests for new behavior, especially permissions and
changes to stored data.

Tests must use separate temporary databases. Never clear the application
database to run tests.

Report what was actually checked and any remaining limitations.
Do not dismiss diagnostic advisories without investigating them.

## Local configuration

- Keep .env out of Git.
- Keep .env.example limited to local development defaults.
- Do not include real credentials or session tokens in documentation.
- Do not stop, delete, or reset existing database containers or volumes
  without explicit permission.
