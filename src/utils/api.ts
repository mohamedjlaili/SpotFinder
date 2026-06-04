/**
 * @file api.ts
 * @description API service module for communicating with the Strapi backend.
 * Provides unified request sending, automatic base URL determination for mobile/web,
 * response data parsing, and namespaces for Auth, Spaces, Reservations, Users, Analytics, and Messages.
 */

/**
 * Determines the backend API base URL dynamically.
 * Under Capacitor (mobile app on Android Emulator), localhost resolves to the emulator loopback,
 * so we use 10.0.2.2 to bridge requests to the host machine running Strapi.
 * 
 * @function getApiBase
 * @returns {string} The base API endpoint URL.
 */
const getApiBase = () => {
  const isCapacitor = !!(window as any).Capacitor || 
                      ((window as any).Capacitor && (window as any).Capacitor.platform !== 'web') ||
                      (window.location.hostname === 'localhost' && !window.location.port) ||
                      (window.location.protocol === 'file:');
  return isCapacitor ? 'http://10.0.2.2:1337/api' : 'http://localhost:1337/api';
};

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
}

/**
 * Low-level utility to perform HTTP requests to the backend server.
 * Handles headers, request body formatting, Bearer authentication token inclusion,
 * and unified error parsing.
 * 
 * @async
 * @function apiRequest
 * @param {string} endpoint - The API endpoint route (e.g. '/auth/local').
 * @param {RequestOptions} [options={}] - HTTP configuration options.
 * @returns {Promise<any>} The parsed JSON data returned by the server.
 * @throws {Error} Throws an error on non-ok HTTP responses with the server error message.
 */
async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add the JWT token to the Authorization header if the route requires authentication
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const apiBase = getApiBase();
  console.log(`[API Request] Method: ${method}, URL: ${apiBase}${endpoint}`);

  const response = await fetch(`${apiBase}${endpoint}`, config);
  
  let data: any = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'API request failed');
  }

  return data;
}

/**
 * Normalizes Strapi v4/v5 response formats to simplified flat JavaScript objects.
 * Flattens the nested data payloads and maps relational fields like `userId`, `managerId`,
 * and message `sender`/`receiver` properties for easy frontend access.
 * 
 * @function formatStrapiData
 * @param {any} response - The raw API response payload from Strapi.
 * @returns {any} A flattened object or list of objects.
 */
const formatStrapiData = (response: any) => {
  const formatItem = (item: any) => {
    if (!item) return item;
    const formatted = {
      ...item,
      // Strapi uses documentId for document-centric routing; map it to standard id
      id: item.documentId || item.id,
    };
    
    // Map user relational structure to simple properties
    if (item.userId && typeof item.userId === 'object') {
      formatted.userId = item.userId.id || item.userId.documentId || item.userId;
      formatted.userName = item.userId.username || item.userId.name || 'Utilisateur';
      formatted.userEmail = item.userId.email || '';
    } else if (item.userId) {
      formatted.userId = item.userId;
    }
    
    // Map manager relations
    if (item.managerId && typeof item.managerId === 'object') {
      formatted.managerId = item.managerId.id || item.managerId.documentId || item.managerId;
      formatted.managerName = item.managerId.username || item.managerId.name || 'Manager';
      formatted.managerEmail = item.managerId.email || '';
    } else if (item.managerId) {
      formatted.managerId = item.managerId;
    }
    
    // Map message sender details
    if (item.sender) {
      formatted.senderId = item.sender.id || item.sender;
      formatted.senderName = item.sender.username || item.sender.name;
      formatted.senderEmail = item.sender.email;
    }
    
    // Map message receiver details
    if (item.receiver) {
      formatted.receiverId = item.receiver.id || item.receiver;
      formatted.receiverName = item.receiver.username || item.receiver.name;
      formatted.receiverEmail = item.receiver.email;
    }
    
    return formatted;
  };

  // If response contains an array of items, format each item
  if (response.data && Array.isArray(response.data)) {
    return response.data.map(formatItem);
  }
  // Format single data object
  if (response.data) {
    return formatItem(response.data);
  }
  return response;
};

/**
 * Authentication Endpoints API
 */
