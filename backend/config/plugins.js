/**
 * @file plugins.js
 * @description Strapi plugins configuration.
 * Configures the core users-permissions plugin to permit registering customized
 * extra fields (e.g., custom role types) on user registration.
 */

module.exports = () => ({
  'users-permissions': {
    config: {
      register: {
        // Allows custom role type metadata field to be submitted during registration
        allowedFields: ['roleType'],
      },
    },
  },
});
