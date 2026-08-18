/**
 * Pagination Configuration
 * ========================
 *
 * Centralized configuration for pagination defaults, defining the baseline
 * page and page size the client requests.
 *
 * These values mirror the defaults in `src/server/config/pagination.js` and
 * must stay consistent with them. This is the single source of truth for the
 * client, imported everywhere pagination is used. The server owns the maximum
 * page size and clamps any request that exceeds it, so that cap is not
 * duplicated here.
 */

export const paginationConfig = {
  /**
   * Default page number (1-indexed)
   * @type {number}
   */
  defaultPage: 1,

  /**
   * Default page size in records
   * @type {number}
   */
  defaultPageSize: 20,
};
