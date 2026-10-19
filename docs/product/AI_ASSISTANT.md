# Nodbusiness AI Guide

## Purpose

The signed-in in-app AI assistant provides page-aware navigation and product guidance, including an optional conversational tour. It cannot perform account actions, orders, refunds, messages, or support escalation for the user.

## Prompt source

`backend/lib/aiGuidePrompt.ts` is the canonical system prompt used by `POST /api/ai/chat`. The detailed discovery report in `note/2026-10-19-ai-tour-guide-discovery.md`, Section D, is its review copy and should be kept synchronized when prompt behavior changes.

The backend owns the system prompt. Client-provided `system_prompt` values are ignored. The chat API accepts user/assistant messages only; callers cannot add system messages. The guide prompt applies for OpenAI, Google Gemini, and Anthropic through the shared AI provider adapter.

## Runtime context

The web client may send these minimal hints with a chat request:

- A normalized page route (dynamic IDs and usernames are replaced by route placeholders).
- A viewport class: `compact`, `medium`, or `wide`.
- The selected app locale: `en` or `am`.
- An optional `tourMode` boolean indicating that the current response belongs to a guided tour; it is a client hint and never grants access or changes account state.
- Session mode (`demo` or `real`), derived by the server from the authenticated user.

The server validates the page, viewport, and locale hints and treats them as untrusted context, not instructions. Session mode comes from authenticated server state. It does not send a device identifier, user profile, location, or browser history as guide context. The assistant must not infer a physical device model, country, assistive technology, or hidden page state from a viewport class.

## Access and behavior

- The floating assistant launcher is rendered with the shared root providers, remains present in server-rendered pages before client hydration, and uses the highest app-layer z-index to stay above app overlays. It keeps its animated 3D coin icon and supports pointer dragging across touch, mouse, and pen devices. Saved drag coordinates restore before the first client paint and clamp to the visible viewport with a safe-area margin after resize, browser viewport changes, or device rotation. The open panel is constrained to the available viewport.
- The chat API requires authentication and the `ai_chat` feature flag. Guests can browse eligible public pages but must sign in to use server-backed AI guidance.
- The client retains conversation history in local storage per guest/account and demo/real session. It sends at most the most recent 20 messages per request; the API validates message roles, lengths, and total request size. Provider adapters retain up to the latest 10 conversation messages for model context.
- The online endpoint returns both `reply` (current frontend contract) and `text` (compatibility field).
- Signed-in users who are online can start a guided tour from the assistant welcome screen. The tour explains one verified area at a time and waits for the user to request the next step. An “End tour” control is available while active; changing routes ends the tour and displays a localized notice. Tour mode is passed as an untrusted boolean hint to the backend and only affects response instructions.
- The tour is conversational only. It does not navigate, highlight controls, or inspect the live page. The assistant receives a normalized route and viewport class, not a screenshot or DOM. It must ask what the user sees when route-level information cannot verify an area.
- Tour start and end controls are localized in English and Amharic, use touch-sized targets, and appear in the responsive assistant panel. Guests cannot start a server-backed tour; the end control remains available if connectivity drops during an active tour.
- Offline client responses are limited to greetings and assistant identity. Product-specific instructions require a connection so stale client-side rules do not override reviewed product behavior.
- AI provider errors shown to the user are generic. Provider configuration details remain in server logs and must not be repeated as user guidance.
- The guide adapts instructions to the current page, viewport, and selected locale when available. It does not claim identical controls across screen sizes or WCAG conformance; accessibility support is partial and has not been fully audited.

## Updating the guide

When changing the prompt, update the canonical prompt and Section D of the dated discovery report together. Check all supported provider adapters, the `/api/ai/chat` request/response contract, offline fallback copy, and the English and Amharic assistant strings. Do not add behavior claims unless the relevant current UI and backend path support them.
