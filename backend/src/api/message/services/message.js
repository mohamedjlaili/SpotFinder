/**
 * @file message.js
 * @description Core service configuration for the Message API endpoint.
 * Exposes core service layer methods for CRUD database querying.
 */

'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::message.message');
