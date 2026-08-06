/**
 * Adds an accurate response-time header before Node commits the response
 * headers.  Setting headers from the `finish` event is too late and throws
 * ERR_HTTP_HEADERS_SENT for every completed request.
 */
module.exports = function responseTime(req, res, next) {
  const startedAt = Date.now();
  const setResponseTime = () => {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${Date.now() - startedAt}ms`);
    }
  };

  const writeHead = res.writeHead;
  res.writeHead = function writeHeadWithResponseTime(...args) {
    setResponseTime();
    return writeHead.apply(this, args);
  };

  // Covers handlers that intentionally flush headers before writing a body.
  const flushHeaders = res.flushHeaders;
  res.flushHeaders = function flushHeadersWithResponseTime(...args) {
    setResponseTime();
    return flushHeaders.apply(this, args);
  };

  next();
};
