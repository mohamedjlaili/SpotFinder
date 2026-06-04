/**
 * @file init-demo-data.ts
 * @description Seed script to set up mock/demo data for the coworking application.
 * It seeds an admin user, a manager user, and a list of default coworking spaces in Paris.
 */

/**
 * Creates a default Admin user by invoking the backend's auth signup API.
 * 
 * @async
 * @function createAdminUser
 * @returns {Promise<void>}
 */
async function createAdminUser() {
  // Use the Supabase endpoint from environment or fallback to localhost
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

  console.log('Creating admin user...');

  // Call the signup edge function with static credentials for testing
  const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@cowork.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
    }),
  });

  // Handle errors gracefully since the seed script might be run multiple times
  if (!response.ok) {
    const error = await response.json();
    console.log('Admin user might already exist or error:', error);
  } else {
    const data = await response.json();
    console.log('✓ Admin user created:', data.user);
  }
}

/**
 * Creates a default Manager user by invoking the signup API.
 * On success, performs a sign-in to retrieve a JWT access token needed
 * to authenticate space creation requests.
 * 
 * @async
 * @function createManagerUser
 * @returns {Promise<string|null>} The access token for the created manager, or null if creation failed.
 */
async function createManagerUser() {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

  console.log('Creating manager user...');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'manager@cowork.com',
      password: 'password123',
      name: 'Manager User',
      role: 'manager',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.log('Manager user might already exist or error:', error);
    return null;
  } else {
    const data = await response.json();
    console.log('✓ Manager user created:', data.user);

    // Login immediately with the new user's credentials to acquire a session token
    const loginResponse = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'manager@cowork.com',
        password: 'password123',
      }),
    });

    const loginData = await loginResponse.json();
    return loginData.session.access_token;
  }
}

/**
 * Iterates through a hardcoded list of coworking spaces and posts them
 * to the backend database using the manager's JWT token for authorization.
 * 
 * @async
 * @function createDemoSpaces
 * @param {string} token - The manager's JWT access token.
 * @returns {Promise<void>}
 */
async function createDemoSpaces(token: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

  // Hardcoded Parisian coworking locations with geographic coordinates and metadata
  const spaces = [
    {
      name: 'CoWork Paris Centre',
      address: '10 Rue de Rivoli, 75001 Paris, France',
      lat: 48.8566,
      lng: 2.3522,
      capacity: 50,
      pricePerHour: 15,
      amenities: ['WiFi', 'Café', 'Salle de réunion', 'Parking'],
      rating: 4.8,
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
    },
    {
      name: 'Startup Station',
      address: '5 Avenue de la République, 75011 Paris, France',
      lat: 48.8636,
      lng: 2.3711,
      capacity: 100,
      pricePerHour: 25,
      amenities: ['WiFi', 'Café', 'Salles de réunion', 'Événements', 'Parking', 'Bar'],
      rating: 4.5,
    },
    {
      name: 'Quiet Zone Bastille',
      address: '12 Rue de la Roquette, 75011 Paris, France',
      lat: 48.8549,
      lng: 2.3744,
      capacity: 20,
      pricePerHour: 12,
      amenities: ['WiFi', 'Café', 'Zone silencieuse', 'Bibliothèque'],
      rating: 4.4,
    },
  ];

  console.log('\nCreating demo coworking spaces...');

  // Create each space sequentially via the spaces endpoint
  for (const space of spaces) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(space),
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✓ Created: ${space.name}`);
    } else {
      const error = await response.json();
      console.log(`✗ Failed to create ${space.name}:`, error);
    }
  }
}

/**
 * Main execution routine of the seeding script.
 * Runs sequentially to build users and spaces.
 * 
 * @async
 * @function main
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🚀 Initializing demo data for CoWork app...\n');

  // Step 1: Create Admin
  await createAdminUser();
  
  // Step 2: Create Manager and fetch their token
  const managerToken = await createManagerUser();

  // Step 3: Seed spaces if manager token is retrieved
  if (managerToken) {
    await createDemoSpaces(managerToken);
  } else {
    console.log('\n⚠️  Could not create demo spaces - manager token not available');
    console.log('You may need to manually create spaces as a manager user.');
  }

  console.log('\n✅ Demo data initialization complete!');
  console.log('\n📝 You can now login with:');
  console.log('   Email: admin@cowork.com');
  console.log('   Password: password123');
}

// Kick off seeding and print unhandled exceptions
main().catch(console.error);

