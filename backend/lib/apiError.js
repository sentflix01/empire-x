/**
 * Standardised API error helpers.
 * Each helper sends the appropriate HTTP status and a consistent JSON error shape.
 */

function notFound(res, msg) {
  return res.status(404).json({
    error: msg || 'Resource not found',
    code: 'NOT_FOUND',
  });
}

function validationError(res, summary, fields) {
  return res.status(422).json({
    error: summary,
    code: 'VALIDATION_ERROR',
    fields: fields || [],
  });
}

function methodNotAllowed(res) {
  return res.status(405).json({
    error: 'Method not allowed',
    code: 'METHOD_NOT_ALLOWED',
  });
}

function serverError(res, msg) {
  return res.status(500).json({
    error: msg || 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}

module.exports = { notFound, validationError, methodNotAllowed, serverError };
