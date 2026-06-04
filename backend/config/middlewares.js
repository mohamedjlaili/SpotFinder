/**
 * @file middlewares.js
 * @description Strapi middlewares configuration array.
 * Configures logger, security, public static folder, session, favicon, body parsers,
 * and custom CORS origins and methods to facilitate cross-origin mobile app connections.
 */

module.exports = [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      // '*' allows requests from any origin (Flutter web, Android emulator, Postman, etc.)
      // ⚠️  Change to your specific domain(s) before deploying to production.
      origin: ['*'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeadersOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

