const { v4: uuidv4 } = require('uuid');

/**
 * Request ID middleware.
 *
 * Reads an incoming `X-Request-ID` header if present; otherwise generates a
 * new UUID v4. The value is attached to `req.requestId` for use in downstream
 * middleware and route handlers (e.g. structured log entries) and echoed back
 * in the `X-Request-ID` response header so clients can correlate requests.
 *
 * Requirements: 5.8
 */
module.exports = (req, res, next) => {
  const id = req.headers['x-request-id'] || uuidv4();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
};
