/**
 * @file AuthContext.tsx
 * @description Provides global authentication context for the application.
 * Manages authenticated user details, JWT session token, loading states, persistence to localStorage,
 * and standard auth functions (signin, signup, signout, and local profile updates).
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../utils/api';

/**
 * User profile structure returned by the auth service.
 */
interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'manager' | 'admin';
  profileImage?: string;
}

/**
 * Context types exposing state variables and operations.
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// Instantiate the React Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Global authentication state provider.
 * Wraps the root layout to make session state accessible throughout the app.
 * 
 * @function AuthProvider
 * @param {Object} props - React component props.
 * @param {ReactNode} props.children - Child components that require auth context.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authentication state from localStorage when the application loads
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  /**
   * Logs in a user, setting state and persisting token/user to localStorage.
   * 
   * @async
   * @function login
   * @param {string} email
   * @param {string} password
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await authAPI.signin(email, password);
      const { access_token, user: userData } = response.session;

      setToken(access_token);
      setUser(userData);

      // Persist credentials locally to survive page reloads
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Registers a new user account and performs automatic login on success.
   * 
   * @async
   * @function signup
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @param {string} [role='user']
   */
  const signup = async (email: string, password: string, name: string, role: string = 'user') => {
    try {
      await authAPI.signup(email, password, name, role);
      // Automatically sign in the user after a successful signup process
      await login(email, password);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  /**
   * Logs out the user by wiping memory state and deleting keys from local storage.
   * 
   * @function logout
   */
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Updates partial properties of the local user profile state.
   * 
   * @function updateUser
   * @param {Partial<User>} updates - Key-value map of properties to update.
   */
  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Save updated details to localStorage
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom React hook to consume AuthContext safely within components.
 * 
 * @function useAuth
 * @returns {AuthContextType} The context state and auth functions.
 * @throws {Error} Throws if hook is consumed outside AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

