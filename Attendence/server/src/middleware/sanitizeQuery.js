/**
 * NoSQL-injection guard for query strings (Phase 9).
 * Express' extended query parser turns `?class[$ne]=x` into
 * `{ class: { $ne: 'x' } }`, which would otherwise flow straight into
 * Mongo filters. The API only ever accepts scalar string params
 * (page, limit, search, sort, dates, ids...), so reject anything else.
 */
export const sanitizeQuery = (req, res, next) => {
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value !== 'string') {
      return res.status(400).json({
        success: false,
        message: `Invalid query parameter: ${key}`,
      });
    }
  }
  return next();
};
