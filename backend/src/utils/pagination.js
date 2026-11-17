// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Pagination & Filtering Utilities
//  Parse and validate pagination query params.
// ═══════════════════════════════════════════════════════

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination params from query string.
 * @param {object} query - req.query
 * @returns {{ page, limit, offset }}
 */
function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build a Supabase query range from pagination params.
 * @param {object} query - Supabase query builder
 * @param {{ page, limit, offset }} pagination
 */
function applyPagination(query, { offset, limit }) {
  return query.range(offset, offset + limit - 1);
}

/**
 * Parse a sort parameter: "field:asc" or "field:desc".
 * Returns safe column + direction.
 * @param {string} sortParam - e.g. "created_at:desc"
 * @param {string[]} allowedColumns - Whitelist of sortable columns
 * @param {string} defaultColumn - Default sort column
 */
function parseSort(sortParam, allowedColumns, defaultColumn = 'created_at') {
  if (!sortParam) return { column: defaultColumn, ascending: false };

  const [col, dir] = sortParam.split(':');
  const column = allowedColumns.includes(col) ? col : defaultColumn;
  const ascending = dir === 'asc';

  return { column, ascending };
}

/**
 * Parse and sanitize a search query string.
 * Removes SQL special chars that could cause issues.
 */
function parseSearch(searchParam) {
  if (!searchParam || typeof searchParam !== 'string') return null;
  // Remove characters that shouldn't appear in search terms
  return searchParam.replace(/[%_\\;'"<>]/g, '').trim().slice(0, 200);
}

module.exports = { parsePagination, applyPagination, parseSort, parseSearch };

