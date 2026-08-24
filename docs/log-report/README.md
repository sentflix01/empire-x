# Implementation Log

> **Every task merged to `main` gets an auditable report here** — auto-generated
> from the commit itself (message, changed files, stats), so the log can never
> disagree with what actually shipped.

## The four questions each report answers
1. **What was this task?** — categorized work item
2. **Why does it exist?** — the commit's stated rationale
3. **What was done?** — files changed, insertions/deletions, test + doc coverage flags
4. **Verification** — merged only after the blocking CI gate passed for that exact commit

## How it works
| Step | What happens |
|---|---|
| You merge a PR (or push to main) | CI runs: typecheck → tests → build |
| Green CI → `Nodbusiness Docs Sync` | Regenerates API reference, syncs Production encyclopedia, **then generates one report per new commit here** and auto-commits with `[skip ci]` |
| Locally | `npm run log:sync` — same generation, idempotent |

## Conventions
- File naming: `YYYY-MM-DD-<short-hash>-<slug>.md` — one per commit
- `INDEX.md` is the chronological table (newest first), regenerated every run
- Bot commits (`[skip ci]`) are excluded to keep the log human-meaningful
- Reports are append-only history — never edit a shipped report; add follow-up commits instead

## Related
- `docs/operations/CHANGE_LOG.md` — user-facing release narrative (curated)
- `docs/Production/` — what every file in the codebase does
- This folder — **proof of what was done, when, and how big it was**
