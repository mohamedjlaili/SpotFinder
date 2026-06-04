/**
 * @file reservation.js
 * @description Core route configuration for the Reservation API endpoint.
 * Exposes core REST endpoints to manage space booking entries.
 */

'use strict';
const { createCoreRouter } = require('@strapi/strapi').factories;
module.exports = createCoreRouter('api::reservation.reservation');
