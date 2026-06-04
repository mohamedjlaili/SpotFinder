/**
 * @file space.js
 * @description Core route configuration for the Space API endpoint.
 * Exposes core REST routes to manage space profiles.
 */

'use strict';
const { createCoreRouter } = require('@strapi/strapi').factories;
module.exports = createCoreRouter('api::space.space');