export const authAPI = {
  /**
   * Registers a new user with the specified role.
   */
  signup: async (email: string, password: string, name: string, role: string = 'user') => {
    const res = await apiRequest('/auth/local/register', { 
      method: 'POST', 
      body: { username: name || email, email, password, roleType: role } 
    });
    return { user: { id: res.user.id, email: res.user.email, name: res.user.username || name, role: res.user.roleType || 'user', profileImage: res.user.profileImage }, session: { access_token: res.jwt } };
  },

  /**
   * Logs in an existing user with email and password.
   */
  signin: async (email: string, password: string) => {
    const res = await apiRequest('/auth/local', { 
      method: 'POST', 
      body: { identifier: email, password } 
    });
    return { session: { access_token: res.jwt, user: { id: res.user.id, email: res.user.email, name: res.user.username || res.user.email.split('@')[0], role: res.user.roleType || 'user', profileImage: res.user.profileImage } } };
  },

  /**
   * Fetches the current authenticated user's profile details.
   */
  getMe: async (token: string) => {
    const res = await apiRequest('/users/me', { token });
    return { user: { id: res.id, email: res.email, name: res.username || res.email.split('@')[0], role: res.roleType || 'user', profileImage: res.profileImage } };
  },

  /**
   * Helper to perform a direct password reset (typically used for testing).
   */
  resetPasswordDirect: async (email: string, newPassword: string) => {
    return await apiRequest('/auth/reset-password-direct', {
      method: 'POST',
      body: { email, newPassword }
    });
  },

  /**
   * Checks if an email is already registered in the application.
   */
  checkEmailExists: async (email: string) => {
    const res = await apiRequest('/auth/check-email', {
      method: 'POST',
      body: { email }
    });
    return res.exists;
  },
};

/**
 * Coworking Spaces Endpoints API
 */
export const spacesAPI = {
  /**
   * Retrieves all spaces, populating the manager relationship.
   */
  getAll: async (token?: string) => {
    const res = await apiRequest('/spaces?populate[managerId][fields][0]=id&populate[managerId][fields][1]=documentId&populate[managerId][fields][2]=username&populate[managerId][fields][3]=email', { token });
    return { spaces: formatStrapiData(res) };
  },

  /**
   * Retrieves details of a specific coworking space.
   */
  getOne: async (id: string, token?: string) => {
    const res = await apiRequest(`/spaces/${id}?populate[managerId][fields][0]=id&populate[managerId][fields][1]=documentId&populate[managerId][fields][2]=username&populate[managerId][fields][3]=email`, { token });
    return { space: formatStrapiData(res) };
  },

  /**
   * Creates a new coworking space (Manager/Admin).
   */
  create: async (token: string, spaceData: any) => {
    const res = await apiRequest('/spaces', { method: 'POST', body: { data: spaceData }, token });
    return { space: formatStrapiData(res) };
  },

  /**
   * Updates an existing space's metadata.
   */
  update: async (token: string, id: string, updates: any) => {
    const res = await apiRequest(`/spaces/${id}`, { method: 'PUT', body: { data: updates }, token });
    return { space: formatStrapiData(res) };
  },

  /**
   * Deletes a coworking space.
   */
  delete: async (token: string, id: string) => {
    await apiRequest(`/spaces/${id}`, { method: 'DELETE', token });
    return { success: true };
  },
};

/**
 * Space Bookings / Reservations Endpoints API
 */
export const reservationsAPI = {
  /**
   * Retrieves all user/space reservations, populating client details.
   */
  getAll: async (token: string) => {
    const res = await apiRequest('/reservations?populate[userId][fields][0]=id&populate[userId][fields][1]=documentId&populate[userId][fields][2]=username&populate[userId][fields][3]=email', { token });
    return { reservations: formatStrapiData(res) };
  },

  /**
   * Retrieves all reservations scheduled for a specific space.
   */
  getForSpace: async (spaceId: string, token?: string) => {
    const res = await apiRequest(`/reservations?filters[spaceId][$eq]=${spaceId}&populate[userId][fields][0]=id&populate[userId][fields][1]=documentId&populate[userId][fields][2]=username&populate[userId][fields][3]=email`, { token });
    return { reservations: formatStrapiData(res) };
  },

  /**
   * Registers a new space booking.
   */
  create: async (token: string, reservationData: any) => {
    const res = await apiRequest('/reservations', { method: 'POST', body: { data: reservationData }, token });
    return { reservation: formatStrapiData(res) };
  },

  /**
   * Modifies status (e.g. confirm, cancel) or dates of a reservation.
   */
  update: async (token: string, id: string, updates: any) => {
    const res = await apiRequest(`/reservations/${id}`, { method: 'PUT', body: { data: updates }, token });
    return { reservation: formatStrapiData(res) };
  },

  /**
   * Cancels/deletes a reservation record.
   */
  delete: async (token: string, id: string) => {
    await apiRequest(`/reservations/${id}`, { method: 'DELETE', token });
    return { success: true };
  },
};

