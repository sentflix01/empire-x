# lib/ai.ts - Multi-Provider AI Client
Text generation via OpenAI / Gemini / Anthropic selected by AI_PROVIDER with per-provider key checks. Powers product-description generation and AI chat behind flags ai_description_gen / ai_chat. Missing keys degrade to clean 503-style errors.
