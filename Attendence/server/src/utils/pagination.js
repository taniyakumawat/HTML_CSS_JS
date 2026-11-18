/** Escape user input for safe use inside a RegExp. */
export const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse pagination + sorting from the query string.
 * @returns {{ page:number, limit:number, skip:number, search:string, sort:object }}
 */
export const getPagination = (req, defaultLimit = 10) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();

  // sort: "-createdAt" (desc), "name" (asc), default newest first.
  // Field names are whitelisted to word characters so a crafted `sort`
  // can never inject operators ($where, ...) into the Mongo sort spec.
  const rawSort = String(req.query.sort || '-createdAt');
  const sort = {};
  for (const part of rawSort.split(',')) {
    if (!part) continue;
    const field = part.startsWith('-') ? part.slice(1) : part;
    if (!/^[A-Za-z0-9_]+$/.test(field)) continue;
    sort[field] = part.startsWith('-') ? -1 : 1;
  }

  return { page, limit, skip, search, sort };
};

/** Build a case-insensitive $or filter over the given fields. */
export const buildSearchFilter = (search, fields = []) => {
  if (!search || !fields.length) return {};
  return {
    $or: fields.map((field) => ({
      [field]: { $regex: escapeRegex(search), $options: 'i' },
    })),
  };
};

/** Standard paginated payload shape. */
export const paged = (items, page, limit, total) => ({
  items,
  page,
  limit,
  total,
  totalPages: Math.max(1, Math.ceil(total / limit)),
});
