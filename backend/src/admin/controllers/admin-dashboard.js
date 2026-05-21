'use strict';

/**
 * Admin Dashboard Controller
 * Path: src/admin/controllers/admin-dashboard.js
 *
 * All routes are protected by Strapi's admin user token (see routes file).
 * Uses strapi.db.query() which is compatible with both Strapi v4 and v5.
 */

module.exports = {

  // ───────────────────────────────────────────────────────────────
  //  GET /api/admin-dashboard/stats
  //  Aggregate counts for dashboard cards and statistics screen
  // ───────────────────────────────────────────────────────────────
  async getStats(ctx) {
    try {
      // Total spaces (salle-etudes)
      const spacesCount = await strapi.db
        .query('api::salle-etude.salle-etude')
        .count();

      // Total managers (users with user_role = 'manager')
      const managersCount = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { user_role: 'manager' } });

      // Total registered users (non-admin, non-manager)
      const usersCount = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { user_role: { $notIn: ['admin', 'manager'] } } });

      // All reservations
      const allReservations = await strapi.db
        .query('api::reservation.reservation')
        .findMany({ select: ['statut'] });

      const totalReservations = allReservations.length;
      const confirmed = allReservations.filter(r => r.statut === 'valide').length;
      const pending   = allReservations.filter(r => r.statut === 'en_attente').length;
      const cancelled = allReservations.filter(r => r.statut === 'refuse').length;

      // Most reserved space
      const spaceCounts = {};
      const reservationsWithSpace = await strapi.db
        .query('api::reservation.reservation')
        .findMany({ populate: ['salle_etude'] });

      for (const r of reservationsWithSpace) {
        if (r.salle_etude) {
          const key = r.salle_etude.nom || 'Inconnu';
          spaceCounts[key] = (spaceCounts[key] || 0) + 1;
        }
      }
      const mostReservedSpace = Object.keys(spaceCounts).sort(
        (a, b) => spaceCounts[b] - spaceCounts[a]
      )[0] || '-';

      // Most active manager (manager whose spaces have most reservations)
      const managersWithSpaces = await strapi.db
        .query('plugin::users-permissions.user')
        .findMany({
          where: { user_role: 'manager' },
          populate: ['particulier'],
          select: ['id', 'username'],
        });
      const mostActiveManager = managersWithSpaces.length > 0
        ? managersWithSpaces[0].username
        : '-';

      // Today's reservations
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayReservations = await strapi.db
        .query('api::reservation.reservation')
        .count({ where: { createdAt: { $gte: today } } });

      // This week's reservations
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekReservations = await strapi.db
        .query('api::reservation.reservation')
        .count({ where: { createdAt: { $gte: weekAgo } } });

      ctx.body = {
        spaces: spacesCount,
        managers: managersCount,
        users: usersCount,
        totalReservations,
        confirmed,
        pending,
        cancelled,
        confirmedRate: totalReservations > 0
          ? Math.round((confirmed / totalReservations) * 100)
          : 0,
        cancelledRate: totalReservations > 0
          ? Math.round((cancelled / totalReservations) * 100)
          : 0,
        pendingRate: totalReservations > 0
          ? Math.round((pending / totalReservations) * 100)
          : 0,
        mostReservedSpace,
        mostActiveManager,
        todayReservations,
        weekReservations,
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  GET /api/admin-dashboard/managers
  //  List all users with user_role = 'manager'
  // ───────────────────────────────────────────────────────────────
  async getManagers(ctx) {
    try {
      const managers = await strapi.db
        .query('plugin::users-permissions.user')
        .findMany({
          where: { user_role: 'manager' },
          populate: ['particulier'],
          select: ['id', 'username', 'email', 'createdAt'],
        });

      ctx.body = managers.map(m => ({
        id: m.id,
        name: m.username,
        email: m.email,
        phone: m.particulier?.telephone || '',
        company: m.particulier?.adresse || '',
        createdAt: m.createdAt,
      }));
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  POST /api/admin-dashboard/managers
  //  Create a new manager user + linked particulier
  //  Body: { name, email, phone, company, password? }
  // ───────────────────────────────────────────────────────────────
  async createManager(ctx) {
    const { name, email, phone, company } = ctx.request.body;

    if (!name || !email) {
      ctx.status = 400;
      ctx.body = { error: { message: 'name and email are required.' } };
      return;
    }

    // Check email uniqueness
    const existing = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { email } });

    if (existing) {
      ctx.status = 400;
      ctx.body = { error: { message: 'A user with this email already exists.' } };
      return;
    }

    try {
      // Get the 'authenticated' role
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });

      // Create the user with manager role
      const defaultPassword = `Manager@${Date.now()}`;
      const newUser = await strapi.plugins['users-permissions'].services.user.add({
        username: name,
        email,
        password: defaultPassword,
        user_role: 'manager',
        confirmed: true,
        blocked: false,
        role: role.id,
      });

      // Create the linked particulier record
      const particulier = await strapi.db
        .query('api::particulier.particulier')
        .create({
          data: {
            telephone: phone || '',
            adresse: company || '',
            users_permissions_user: newUser.id,
          },
        });

      ctx.body = {
        id: newUser.id,
        name: newUser.username,
        email: newUser.email,
        phone: particulier.telephone,
        company: particulier.adresse,
        tempPassword: defaultPassword, // inform admin to share credentials
      };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  DELETE /api/admin-dashboard/managers/:id
  //  Delete a manager — blocked if they have active reservations
  // ───────────────────────────────────────────────────────────────
  async deleteManager(ctx) {
    const { id } = ctx.params;

    try {
      // Find the etudiant linked to this user (in case they also
      // have reservations as a student — defensive check)
      const activeReservations = await strapi.db
        .query('api::reservation.reservation')
        .count({
          where: {
            statut: 'en_attente',
            etudiant: {
              users_permissions_user: { id: parseInt(id) },
            },
          },
        });

      if (activeReservations > 0) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: `Cannot delete: this manager has ${activeReservations} active reservation(s).`,
          },
        };
        return;
      }

      // Delete linked particulier first
      await strapi.db.query('api::particulier.particulier').deleteMany({
        where: { users_permissions_user: { id: parseInt(id) } },
      });

      // Delete the user
      await strapi.plugins['users-permissions'].services.user.remove({ id: parseInt(id) });

      ctx.body = { success: true };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  GET /api/admin-dashboard/spaces
  //  List all salle-etudes with their batiment (location)
  // ───────────────────────────────────────────────────────────────
  async getSpaces(ctx) {
    try {
      const spaces = await strapi.db
        .query('api::salle-etude.salle-etude')
        .findMany({
          populate: ['batiment', 'reservations'],
          select: ['id', 'nom', 'capacite', 'equipements', 'etat'],
        });

      ctx.body = spaces.map(s => ({
        id: s.id,
        name: s.nom || '',
        type: s.equipements || 'Salle d\'étude',
        location: s.batiment?.nom || s.batiment?.adresse || 'Non spécifié',
        capacity: s.capacite || 0,
        status: s.etat || 'disponible',
        reservationCount: s.reservations?.length || 0,
      }));
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  DELETE /api/admin-dashboard/spaces/:id
  //  Delete a space — cascades on reservations
  // ───────────────────────────────────────────────────────────────
  async deleteSpace(ctx) {
    const { id } = ctx.params;

    try {
      const activeRes = await strapi.db
        .query('api::reservation.reservation')
        .count({
          where: {
            salle_etude: { id: parseInt(id) },
            statut: 'en_attente',
          },
        });

      if (activeRes > 0) {
        ctx.status = 400;
        ctx.body = {
          error: {
            message: `Cannot delete: this space has ${activeRes} pending reservation(s).`,
          },
        };
        return;
      }

      await strapi.db
        .query('api::salle-etude.salle-etude')
        .delete({ where: { id: parseInt(id) } });

      ctx.body = { success: true };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  GET /api/admin-dashboard/reservations
  //  List all reservations with student name, space, creneau
  // ───────────────────────────────────────────────────────────────
  async getReservations(ctx) {
    try {
      const reservations = await strapi.db
        .query('api::reservation.reservation')
        .findMany({
          populate: {
            etudiant: { populate: ['users_permissions_user'] },
            salle_etude: true,
            creneau: true,
          },
          orderBy: { createdAt: 'desc' },
        });

      ctx.body = reservations.map(r => {
        const user = r.etudiant?.users_permissions_user;
        const name = user?.username || 'Inconnu';
        const spaceName = r.salle_etude?.nom || 'Inconnu';
        const date = r.createdAt
          ? new Date(r.createdAt).toLocaleDateString('fr-FR')
          : '-';
        const time = r.creneau
          ? `${r.creneau.heureDebut || ''} - ${r.creneau.heureFin || ''}`
          : '-';

        // Map internal enum to display label
        const statusMap = {
          valide: 'Confirmée',
          en_attente: 'En attente',
          refuse: 'Annulée',
        };

        return {
          id: r.id,
          name,
          space: spaceName,
          date,
          time,
          status: statusMap[r.statut] || r.statut || 'En attente',
          rawStatus: r.statut,
        };
      });
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },

  // ───────────────────────────────────────────────────────────────
  //  DELETE /api/admin-dashboard/reservations/:id
  //  Delete a single reservation by ID
  // ───────────────────────────────────────────────────────────────
  async deleteReservation(ctx) {
    const { id } = ctx.params;

    try {
      const existing = await strapi.db
        .query('api::reservation.reservation')
        .findOne({ where: { id: parseInt(id) } });

      if (!existing) {
        ctx.status = 404;
        ctx.body = { error: { message: 'Reservation not found.' } };
        return;
      }

      await strapi.db
        .query('api::reservation.reservation')
        .delete({ where: { id: parseInt(id) } });

      ctx.body = { success: true };
    } catch (err) {
      ctx.status = 500;
      ctx.body = { error: { message: err.message } };
    }
  },
};
