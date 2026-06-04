/**
 * @file index.js
 * @description Root entry file for backend Strapi applications.
 * Handles server registration, database seeding, standard role permissions grants, 
 * and pre-populating mock spaces/users on application bootstrap.
 */

'use strict';

module.exports = {
  register() {},

  /**
   * Strapi bootstrap lifecycle hook.
   * Executed when the server starts. Handles programmatic permission assignment and seeds dummy coworking spaces/users.
   * 
   * @function bootstrap
   * @param {object} params
   * @param {object} params.strapi - The Strapi instance
   */
  async bootstrap({ strapi }) {
    console.log('🔄 Starting database seeding...');

    try {
      // Find the standard roles
      const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      });
      const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'public' },
      });

      if (!authenticatedRole || !publicRole) {
        console.error('❌ Standard roles not found!');
        return;
      }

      // Helper function to grant permissions programmatically
      const grantPermission = async (roleId, action) => {
        const exist = await strapi.db.query('plugin::users-permissions.permission').findOne({
          where: {
            action,
            role: roleId,
          },
        });

        if (!exist) {
          console.log(`🔑 Granting permission (create): ${action} to role ID ${roleId}...`);
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: {
              action,
              role: roleId,
              enabled: true,
            },
          });
        } else if (!exist.enabled) {
          console.log(`🔑 Granting permission (update enabled): ${action} to role ID ${roleId}...`);
          await strapi.db.query('plugin::users-permissions.permission').update({
            where: { id: exist.id },
            data: {
              enabled: true,
            },
          });
        }
      };

      // Grant permissions for spaces & reservations
      const authenticatedPermissions = [
        'api::space.space.find',
        'api::space.space.findOne',
        'api::space.space.create',
        'api::space.space.update',
        'api::space.space.delete',
        'api::reservation.reservation.find',
        'api::reservation.reservation.findOne',
        'api::reservation.reservation.create',
        'api::reservation.reservation.update',
        'api::reservation.reservation.delete',
        'api::message.message.find',
        'api::message.message.findOne',
        'api::message.message.create',
        'api::message.message.update',
        'api::message.message.delete',
        'plugin::users-permissions.user.find',
        'plugin::users-permissions.user.findOne',
        'plugin::users-permissions.user.update',
        'plugin::users-permissions.user.destroy',
      ];

      const publicPermissions = [
        'api::space.space.find',
        'api::space.space.findOne',
        'api::space.space.resetPasswordDirect',
        'api::space.space.checkEmailExists',
      ];

      for (const permission of authenticatedPermissions) {
        await grantPermission(authenticatedRole.id, permission);
      }

      for (const permission of publicPermissions) {
        await grantPermission(publicRole.id, permission);
      }

      // Helper function to seed a user
      const seedUser = async (email, username, password, roleType) => {
        const exist = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { email },
        });

        if (!exist) {
          console.log(`👤 Seeding user: ${email}...`);
          return await strapi.plugins['users-permissions'].services.user.add({
            username,
            email,
            password,
            provider: 'local',
            confirmed: true,
            blocked: false,
            roleType,
            role: authenticatedRole.id,
          });
        } else {
          console.log(`👤 User already exists: ${email}`);
          return exist;
        }
      };

      // Seed admin and manager and regular user
      const adminUser = await seedUser('admin@cowork.com', 'admin', 'password123', 'admin');
      const managerUser = await seedUser('manager@cowork.com', 'manager', 'password123', 'manager');
      const regularUser = await seedUser('user@cowork.com', 'user', 'password123', 'user');

      // Check if spaces exist
      const spacesCount = await strapi.db.query('api::space.space').count();
      if (spacesCount === 0) {
        console.log('🗺️ Seeding demo spaces...');
        const demoSpaces = [
          {
            name: 'CoWork Paris Centre',
            address: '10 Rue de Rivoli, 75001 Paris, France',
            lat: 48.8566,
            lng: 2.3522,
            capacity: 50,
            pricePerHour: 15,
            amenities: ['WiFi', 'Café', 'Salle de réunion', 'Parking'],
            rating: 4.8,
            imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
            images: [
              'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80'
            ],
            managerId: managerUser.id,
          },
          {
            name: 'Le Loft Créatif',
            address: '25 Rue du Faubourg Saint-Antoine, 75011 Paris, France',
            lat: 48.8534,
            lng: 2.3718,
            capacity: 30,
            pricePerHour: 20,
            amenities: ['WiFi', 'Café', 'Terrasse', 'Imprimante'],
            rating: 4.6,
            imageUrl: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80',
            images: [
              'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80'
            ],
            managerId: managerUser.id,
          },
          {
            name: 'Tech Hub Montparnasse',
            address: '14 Boulevard du Montparnasse, 75015 Paris, France',
            lat: 48.8421,
            lng: 2.3215,
            capacity: 75,
            pricePerHour: 18,
            amenities: ['WiFi', 'Café', 'Salle de réunion', 'Studio photo', 'Parking'],
            rating: 4.9,
            imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80',
            images: [
              'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80'
            ],
            managerId: managerUser.id,
          },
          {
            name: 'Green Office Marais',
            address: '32 Rue des Francs Bourgeois, 75003 Paris, France',
            lat: 48.8577,
            lng: 2.3629,
            capacity: 40,
            pricePerHour: 22,
            amenities: ['WiFi', 'Café bio', 'Plantes', 'Terrasse', 'Yoga'],
            rating: 4.7,
            imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80',
            images: [
              'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80'
            ],
            managerId: managerUser.id,
          },
        ];

        for (const space of demoSpaces) {
          await strapi.db.query('api::space.space').create({ data: space });
          console.log(`✓ Created demo space: ${space.name}`);
        }
      } else {
        console.log('🗺️ Spaces already seeded.');
      }

      // Populate images for existing seeded spaces if they don't have them
      const existingSpaces = await strapi.db.query('api::space.space').findMany();
      for (const space of existingSpaces) {
        if (!space.images || !Array.isArray(space.images) || space.images.length === 0) {
          let spaceImages = [];
          if (space.name && space.name.includes('Centre')) {
            spaceImages = [
              'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=600&q=80'
            ];
          } else if (space.name && space.name.includes('Loft')) {
            spaceImages = [
              'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80'
            ];
          } else if (space.name && space.name.includes('Montparnasse')) {
            spaceImages = [
              'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80'
            ];
          } else {
            spaceImages = [
              'https://images.unsplash.com/photo-1517502884422-41eaaced0168?auto=format&fit=crop&w=600&q=80',
              'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=600&q=80'
            ];
          }
          
          await strapi.db.query('api::space.space').update({
            where: { id: space.id },
            data: { images: spaceImages }
          });
          console.log(`🔑 Automatically updated images array for space: ${space.name}`);
        }
      }

      console.log('✅ Database seeding complete!');
    } catch (error) {
      console.error('❌ Error during database seeding:', error);
    }
  },
};
