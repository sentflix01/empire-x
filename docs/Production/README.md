# Production — The Codebase Encyclopedia

> Every source file in the running Nodbusiness app explained in plain language.
> Read this folder top-to-bottom and you understand the entire product without
> opening a single line of code.

## How to read this folder
1. Start with `INDEX.md` — the map of everything.
2. Each document follows the same template so you always know where to look:

| Section | Answers |
|---|---|
| **Purpose** | Why does this file exist? |
| **What It Does** | Functionality in plain language |
| **Key Exports** | Table of functions/components and what they do |
| **Connects To** | What it imports, who consumes it, which DB tables |
| **Data & Security** | Auth levels, validation, money-safety notes |
| **Related Docs** | Links into the wider documentation |

## Conventions
- Meaningful files get **one document each**: `routes/orders.md` etc.
- Trivial boilerplate (thin Next.js page wrappers, numbered DB migrations) is
  **grouped** into one document with a per-file table - flagged in INDEX.md.
- Docs are regenerated knowledge, not guesses: every claim was verified against
  the code during the August 2026 audit passes.
