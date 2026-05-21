'use strict';

/**
 * Admin Dashboard Routes
 * Path: src/admin/routes/admin-dashboard.js
 *
 * All routes require a valid JWT. Access is restricted to users
 * with user_role = 'admin' via the 'admin-only' policy below.
 *
 * Registration: this file is picked up automatically by Strapi
 * as long as it is placed in src/admin/routes/ and the controller
 * is in src/admin/controllers/.
 */

module.exports = {
  routes: [
    // ── Stats ─────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/admin-dashboard/stats',
      handler: 'admin-dashboard.getStats',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['find'] },
      },
    },

    // ── Managers ──────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/admin-dashboard/managers',
      handler: 'admin-dashboard.getManagers',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['find'] },
      },
    },
    {
      method: 'POST',
      path: '/admin-dashboard/managers',
      handler: 'admin-dashboard.createManager',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['create'] },
      },
    },
    {
      method: 'DELETE',
      path: '/admin-dashboard/managers/:id',
      handler: 'admin-dashboard.deleteManager',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['delete'] },
      },
    },

    // ── Spaces ────────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/admin-dashboard/spaces',
      handler: 'admin-dashboard.getSpaces',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['find'] },
      },
    },
    {
      method: 'DELETE',
      path: '/admin-dashboard/spaces/:id',
      handler: 'admin-dashboard.deleteSpace',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['delete'] },
      },
    },

    // ── Reservations ──────────────────────────────────────────────
    {
      method: 'GET',
      path: '/admin-dashboard/reservations',
      handler: 'admin-dashboard.getReservations',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['find'] },
      },
    },
    {
      method: 'DELETE',
      path: '/admin-dashboard/reservations/:id',
      handler: 'admin-dashboard.deleteReservation',
      config: {
        policies: [],
        middlewares: [],
        auth: { scope: ['delete'] },
      },
    },
  ],
};
