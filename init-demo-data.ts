// Script to initialize demo data for the coworking app

// First, create an admin user
async function createAdminUser() {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

  console.log('Creating admin user...');

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

  if (!response.ok) {
    const error = await response.json();
    console.log('Admin user might already exist or error:', error);
  } else {
    const data = await response.json();
    console.log('✓ Admin user created:', data.user);
  }
}

// Then create a manager user
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

    // Login to get the token
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

// Create demo coworking spaces
async function createDemoSpaces(token: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';

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

// Main execution
async function main() {
  console.log('🚀 Initializing demo data for CoWork app...\n');

  await createAdminUser();
  const managerToken = await createManagerUser();

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

main().catch(console.error);
