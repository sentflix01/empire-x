/**
 * API Version middleware
 * Sets the API-Version response header on every response.
 */
module.exports = (_req, res, next) => {
  res.setHeader('API-Version', '1');
  next();
};
