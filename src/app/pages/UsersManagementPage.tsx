/**
 * @file UsersManagementPage.tsx
 * @description Provides the interface for admins to manage user accounts.
 * Allows viewing all registered users (except other admins), updating their names, 
 * emails, passwords, roles (user/manager), and deleting user accounts.
 */

import { useEffect, useState } from 'react';
import { usersAPI, authAPI } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Shield, Briefcase, User, Trash2, Edit, X, UserPlus, AlertCircle, Sparkles, Mail, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'manager' | 'admin';
  createdAt: string;
}

const roleIcons = {
  user: User,
  manager: Briefcase,
  admin: Shield,
};

const roleColors = {
  user: 'bg-blue-50 text-blue-700 border-blue-100 shadow-sm shadow-blue-50/50',
  manager: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 shadow-sm shadow-fuchsia-50/50',
  admin: 'bg-rose-50 text-rose-700 border-rose-100 shadow-sm shadow-rose-50/50',
};

/**
 * UsersManagementPage component.
 * Renders the user list and edit forms for administrators to manage registered roles.
 * 
 * @function UsersManagementPage
 * @returns {JSX.Element}
 */
export function UsersManagementPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [newRole, setNewRole] = useState<'user' | 'manager' | 'admin'>('user');
  const { token } = useAuth();

  // States for adding a new manager
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // States for editing user info
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      if (!token) return;
      const data = await usersAPI.getAll(token);
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !token) return;

    setIsEditing(true);
    setEditError('');

    try {
      if (editPassword.trim() && editPassword.length < 6) {
        setEditError('Password must contain at least 6 characters');
        setIsEditing(false);
        return;
      }

      await usersAPI.updateUser(
        token,
        editingUser.id,
        editName,
        editEmail,
        newRole,
        editPassword.trim() || undefined
      );
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      setEditError(error.message || 'Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setIsAdding(true);
    setAddError('');

    try {
      // Direct signup of a new manager
      await authAPI.signup(addEmail, addPassword, addName, 'manager');
      setShowAddModal(false);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      loadUsers();
    } catch (error: any) {
      setAddError(error.message || 'Failed to create Manager account');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(token, id);
        loadUsers();
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-semibold text-gray-500">Loading community...</span>
        </div>
      </div>
    );
  }

  const usersByRole = {
    admin: users.filter((u) => u.role === 'admin'),
    manager: users.filter((u) => u.role === 'manager'),
    user: users.filter((u) => u.role === 'user'),
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/20">
      {/* Floating background glowing blobs */}
      <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-indigo-400/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-purple-400/10 blur-3xl pointer-events-none" />
      {/* Header section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            Supervision
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Administer the global list of member and manager accounts</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Add Manager
        </motion.button>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all flex items-center justify-between"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Partner Managers</p>
            <p className="text-3xl font-black text-slate-900">{usersByRole.manager.length}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3.5 rounded-xl text-white shadow-lg shadow-purple-900/20">
            <Briefcase className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -4 }}
          className="bg-white rounded-3xl p-6 border-2 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.05)] transition-all flex items-center justify-between"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">Active Members</p>
            <p className="text-3xl font-black text-slate-900">{usersByRole.user.length}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3.5 rounded-xl text-white shadow-lg shadow-blue-900/20">
            <User className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* Users table list container */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="px-6 py-5 text-left text-xs font-black text-slate-800 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-slate-800 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-slate-800 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-slate-800 uppercase tracking-wider">
                  Date Registered
                </th>
                <th className="px-6 py-5 text-left text-xs font-black text-slate-800 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.filter(u => u.role !== 'admin').length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-bold">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    No users found
                  </td>
                </tr>
              ) : (
                users.filter(u => u.role !== 'admin').map((user) => {
                  const displayName = user.name || (user as any).username || user.email || 'Coworker';
                  const RoleIcon = roleIcons[user.role];
                  const initials = displayName.slice(0, 2).toUpperCase();
                  
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 font-extrabold text-sm flex items-center justify-center uppercase shadow-sm border border-slate-200">
                            {initials}
                          </div>
                          <span className="font-bold text-slate-900">{displayName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-slate-700 text-sm font-semibold">{user.email}</td>
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase border ${
                            roleColors[user.role]
                          }`}
                        >
                          <RoleIcon className="w-3.5 h-3.5" />
                          {user.role === 'admin' && 'Administrator'}
                          {user.role === 'manager' && 'Manager'}
                          {user.role === 'user' && 'User'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-slate-600 text-sm font-semibold">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setNewRole(user.role);
                              setEditName(user.name || (user as any).username || '');
                              setEditEmail(user.email);
                              setEditPassword('');
                              setEditError('');
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit className="w-4.5 h-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modals with AnimatePresence */}
      <AnimatePresence>
        {/* Edit role modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Edit User</h3>
                  <p className="text-xs text-gray-400 mt-1">Adjust the user profile in the database</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editError && (
                <div className="mb-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4.5">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-bold text-slate-900 placeholder-slate-455"
                    placeholder="email@user.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Password <span className="text-[10px] text-slate-500 font-normal">(Leave empty if unchanged)</span>
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={6}
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    User Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['user', 'manager'] as const).map((role) => {
                      const RoleIcon = roleIcons[role];
                      return (
                        <button
                          type="button"
                          key={role}
                          onClick={() => setNewRole(role)}
                          className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 transition-all ${
                            newRole === role
                              ? roleColors[role] + ' border-current'
                              : 'border-slate-100 hover:border-slate-200 text-slate-600 bg-slate-50/50'
                          }`}
                        >
                          <RoleIcon className="w-4.5 h-4.5" />
                          <span className="font-bold text-sm">
                            {role === 'manager' ? 'Manager' : 'User'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isEditing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6"
                >
                  {isEditing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save changes
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Manager Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Add Manager</h3>
                  <p className="text-xs text-gray-400 mt-1">Create a new administrative partner account</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                  }}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addError && (
                <div className="mb-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleAddManager} className="space-y-4.5">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="Manager name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="email@manager.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3.5 bg-white border-2 border-slate-300 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-base font-bold text-slate-900 placeholder-slate-450"
                    placeholder="••••••••"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm mt-6"
                >
                  {isAdding ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Briefcase className="w-4.5 h-4.5" />
                      Create Manager Account
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