/**
 * Users Management Endpoints API (Admin Only)
 */
export const usersAPI = {
  /**
   * Retrieves all registered accounts.
   */
  getAll: async (token: string) => {
    const res = await apiRequest('/users', { token });
    return { users: res.map((u: any) => ({ ...u, role: u.roleType || 'user' })) };
  },

  /**
   * Updates an account role directly (user, manager, admin).
   */
  updateRole: async (token: string, userId: string, role: string) => {
    const res = await apiRequest(`/users/${userId}`, { method: 'PUT', body: { roleType: role }, token });
    return { user: { ...res, role: res.roleType || 'user' } };
  },

  /**
   * Updates general profile and credential attributes of a user account.
   */
  updateUser: async (token: string, userId: string, name: string, email: string, role: string, password?: string, profileImage?: string) => {
    const body: any = { username: name, email, roleType: role };
    if (password && password.trim().length > 0) {
      body.password = password;
    }
    if (profileImage !== undefined) {
      body.profileImage = profileImage;
    }
    const res = await apiRequest(`/users/${userId}`, { method: 'PUT', body, token });
    return { user: { ...res, role: res.roleType || 'user' } };
  },

  /**
   * Deletes a user profile from the database.
   */
  delete: async (token: string, userId: string) => {
    await apiRequest(`/users/${userId}`, { method: 'DELETE', token });
    return { success: true };
  },
};

/**
 * Analytics Stats Aggregator API
 */
export const analyticsAPI = {
  /**
   * Aggregates metrics (users, managers, spaces, revenue) from available resource pools.
   */
  getStats: async (token: string) => {
    const spacesRes = await apiRequest('/spaces', { token });
    const resRes = await apiRequest('/reservations', { token });
    
    let usersRes: any[] = [];
    try {
      usersRes = await apiRequest('/users', { token });
    } catch (e) {
      // Ignore if user lacks permissions to query all users (normal users or managers)
    }
    
    const spaces = formatStrapiData(spacesRes);
    const reservations = formatStrapiData(resRes);
    
    // Aggregate data on the client side to avoid requiring custom Strapi backend controllers
    return {
      stats: {
        totalUsers: usersRes.filter((u: any) => (u.roleType || 'user') === 'user').length,
        totalManagers: usersRes.filter((u: any) => u.roleType === 'manager').length,
        totalSpaces: spaces.length,
        totalReservations: reservations.length,
        activeReservations: reservations.filter((r: any) => r.status === 'confirmed').length,
        revenue: reservations.reduce((sum: number, r: any) => sum + (Number(r.totalPrice) || 0), 0),
        totalSpent: reservations.reduce((sum: number, r: any) => sum + (Number(r.totalPrice) || 0), 0),
      }
    };
  },
};

/**
 * Inter-User Messaging Endpoints API
 */
export const messagesAPI = {
  /**
   * Retrieves messages sorting chronologically, populating sender/receiver references.
   */
  getAll: async (token: string) => {
    const res = await apiRequest('/messages?populate[sender][fields][0]=id&populate[sender][fields][1]=username&populate[sender][fields][2]=email&populate[receiver][fields][0]=id&populate[receiver][fields][1]=username&populate[receiver][fields][2]=email&sort=createdAt:asc', { token });
    return { messages: formatStrapiData(res) };
  },

  /**
   * Dispatches a text message to another user.
   */
  sendMessage: async (token: string, receiverId: string, content: string) => {
    const res = await apiRequest('/messages', {
      method: 'POST',
      body: {
        data: {
          receiver: receiverId,
          content
        }
      },
      token
    });
    return { message: formatStrapiData(res) };
  },

  /**
   * Flags a specific message as read.
   */
  markAsRead: async (token: string, id: string) => {
    const res = await apiRequest(`/messages/${id}`, {
      method: 'PUT',
      body: {
        data: { read: true }
      },
      token
    });
    return { message: formatStrapiData(res) };
  }
};


