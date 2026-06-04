/**
 * @file create-admin.js
 * @description Administrative utility script to provision a default admin user
 * in the database/backend auth service (Supabase) for testing and development.
 */

// Retrieve Supabase configuration from environment variables, defaulting to empty string if not set.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Sends a POST request to the custom backend signup edge function
 * to register a new user with the 'admin' role.
 * 
 * @async
 * @function createAdmin
 * @returns {Promise<void>} Resolves when the admin user has been successfully created.
 */
async function createAdmin() {
  // Call the Supabase edge function for signup with superuser/service-role credentials
  const response = await fetch(`${SUPABASE_URL}/functions/v1/make-server-33a5ae3b/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    // The details of the admin account to be created
    body: JSON.stringify({
      email: 'admin@cowork.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
    }),
  });

  // Parse and log the API response showing the outcome of the creation attempt
  const data = await response.json();
  console.log('Admin user created:', data);
}

// Execute the administrative signup and log errors if it fails
createAdmin().catch(console.error);

