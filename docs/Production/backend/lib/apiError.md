# lib/apiError.ts - Standardized Error Responses
Factories giving every failure one shape: {error, code, request_id}. notFound 404 NOT_FOUND, validationError 422 VALIDATION_ERROR(+fields[]), unauthorized, forbidden, methodNotAllowed, serverError 500 INTERNAL_ERROR. Auto-embeds requestId for log correlation. Used by nearly all routes.
