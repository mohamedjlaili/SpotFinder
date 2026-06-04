/**
 * @file server.js
 * @description Strapi application server configuration.
 * Configures the listening host, port, session application keys, and webhook relation settings.
 */

module.exports = ({ env }) => ({
  // Local server listening address (defaults to bind to all interfaces)
  host: env('HOST', '0.0.0.0'),
  // Local server listening port
  port: env.int('PORT', 1337),
  app: {
    // Session and authentication keys array
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    // Control if relations should be automatically populated in webhook payloads
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
