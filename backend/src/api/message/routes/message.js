/**
 * @file message.js
 * @description Core route configuration for the Message API endpoint.
 * Exposes default REST routes for message querying, creation, updating, and deletion.
 */

'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::message.message');
