/**
 * @file reservation.js
 * @description Core service layer configuration for the Reservation API endpoint.
 * Exposes core service layer methods for database query executions.
 */

'use strict';
const { createCoreService } = require('@strapi/strapi').factories;
module.exports = createCoreService('api::reservation.reservation');
