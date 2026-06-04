/**
 * @file admin.js
 * @description Strapi admin panel configuration.
 * Configures the admin dashboard JWT secret, API token salt, transfer token salt, 
 * encryption keys, and developer feature flags.
 */

module.exports = ({ env }) => ({
  auth: {
    // Admin panel JWT authentication signing secret key
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    // Salt used to generate API tokens for external API clients
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      // Salt used for data transfer tokens (Strapi enterprise content export/import)
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    // Custom encryption key used internally
    encryptionKey: env('ENCRYPTION_KEY'),
  },
  flags: {
    // Feature flags for Strapi administrative experiences
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
  },
});
