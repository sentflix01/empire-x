# scripts/generate-api-docs.js - API Reference Generator (anti-drift)
Parses index.ts mounts + every routes/*.ts registration (method/path/auth/source line) and regenerates docs/backend/API_REFERENCE.md + api-catalog.json (255 endpoints). PR rule: changed routes? run npm run docs:api and commit output.
