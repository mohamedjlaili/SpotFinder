'use strict';

/**
 * message controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::message.message', ({ strapi }) => ({
  // Override find: bypass REST entirely to guarantee sender/receiver are always populated
  async find(ctx) {
    if (!ctx.state.user) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    const userId = ctx.state.user.id;

    // Use direct DB query engine with DB-level filters and selective field select to prevent loading heavy base64 strings!
    const messages = await strapi.db.query('api::message.message').findMany({
      where: {
        $or: [
          { sender: userId },
          { receiver: userId }
        ]
      },
      populate: {
        sender: {
          select: ['id', 'username', 'email']
        },
        receiver: {
          select: ['id', 'username', 'email']
        }
      },
      orderBy: { createdAt: 'asc' },
    });

    return { data: messages };
  },

  async create(ctx) {
    if (!ctx.state.user) {
      return ctx.unauthorized('Vous devez être connecté.');
    }

    const senderId = ctx.state.user.id;
    const receiverIdInput = ctx.request.body.data?.receiver;
    const content = ctx.request.body.data?.content;

    console.log(`[MSG CREATE] sender=${senderId}, receiverInput=${receiverIdInput}, content=${(content || '').substring(0, 60)}...`);

    // 1. Resolve receiver user using DB query engine (handles numeric id, string id, and documentId)
    let receiverUser = null;
    if (receiverIdInput) {
      // Try numeric ID first
      const numericId = parseInt(receiverIdInput, 10);
      if (!isNaN(numericId)) {
        receiverUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { id: numericId },
          select: ['id', 'username', 'email']
        });
      }
      // Fallback: try documentId
      if (!receiverUser) {
        receiverUser = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { documentId: String(receiverIdInput) },
          select: ['id', 'username', 'email']
        });
      }
    }

    console.log(`[MSG CREATE] Resolved receiver: ${receiverUser ? receiverUser.id + ' (' + receiverUser.email + ')' : 'NULL'}`);

    // 2. Remove sender and receiver from body to bypass Strapi REST relation validation
    if (ctx.request.body.data) {
      delete ctx.request.body.data.sender;
      delete ctx.request.body.data.receiver;
    }

    // 3. Create the core entry (content + read fields only)
    const response = await super.create(ctx);

    // 4. Force bind relations directly in MySQL using numeric IDs
    if (response.data && response.data.documentId) {
      await strapi.db.query('api::message.message').update({
        where: { documentId: response.data.documentId },
        data: {
          sender: senderId,
          receiver: receiverUser ? receiverUser.id : null
        }
      });

      console.log(`[MSG CREATE] ✅ Message ${response.data.documentId} bound: sender=${senderId}, receiver=${receiverUser ? receiverUser.id : 'null'}`);

      // Enrich response for the client with clean, lightweight sender/receiver objects
      response.data.sender = ctx.state.user ? {
        id: ctx.state.user.id,
        username: ctx.state.user.username,
        email: ctx.state.user.email
      } : null;

      response.data.receiver = receiverUser ? {
        id: receiverUser.id,
        username: receiverUser.username,
        email: receiverUser.email
      } : null;
    }

    return response;
  }
}));

