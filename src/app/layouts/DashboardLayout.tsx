/**
 * @file DashboardLayout.tsx
 * @description Master dashboard layout for authenticated users.
 * Handles sidebar navigation based on user roles (Admin, Manager, User), profile editing operations,
 * screen transitions, responsiveness, session logs, and mounts global services like AIChatBot and NotificationBell.
 */

import { Outlet, Navigate, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import {
  LayoutDashboard,
  Map,
  Calendar,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Camera,
  User as UserIcon,
  Mail,
  Save,
  Pencil,
  Lock,
  Eye,
  EyeOff
} from "lucide-react";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { NotificationBell } from "../components/NotificationBell";
import { AIChatBot } from "../components/AIChatBot";
import { usersAPI } from "../../utils/api";
import appLogo from "../../assets/logo.png";

/**
 * Main dashboard layout structure containing side navigation, top status bar,
 * central page outlet, and user profile configuration panel.
 * 
 * @function DashboardLayout
 * @returns {JSX.Element}
 */
export function DashboardLayout() {
  const { user, isLoading, logout, token, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sidebar toggle state for mobile viewports
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Profile modal settings and states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // File input reference to trigger avatar upload selection programmatically
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show a loading screen while resolving user authentication state on mount
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-semibold text-slate-500">Verifying session...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if user session is not found
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  /**
   * Triggers the sign-out routine and routes back to login.
   * 
   * @function handleLogout
   */
  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  /**
   * Initializes profile states with current user details and launches the modal.
   * 
   * @function openProfileModal
   */
  const openProfileModal = () => {
    if (user.role === 'admin') return; // Admins cannot edit profiles directly via this modal
    setProfileName(user.name);
    setProfileEmail(user.email);
    setProfileImage(user.profileImage || null);
    setProfilePassword('');
    setProfilePasswordConfirm('');
    setShowPassword(false);
    setProfileError(null);
    setProfileSuccess(false);
    setShowProfileModal(true);
  };

  /**
   * Reads the uploaded image file as a DataURL base64 string to update avatar state locally.
   * Checks file size limit of 2MB beforehand.
   * 
   * @function handleImageUpload
   * @param {React.ChangeEvent<HTMLInputElement>} e - File input change event.
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileError("The image must not exceed 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProfileImage(ev.target?.result as string);
      setProfileError(null);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Validates values and syncs profile changes (Name, Email, password, and avatar base64)
   * to both the backend DB and the active AuthContext.
   * 
   * @async
   * @function handleSaveProfile
   */
  const handleSaveProfile = async () => {
    if (!token || !user) return;
    if (!profileName.trim()) {
      setProfileError("The name cannot be empty.");
      return;
    }
    if (!profileEmail.trim() || !profileEmail.includes('@')) {
      setProfileError("Please enter a valid email address.");
      return;
    }
    if (profilePassword && profilePassword.length < 6) {
      setProfileError("The password must contain at least 6 characters.");
      return;
    }
    if (profilePassword && profilePassword !== profilePasswordConfirm) {
      setProfileError("Passwords do not match.");
      return;
    }
    
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      // 1. Sync modifications to backend server database
      await usersAPI.updateUser(
        token,
        user.id,
        profileName.trim(),
        profileEmail.trim(),
        user.role,
        profilePassword || undefined,
        profileImage || undefined
      );
      
      // 2. Update memory state in global React AuthContext
      updateUser({
        name: profileName.trim(),
        email: profileEmail.trim(),
        profileImage: profileImage || undefined,
      });
      
      setProfileSuccess(true);
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess(false);
      }, 1200);
    } catch (error: any) {
      setProfileError(error.message || "Error updating profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  /**
   * Sub-component to render user avatar image. Fallback to name initials if image is missing.
   * 
   * @function Avatar
   */
  const Avatar = ({ size = 'md', clickable = false }: { size?: 'sm' | 'md' | 'lg'; clickable?: boolean }) => {
    const sizeClasses = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-20 h-20 text-2xl',
    };
    const imgSrc = user.profileImage;
    const baseClass = `${sizeClasses[size]} rounded-xl overflow-hidden flex items-center justify-center uppercase font-extrabold shadow-sm relative`;
    const clickClass = clickable ? 'cursor-pointer group ring-2 ring-transparent hover:ring-indigo-400 transition-all duration-200' : '';

    return (
      <div
        className={`${baseClass} ${clickClass}`}
        onClick={clickable ? openProfileModal : undefined}
        title={clickable ? 'Edit Profile' : undefined}
      >
        {imgSrc ? (
          <img src={imgSrc} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center">
            {user.name.slice(0, 2)}
          </div>
        )}
        {clickable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        )}
      </div>
    );
  };

  // List of all navigation routes and authorization permissions
  const navItems = [
    { path: '/dashboard/overview', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'manager', 'admin'] },
    { path: '/dashboard/map', label: 'Interactive Map', icon: Map, roles: ['user'] },
    { path: '/dashboard/reservations', label: 'Bookings', icon: Calendar, roles: ['user', 'manager', 'admin'] },
    { path: '/dashboard/spaces', label: 'Manage Spaces', icon: Building2, roles: ['manager', 'admin'] },
    { path: '/dashboard/users', label: 'Manage Users', icon: Users, roles: ['admin'] },
    { path: '/dashboard/chat', label: 'Messaging', icon: MessageSquare, roles: ['user', 'manager'] },
  ];

  // Filter routes based on user role authorization
  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));
  const canEditProfile = user.role === 'user' || user.role === 'manager';

  // Sidebar Layout rendering
  const NavContent = () => (
    <>
      {/* Brand logo & Profile summary */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5 mb-6">
          <img src={appLogo} alt="SpotFinder logo" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-md shadow-indigo-500/10" />
          <div>
            <span className="text-xl font-black text-slate-900 tracking-tight block">SpotFinder</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block -mt-1">Study & Coworking</span>
          </div>
        </div>

        {/* User profile block */}
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 bottom-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl opacity-40 group-hover:opacity-75 transition-opacity duration-300" />
          <div className="relative z-10">
            <Avatar size="md" clickable={canEditProfile} />
          </div>
          <div className="min-w-0 relative z-10 flex-1">
            <p className="text-sm font-bold text-slate-800 truncate leading-none">{user.name}</p>
            <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-md ${
              user.role === 'admin'
                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                : user.role === 'manager'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
            }`}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all relative ${
                isActive
                  ? 'text-white font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-semibold'
              }`}
            >
              {/* Highlight layout selection with Framer Motion transitions */}
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 rounded-xl -z-10 shadow-lg shadow-indigo-500/20"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="text-sm relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout triggers */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all font-bold text-sm"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Mobile sidebar overlay backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar aside panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-66 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-5 right-5 p-2 bg-slate-100 rounded-xl shadow-sm border border-slate-200 lg:hidden z-50 text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <NavContent />
      </aside>

      {/* Main viewport area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Mobile top navigation header bar */}
        <div className="lg:hidden bg-white border-b border-slate-100 p-4 flex items-center justify-between shadow-sm relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <img src={appLogo} alt="SpotFinder logo" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm" />
              <h1 className="text-lg font-black text-slate-900 tracking-tight">SpotFinder</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user?.role !== 'admin' && <NotificationBell />}
            <Avatar size="sm" clickable={canEditProfile} />
          </div>
        </div>

        {/* Desktop header Top Bar */}
        <div className="hidden lg:flex bg-white border-b border-slate-100 px-8 py-4 items-center justify-between shadow-sm relative z-30">
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-wider uppercase">
              {filteredNavItems.find(item => item.path === location.pathname)?.label || 'Overview'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {user?.role !== 'admin' && <NotificationBell />}
            <div className="flex items-center gap-2.5 border-l border-slate-150 pl-4">
              <Avatar size="sm" clickable={canEditProfile} />
              <span className="text-sm font-bold text-slate-700">{user.name}</span>
            </div>
          </div>
        </div>

        {/* Dynamic nested route viewport scroll area */}
        <div className="flex-1 overflow-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="min-h-full"
            >
              {/* React Router outlet for views */}
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200"
            >
              {/* Modal Header banner */}
              <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-6 pt-6 pb-16">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-white"
                >
                  <X className="w-4 h-4" />
                </button>
                <h3 className="text-lg font-extrabold text-white">Edit Profile</h3>
                <p className="text-indigo-200 text-xs font-semibold mt-1">Customize your account</p>
              </div>

              {/* Avatar upload section – overlapping the header banner */}
              <div className="flex justify-center -mt-12 relative z-10">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl font-extrabold uppercase">
                        {user.name.slice(0, 2)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 w-9 h-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg flex items-center justify-center transition-colors border-2 border-white"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Profile details form fields */}
              <div className="px-6 pt-5 pb-6 space-y-4">
                {profileError && (
                  <div className="bg-rose-50 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-200">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    Profile updated successfully!
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {/* Password reset section */}
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-3"></p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">New password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5 block">Confirm password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={profilePasswordConfirm}
                          onChange={(e) => setProfilePasswordConfirm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save and Cancel actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-105 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Chatbot floating widget – only for regular users */}
      <AIChatBot />
    </div>
  );
}

