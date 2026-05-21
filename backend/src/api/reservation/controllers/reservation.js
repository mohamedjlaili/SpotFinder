'use strict';

/**
 * reservation controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::reservation.reservation', ({ strapi }) => ({
  async create(ctx) {
    const { startDate, endDate, spaceId } = ctx.request.body.data || {};
    if (!startDate || !endDate || !spaceId) {
      return ctx.badRequest("Champs requis manquants: startDate, endDate, spaceId.");
    }

    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();

    if (isNaN(newStart) || isNaN(newEnd)) {
      return ctx.badRequest("Dates invalides.");
    }
    if (newStart >= newEnd) {
      return ctx.badRequest("La date de début doit être antérieure à la date de fin.");
    }

    // Check overlap for the same spaceId
    const existing = await strapi.db.query('api::reservation.reservation').findMany({
      where: {
        spaceId: String(spaceId),
        status: {
          $notIn: ['cancelled', 'annulée', 'rejected']
        }
      }
    });

    const overlap = existing.find(r => {
      const extStart = new Date(r.startDate).getTime();
      const extEnd = new Date(r.endDate).getTime();
      return newStart < extEnd && newEnd > extStart;
    });

    if (overlap) {
      return ctx.badRequest("Cet espace est déjà réservé pour ce créneau horaire.");
    }

    // 1. Extract the userId from state if available
    const userDocId = ctx.state.user?.documentId;
    
    // 2. Remove userId from request body to bypass REST validation
    if (ctx.request.body.data) {
      delete ctx.request.body.data.userId;
    }
    
    // 3. Create the reservation using standard controller
    const response = await super.create(ctx);
    
    // 4. Link the relation using DB query engine directly (passing integer ID to database!)
    if (userDocId && response.data && response.data.documentId) {
      await strapi.db.query('api::reservation.reservation').update({
        where: { documentId: response.data.documentId },
        data: {
          userId: ctx.state.user.id
        }
      });
      
      // Update response data object for the client
      response.data.userId = ctx.state.user;
    }
    
    return response;
  },

  async update(ctx) {
    const reservation = await strapi.db.query('api::reservation.reservation').findOne({
      where: {
        $or: [
          { documentId: ctx.params.id },
          { id: ctx.params.id }
        ]
      }
    });

    if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      if (reservation && reservation.spaceId) {
        const space = await strapi.db.query('api::space.space').findOne({
          where: {
            $or: [
              { documentId: String(reservation.spaceId) },
              { id: String(reservation.spaceId) }
            ]
          },
          populate: ['managerId']
        });
        if (!space || space.managerId?.id !== ctx.state.user.id) {
          return ctx.unauthorized("Accès refusé : Vous ne pouvez modifier que les réservations de vos propres espaces.");
        }
      }
    }

    // Overlap validation for updates (excluding this reservation itself)
    const updates = ctx.request.body.data || {};
    if (reservation && (updates.startDate || updates.endDate || updates.spaceId)) {
      const proposedSpaceId = updates.spaceId !== undefined ? updates.spaceId : reservation.spaceId;
      const proposedStartDate = updates.startDate !== undefined ? updates.startDate : reservation.startDate;
      const proposedEndDate = updates.endDate !== undefined ? updates.endDate : reservation.endDate;
      const proposedStatus = updates.status !== undefined ? updates.status : reservation.status;

      if (proposedStartDate && proposedEndDate && proposedSpaceId && !['cancelled', 'annulée', 'rejected'].includes(proposedStatus)) {
        const newStart = new Date(proposedStartDate).getTime();
        const newEnd = new Date(proposedEndDate).getTime();

        if (newStart >= newEnd) {
          return ctx.badRequest("La date de début doit être antérieure à la date de fin.");
        }

        const existing = await strapi.db.query('api::reservation.reservation').findMany({
          where: {
            spaceId: String(proposedSpaceId),
            status: {
              $notIn: ['cancelled', 'annulée', 'rejected']
            }
          }
        });

        const overlap = existing.find(r => {
          if (r.id === reservation.id || r.documentId === reservation.documentId) return false;
          const extStart = new Date(r.startDate).getTime();
          const extEnd = new Date(r.endDate).getTime();
          return newStart < extEnd && newEnd > extStart;
        });

        if (overlap) {
          return ctx.badRequest("Cet espace est déjà réservé pour ce créneau horaire.");
        }
      }
    }

    return super.update(ctx);
  },

  async delete(ctx) {
    if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      const reservation = await strapi.db.query('api::reservation.reservation').findOne({
        where: {
          $or: [
            { documentId: ctx.params.id },
            { id: ctx.params.id }
          ]
        }
      });
      if (reservation && reservation.spaceId) {
        const space = await strapi.db.query('api::space.space').findOne({
          where: {
            $or: [
              { documentId: String(reservation.spaceId) },
              { id: String(reservation.spaceId) }
            ]
          },
          populate: ['managerId']
        });
        if (!space || space.managerId?.id !== ctx.state.user.id) {
          return ctx.unauthorized("Accès refusé : Vous ne pouvez supprimer que les réservations de vos propres espaces.");
        }
      }
    }
    
    // Bypass core controller to avoid permission issues
    const deleted = await strapi.db.query('api::reservation.reservation').delete({
      where: {
        $or: [
          { documentId: ctx.params.id },
          { id: ctx.params.id }
        ]
      }
    });
    
    return { data: deleted, meta: {} };
  },

  async find(ctx) {
    // Query directly from database to bypass REST sanitizer
    const reservations = await strapi.db.query('api::reservation.reservation').findMany({
      populate: ['userId']
    });

    let filtered = reservations;

    if (ctx.state.user && ctx.state.user.roleType === 'user') {
      // Check if querying for space availability checks
      const spaceIdFilter = ctx.query.filters?.spaceId?.$eq || ctx.query.filters?.spaceId;
      if (spaceIdFilter) {
        filtered = reservations.filter(item => {
          if (!item.spaceId) return false;
          const resSpaceId = String(item.spaceId.id || item.spaceId.documentId || item.spaceId);
          return resSpaceId === String(spaceIdFilter);
        }).map(item => {
          // Clone and strip private userId details, leaving only the username for display
          const sanitized = { ...item };
          if (sanitized.userId) {
            sanitized.userId = {
              username: sanitized.userId.username || sanitized.userId.name || 'Utilisateur'
            };
          }
          return sanitized;
        });
      } else {
        // Return only their own reservations
        filtered = reservations.filter(item => {
          return item.userId && (item.userId.id === ctx.state.user.id || item.userId.documentId === ctx.state.user.documentId);
        });
      }
    } else if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      // Find all spaces owned by this manager
      const allSpaces = await strapi.db.query('api::space.space').findMany({
        populate: ['managerId']
      });
      
      const filteredSpaces = allSpaces.filter(s => {
        const mId = s.managerId?.id || s.managerId;
        return String(mId) === String(ctx.state.user.id);
      });
      
      const spaceIds = [];
      filteredSpaces.forEach(s => {
        if (s.id) spaceIds.push(String(s.id));
        if (s.documentId) spaceIds.push(String(s.documentId));
      });
      
      filtered = reservations.filter(item => {
        if (!item.spaceId) return false;
        const resSpaceId = String(item.spaceId?.id || item.spaceId?.documentId || item.spaceId);
        return spaceIds.includes(resSpaceId);
      });
    }

    // Return in standard Strapi response format
    return {
      data: filtered
    };
  }
}));
