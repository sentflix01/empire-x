# scripts/generate-api-docs.js - API Reference Generator (anti-drift)

## 1. What is this?

**Operational script.** Parses index.ts mounts + every routes/*.ts registration (method/path/auth/source line) and regenerates docs/backend/API_REFERENCE.md + api-catalog.json (255 endpoints).

## 2. Why does it exist?

Parses index.ts mounts + every routes/*.ts registration (method/path/auth/source line) and regenerates docs/backend/API_REFERENCE.md + api-catalog.json (255 endpoints). PR rule: changed routes? run npm run docs:api and commit output.

## 3. What does it do?

Parses index.ts mounts + every routes/*.ts registration (method/path/auth/source line) and regenerates docs/backend/API_REFERENCE.md + api-catalog.json (255 endpoints). PR rule: changed routes? run npm run docs:api and commit output.

## 4. What does it touch?

Inline references only — nothing external.
