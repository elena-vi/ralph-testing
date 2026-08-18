/**
 * Pagination Configuration
 * ========================
 *
 * Centralized configuration for pagination defaults and constraints.
 * Defines the baseline page and page size values, and the maximum allowed
 * page size to prevent expensive queries.
 *
 * These values should be consistent across the server config. This is the
 * single source of truth for the client, imported everywhere pagination
 * is used.
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

  /**
   * Maximum allowed page size to prevent expensive queries
   * @type {number}
   */
  maxPageSize: 100,
};
