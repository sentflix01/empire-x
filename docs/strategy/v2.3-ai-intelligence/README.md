# v2.3 — AI & Intelligence

> **Theme:** Smart Features
> **Goal:** AI makes every part of Nodbusiness smarter — helping sellers write better listings, surfacing the most relevant content in the feed, and giving users a genuinely useful assistant.

---

## Scope

| Section | File |
|---------|------|
| AI assistant | [audit.md](./ai-assistant/audit.md) · [tasks.md](./ai-assistant/tasks.md) |
| AI product descriptions | [audit.md](./ai-descriptions/audit.md) · [tasks.md](./ai-descriptions/tasks.md) |
| Feed relevance ranking | [audit.md](./feed-ranking/audit.md) · [tasks.md](./feed-ranking/tasks.md) |
| Smart search | [audit.md](./smart-search/audit.md) · [tasks.md](./smart-search/tasks.md) |
| Content moderation AI | [audit.md](./moderation-ai/audit.md) · [tasks.md](./moderation-ai/tasks.md) |
| Business insights AI | [audit.md](./business-insights/audit.md) · [tasks.md](./business-insights/tasks.md) |

---

## Success Criteria

**AI Assistant**
- [ ] Floating chat button on all app pages
- [ ] Answers questions about the app, features, how-tos instantly (offline rules engine)
- [ ] Falls back to OpenAI/Gemini/Claude for complex questions
- [ ] Remembers conversation context within a session
- [ ] Responds in the user's language (Amharic or English detected automatically)
- [ ] Suggested prompts shown when chat is empty

**AI Product Descriptions**
- [ ] "Generate with AI" button on product creation form
- [ ] Uses product title + category to generate compelling description
- [ ] User can regenerate or edit the result
- [ ] Response in < 3 seconds

**Feed Ranking (Feature-Flagged)**
- [ ] Personalized feed based on: follows, likes, engagement history, location
- [ ] Relevance score calculation is deterministic and logged
- [ ] A/B testable via feature flag percentage rollout
- [ ] Chronological feed always available as fallback toggle

**Smart Search**
- [ ] Typo tolerance (fuzzy matching)
- [ ] Semantic understanding ("cheap phones" → electronics category)
- [ ] Auto-complete based on popular searches

**Business Insights**
- [ ] "AI Insights" card on seller analytics: "Your top performing product is X"
- [ ] Suggestions: "Consider lowering this price — similar items sell faster at Y ETB"

---

## Dependencies

- Backend: ai.js abstraction layer (exists, supports OpenAI/Gemini/Anthropic)
- Backend: feed ranking endpoint (feature-flagged, needs implementation)
- Frontend: AI chat component (exists), needs session memory
