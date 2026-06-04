/**
 * @file admin-dashboard.js
 * @description Custom admin dashboard routes definition.
 * Registers endpoints for dashboard statistics, manager accounts CRUD operations, 
 * spaces, and reservation details.
 */

'use strict';

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
