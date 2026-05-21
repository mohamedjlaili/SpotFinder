// API utilities for making requests to the backend
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

async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

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

// Helper to format Strapi v5 response back to flat objects and map documentId to id
const formatStrapiData = (response: any) => {
  const formatItem = (item: any) => {
    if (!item) return item;
    const formatted = {
      ...item,
      id: item.documentId || item.id,
    };
    
    // Map relations to flat fields for easier frontend access
    if (item.userId && typeof item.userId === 'object') {
      formatted.userId = item.userId.id || item.userId.documentId || item.userId;
      formatted.userName = item.userId.username || item.userId.name || 'Utilisateur';
      formatted.userEmail = item.userId.email || '';
    } else if (item.userId) {
      formatted.userId = item.userId;
    }
    
    if (item.managerId && typeof item.managerId === 'object') {
      formatted.managerId = item.managerId.id || item.managerId.documentId || item.managerId;
      formatted.managerName = item.managerId.username || item.managerId.name || 'Manager';
      formatted.managerEmail = item.managerId.email || '';
    } else if (item.managerId) {
      formatted.managerId = item.managerId;
    }
    
    if (item.sender) {
      formatted.senderId = item.sender.id || item.sender;
      formatted.senderName = item.sender.username || item.sender.name;
      formatted.senderEmail = item.sender.email;
    }
    
    if (item.receiver) {
      formatted.receiverId = item.receiver.id || item.receiver;
      formatted.receiverName = item.receiver.username || item.receiver.name;
      formatted.receiverEmail = item.receiver.email;
    }
    
    return formatted;
  };

  if (response.data && Array.isArray(response.data)) {
    return response.data.map(formatItem);
  }
  if (response.data) {
    return formatItem(response.data);
  }
  return response;
};

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, name: string, role: string = 'user') => {
    const res = await apiRequest('/auth/local/register', { 
      method: 'POST', 
      body: { username: name || email, email, password, roleType: role } 
    });
    return { user: { id: res.user.id, email: res.user.email, name: res.user.username || name, role: res.user.roleType || 'user', profileImage: res.user.profileImage }, session: { access_token: res.jwt } };
  },

  signin: async (email: string, password: string) => {
    const res = await apiRequest('/auth/local', { 
      method: 'POST', 
      body: { identifier: email, password } 
    });
    return { session: { access_token: res.jwt, user: { id: res.user.id, email: res.user.email, name: res.user.username || res.user.email.split('@')[0], role: res.user.roleType || 'user', profileImage: res.user.profileImage } } };
  },

  getMe: async (token: string) => {
    const res = await apiRequest('/users/me', { token });
    return { user: { id: res.id, email: res.email, name: res.username || res.email.split('@')[0], role: res.roleType || 'user', profileImage: res.profileImage } };
  },

  resetPasswordDirect: async (email: string, newPassword: string) => {
    return await apiRequest('/auth/reset-password-direct', {
      method: 'POST',
      body: { email, newPassword }
    });
  },

  checkEmailExists: async (email: string) => {
    const res = await apiRequest('/auth/check-email', {
      method: 'POST',
      body: { email }
    });
    return res.exists;
  },
};

// Spaces API
export const spacesAPI = {
  getAll: async (token?: string) => {
    const res = await apiRequest('/spaces?populate[managerId][fields][0]=id&populate[managerId][fields][1]=documentId&populate[managerId][fields][2]=username&populate[managerId][fields][3]=email', { token });
    return { spaces: formatStrapiData(res) };
  },

  getOne: async (id: string, token?: string) => {
    const res = await apiRequest(`/spaces/${id}?populate[managerId][fields][0]=id&populate[managerId][fields][1]=documentId&populate[managerId][fields][2]=username&populate[managerId][fields][3]=email`, { token });
    return { space: formatStrapiData(res) };
  },

  create: async (token: string, spaceData: any) => {
    const res = await apiRequest('/spaces', { method: 'POST', body: { data: spaceData }, token });
    return { space: formatStrapiData(res) };
  },

  update: async (token: string, id: string, updates: any) => {
    const res = await apiRequest(`/spaces/${id}`, { method: 'PUT', body: { data: updates }, token });
    return { space: formatStrapiData(res) };
  },

  delete: async (token: string, id: string) => {
    await apiRequest(`/spaces/${id}`, { method: 'DELETE', token });
    return { success: true };
  },
};

// Reservations API
export const reservationsAPI = {
  getAll: async (token: string) => {
    const res = await apiRequest('/reservations?populate[userId][fields][0]=id&populate[userId][fields][1]=documentId&populate[userId][fields][2]=username&populate[userId][fields][3]=email', { token });
    return { reservations: formatStrapiData(res) };
  },

  getForSpace: async (spaceId: string, token?: string) => {
    const res = await apiRequest(`/reservations?filters[spaceId][$eq]=${spaceId}&populate[userId][fields][0]=id&populate[userId][fields][1]=documentId&populate[userId][fields][2]=username&populate[userId][fields][3]=email`, { token });
    return { reservations: formatStrapiData(res) };
  },

  create: async (token: string, reservationData: any) => {
    const res = await apiRequest('/reservations', { method: 'POST', body: { data: reservationData }, token });
    return { reservation: formatStrapiData(res) };
  },

  update: async (token: string, id: string, updates: any) => {
    const res = await apiRequest(`/reservations/${id}`, { method: 'PUT', body: { data: updates }, token });
    return { reservation: formatStrapiData(res) };
  },

  delete: async (token: string, id: string) => {
    await apiRequest(`/reservations/${id}`, { method: 'DELETE', token });
    return { success: true };
  },
};

// Users API (admin only)
export const usersAPI = {
  getAll: async (token: string) => {
    const res = await apiRequest('/users', { token });
    return { users: res.map((u: any) => ({ ...u, role: u.roleType || 'user' })) };
  },

  updateRole: async (token: string, userId: string, role: string) => {
    const res = await apiRequest(`/users/${userId}`, { method: 'PUT', body: { roleType: role }, token });
    return { user: { ...res, role: res.roleType || 'user' } };
  },

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

  delete: async (token: string, userId: string) => {
    await apiRequest(`/users/${userId}`, { method: 'DELETE', token });
    return { success: true };
  },
};

// Analytics API
export const analyticsAPI = {
  getStats: async (token: string) => {
    // Note: To match perfectly, we should call /api/analytics/stats in Strapi
    // But since we just want it to run without making a custom Strapi controller if possible,
    // let's fetch spaces and reservations and compute here.
    const spacesRes = await apiRequest('/spaces', { token });
    const resRes = await apiRequest('/reservations', { token });
    
    let usersRes: any[] = [];
    try {
      usersRes = await apiRequest('/users', { token });
    } catch (e) {
      // Ignorer si l'utilisateur normal n'a pas la permission de lire tous les utilisateurs
    }
    
    const spaces = formatStrapiData(spacesRes);
    const reservations = formatStrapiData(resRes);
    
    // Quick admin-like stats computation
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

// Messages API
export const messagesAPI = {
  getAll: async (token: string) => {
    const res = await apiRequest('/messages?populate[sender][fields][0]=id&populate[sender][fields][1]=username&populate[sender][fields][2]=email&populate[receiver][fields][0]=id&populate[receiver][fields][1]=username&populate[receiver][fields][2]=email&sort=createdAt:asc', { token });
    return { messages: formatStrapiData(res) };
  },

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

