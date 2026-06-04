/**
 * @file api.js
 * @description Strapi API configuration.
 * Configures the REST response behavior, pagination limits, and result count headers.
 */

module.exports = {
  rest: {
    // Default page limit size for REST API queries
    defaultLimit: 25,
    // Maximum page limit size query parameters can request
    maxLimit: 100,
    // Include overall total count metadata in REST responses
    withCount: true,
  },
};
