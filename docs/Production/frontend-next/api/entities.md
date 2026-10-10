# frontend-next/api/entities

<!-- AUTO-STUB  2026-08-23 — curate narrative below -->

## 1. What is this?

**API client module.** Newly added module — narrative pending curation.

Size: roughly 370 lines of source.

## 2. Why does it exist?

Newly introduced as part of recent development; see source and git history for the introducing commit.

## 3. What does it do?

Extracted facts (auto):
- Lines: ~370
- API references:
  - `/api/${path}`
  - `/api/${path}/${id}`
  - `/api/messages/conversations`
  - `/api/messages/conversations/${id}`
  - `/api/messages/conversations/${filterObj.conversation_id}/messages`
  - `/api/messages/conversations/${conversation_id}/messages`
  - `/api/messages/messages/${id}`
  - Generic entity routes use `/api/${path}` and `/api/${path}/${id}`. Task APIs are deferred and are not part of the active client contract.

## 4. What does it touch?

**Source:** `frontend-next/api/entities.ts`
