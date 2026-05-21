'use strict';

/**
 * space controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::space.space', ({ strapi }) => ({
  async find(ctx) {
    const response = await super.find(ctx);
    
    // Si l'utilisateur est un manager, il ne peut lister que SES propres espaces
    if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      response.data = response.data.filter(item => {
        // Gérer le cas où managerId est peuplé ou juste un ID
        const managerId = item.managerId?.id || item.managerId;
        return String(managerId) === String(ctx.state.user.id);
      });
      if (response.meta && response.meta.pagination) {
        response.meta.pagination.total = response.data.length;
      }
    }
    
    return response;
  },

  async update(ctx) {
    if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      const space = await strapi.db.query('api::space.space').findOne({
        where: { documentId: ctx.params.id },
        populate: ['managerId']
      });
      
      if (!space || String(space.managerId?.id) !== String(ctx.state.user.id)) {
        return ctx.unauthorized("Accès refusé : Vous ne pouvez modifier que vos propres espaces.");
      }
    }
    return super.update(ctx);
  },

  async delete(ctx) {
    if (ctx.state.user && ctx.state.user.roleType === 'manager') {
      const space = await strapi.db.query('api::space.space').findOne({
        where: { documentId: ctx.params.id },
        populate: ['managerId']
      });
      
      if (!space || String(space.managerId?.id) !== String(ctx.state.user.id)) {
        return ctx.unauthorized("Accès refusé : Vous ne pouvez supprimer que vos propres espaces.");
      }

      const deleted = await strapi.db.query('api::space.space').delete({
        where: { documentId: ctx.params.id }
      });
      return { data: deleted, meta: {} };
    }
    
    // For admin or others
    const deleted = await strapi.db.query('api::space.space').delete({
      where: { documentId: ctx.params.id }
    });
    return { data: deleted, meta: {} };
  },

  async create(ctx) {
    const managerDocId = ctx.state.user?.documentId;
    
    if (ctx.request.body.data) {
      delete ctx.request.body.data.managerId;
    }
    
    const response = await super.create(ctx);
    
    if (managerDocId && response.data && response.data.documentId) {
      await strapi.db.query('api::space.space').update({
        where: { documentId: response.data.documentId },
        data: {
          managerId: ctx.state.user.id
        }
      });
      
      response.data.managerId = ctx.state.user;
    }
    
    return response;
  },

  async resetPasswordDirect(ctx) {
    const { email, newPassword } = ctx.request.body;
    if (!email || !newPassword) {
      return ctx.badRequest('Email et mot de passe requis');
    }
    
    // Find the user by email
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: email.toLowerCase().trim() },
    });
    
    if (!user) {
      return ctx.notFound('Aucun compte associé à cet email');
    }
    
    // Update the password using users-permissions service to make sure it's hashed correctly
    await strapi.plugins['users-permissions'].services.user.edit(user.id, {
      password: newPassword,
    });
    
    return { success: true, message: 'Mot de passe mis à jour avec succès' };
  },

  async checkEmailExists(ctx) {
    const { email } = ctx.request.body;
    if (!email) {
      return ctx.badRequest('Email requis');
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return { exists: false };
    }

    return { exists: true };
  }
}));
