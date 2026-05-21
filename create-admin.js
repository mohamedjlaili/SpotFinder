// Script to create an admin user for testing
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function createAdmin() {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      email: 'admin@cowork.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
    }),
  });

  const data = await response.json();
  console.log('Admin user created:', data);
}

createAdmin().catch(console.error);
