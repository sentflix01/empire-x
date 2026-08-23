# Production — The Codebase Encyclopedia

> Every source file in the running Nodbusiness app explained in plain language.
> Read this folder top-to-bottom and you understand the entire product without
> opening a single line of code.

## The four-question standard
Every document answers the same four questions, in this order:

| # | Section | Answers |
|---|---------|---------|
| 1 | **What is this?** | File identity: kind of module, one-line essence, size |
| 2 | **Why does it exist?** | The problem it solves / reason it was created |
| 3 | **What does it do?** | Functionality in plain language (endpoints, tables, behavior) |
| 4 | **What does it touch?** | Connections: APIs, DB tables, libraries, related docs |

## Conventions
- Meaningful files get one document each; trivial boilerplate (thin page
  wrappers, numbered migrations) is grouped into a single doc with a table.
- Route endpoint tables are generated from backend/api-catalog.json and can be
  refreshed with `npm run docs:api`.
- All claims verified against source during the August 2026 audit passes.

## Navigation
Start at INDEX.md for the full map.
