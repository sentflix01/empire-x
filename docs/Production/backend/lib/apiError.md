# lib/apiError.ts - Standardized Error Responses

## 1. What is this?

**Shared frontend library.** Factories giving every failure one shape: {error, code, request_id}.

## 2. Why does it exist?

Factories giving every failure one shape: {error, code, request_id}. notFound 404 NOT_FOUND, validationError 422 VALIDATION_ERROR(+fields[]), unauthorized, forbidden, methodNotAllowed, serverError 500 INTERNAL_ERROR. Auto-embeds requestId for log correlation. Used by nearly all routes.

## 3. What does it do?

Factories giving every failure one shape: {error, code, request_id}. notFound 404 NOT_FOUND, validationError 422 VALIDATION_ERROR(+fields[]), unauthorized, forbidden, methodNotAllowed, serverError 500 INTERNAL_ERROR. Auto-embeds requestId for log correlation. Used by nearly all routes.

## 4. What does it touch?

Inline references only — nothing external.
