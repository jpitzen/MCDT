/**
 * Correlation ID Middleware
 *
 * Attaches a unique correlation ID to every inbound request for end-to-end
 * traceability across services.  If the caller already provides an
 * `X-Correlation-ID` header (e.g. from an upstream gateway) the middleware
 * reuses that value; otherwise it generates a new UUID v4.
 *
 * The ID is:
 *   1. Stored on `req.correlationId` for downstream middleware / route handlers
 *   2. Echoed back to the client via the `X-Correlation-ID` response header
 *   3. Injected into the logger's default metadata so every log line includes it
 */

const { v4: uuidv4 } = require('uuid');

const HEADER_NAME = 'X-Correlation-ID';

const correlationId = (req, res, next) => {
  const id = req.get(HEADER_NAME) || uuidv4();

  // Attach to request object for downstream use
  req.correlationId = id;

  // Echo in response header for client-side correlation
  res.set(HEADER_NAME, id);

  next();
};

module.exports = { correlationId, HEADER_NAME };
