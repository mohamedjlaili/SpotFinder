/**
 * @file UserDashboard.tsx
 * @description Multi-role dashboard page (User, Manager, Admin).
 * Depending on the active user's credentials, it renders role-specific stat cards,
 * graphical charts (using Recharts), custom action shortcuts, and a transaction history modal.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI, reservationsAPI, spacesAPI } from '../../utils/api';
import { StatCard } from '../components/StatCard';
import { 
  Calendar, 
  CreditCard, 
  CheckCircle, 
  Building2, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Coins, 
  TrendingUp, 
  ShieldAlert, 
  Map,
  Activity,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

/**
 * UserDashboard view controller. Renders appropriate cards/graphs
 * based on role context.
 * 
 * @function UserDashboard
 * @returns {JSX.Element}
 */
export function UserDashboard() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [adminSpaces, setAdminSpaces] = useState<any[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyType, setHistoryType] = useState<'revenue' | 'spent' | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDate, setResetDate] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setResetDate(localStorage.getItem(`revenue_reset_${user.id}`));
    }
  }, [user]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    
    const updateTime = () => {
      const hours = new Date().getHours();
      let greeting = 'Good evening';
      if (hours < 18 && hours >= 6) greeting = 'Good morning';
      else if (hours >= 18 && hours < 22) greeting = 'Good evening';
      else if (hours >= 22 || hours < 6) greeting = 'Good night';
      
      const formattedDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });
      setCurrentTime(`${greeting} • ${formattedDate}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      if (!token) return;

      // For admin: use analyticsAPI which fetches global stats (users count, etc.)
      if (user?.role === 'admin') {
        const data = await analyticsAPI.getStats(token);
        setStats(data.stats);
        const resData = await reservationsAPI.getAll(token);
        setReservations(resData.reservations);
        const spacesData = await spacesAPI.getAll(token);
        setAdminSpaces(spacesData.spaces || []);
      } else {
        // For manager & client: compute stats from properly role-filtered endpoints
        const resData = await reservationsAPI.getAll(token);
        const myReservations = resData.reservations || [];
        setReservations(myReservations);

        const spacesData = await spacesAPI.getAll(token);
        const mySpaces = spacesData.spaces || [];

        const activeReservations = myReservations.filter(
          (r: any) => r.status !== 'completed' && r.status !== 'terminée'
        );

        setStats({
          totalSpaces: mySpaces.length,
          totalReservations: activeReservations.length,
          activeReservations: myReservations.filter((r: any) => r.status === 'confirmed').length,
          revenue: myReservations.reduce((sum: number, r: any) => sum + (Number(r.totalPrice) || 0), 0),
          totalSpent: myReservations.reduce((sum: number, r: any) => sum + (Number(r.totalPrice) || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetHistory = () => {
    if (!user) return;
    const now = new Date().toISOString();
    localStorage.setItem(`revenue_reset_${user.id}`, now);
    setResetDate(now);
  };

  // Filter reservations based on reset date
  const filteredReservations = reservations.filter((r) => {
    if (resetDate && new Date(r.createdAt) <= new Date(resetDate)) {
      return false;
    }
    return true;
  });

  // Calculate dynamic stats
  const dynamicRevenue = filteredReservations.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);
  const dynamicSpent = filteredReservations.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);

  // We should also filter active reservations for the totals
  const displayRevenue = stats ? dynamicRevenue : 0;
  const displaySpent = stats ? dynamicSpent : 0;
  const displayTotalReservations = reservations.filter(
    (r) => r.status !== 'completed' && r.status !== 'terminée'
  ).length;

  // Helper: compute real monthly chart data from reservation dates
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const buildMonthlyData = (resList: any[]) => {
    const now = new Date();
    const months: { name: string; revenue: number; bookings: number; spent: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ name: monthNames[d.getMonth()], revenue: 0, bookings: 0, spent: 0 });
    }
    resList.forEach((r: any) => {
      const rDate = new Date(r.startDate || r.createdAt);
      for (let j = 0; j < months.length; j++) {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - j), 1);
        if (rDate.getMonth() === d.getMonth() && rDate.getFullYear() === d.getFullYear()) {
          months[j].revenue += Number(r.totalPrice) || 0;
          months[j].spent += Number(r.totalPrice) || 0;
          months[j].bookings += 1;
          break;
        }
      }
    });
    return months;
  };

  // 1. Revenue & Spent: respects resetDate filter to match the "My Revenue" and "Total Spent" cards
  const monthlyRevenueSpentData = buildMonthlyData(filteredReservations);

  // 2. Bookings: includes all confirmed and completed sessions (excludes cancelled ones)
  const monthlyBookingsData = buildMonthlyData(reservations.filter(
    (r) => r.status !== 'cancelled' && r.status !== 'annulée' && r.status !== 'refused' && r.status !== 'refuse'
  ));

  const renderHistoryModal = () => {
    if (!showHistoryModal || !historyType) return null;

    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] relative"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {historyType === 'revenue' ? 'Revenue History' : 'Spending History'}
              </h3>
              <p className="text-xs text-slate-500">
                {historyType === 'revenue' 
                  ? 'Detailed earnings from bookings' 
                  : 'Detailed logs of your coworking expenses'}
              </p>
            </div>
            <button
              onClick={() => setShowHistoryModal(false)}
              className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Modal Body / Table */}
          <div className="overflow-y-auto my-4 flex-1 pr-1">
            {filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold">No transactions recorded yet.</p>
                <p className="text-xs">Any new bookings will show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations.map((res: any) => (
                  <div 
                    key={res.id} 
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">{res.spaceName}</p>
                      <div className="flex gap-2 items-center text-xs text-slate-500 mt-1">
                        <span>{new Date(res.startDate).toLocaleDateString('fr-FR')}</span>
                        <span>•</span>
                        <span>{res.hours}h</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          res.status === 'completed' || res.status === 'terminée' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {res.status}
                        </span>
                      </div>
                      {historyType === 'revenue' && res.userName && (
                        <p className="text-xs text-slate-400 mt-1">
                          Client: {res.userName} {res.userEmail ? `(${res.userEmail})` : ''}
                        </p>
                      )}
                    </div>
                    <span className="font-extrabold text-indigo-600 text-base">
                      +{res.totalPrice} DT
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
            >
              Close
            </button>
            {filteredReservations.length > 0 && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Reset to 0
              </button>
            )}
          </div>

          {/* Nested Confirmation Overlay */}
          <AnimatePresence>
            {showResetConfirm && (
              <div className="absolute inset-0 bg-white/95 rounded-3xl flex flex-col items-center justify-center p-6 text-center z-50">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Reset History?</h4>
                <p className="text-sm text-slate-500 mb-6 max-w-xs">
                  This will reset your {historyType === 'revenue' ? 'revenue' : 'spent'} counter to 0 and clear the transaction logs. This action is local to this device.
                </p>
                <div className="flex gap-3 w-full max-w-xs">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleResetHistory();
                      setShowResetConfirm(false);
                      setShowHistoryModal(false);
                    }}
                    className="flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors text-sm"
                  >
                    Yes, Reset
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="text-sm font-semibold text-slate-500">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (user?.role === 'admin') {
    const adminPieData = [
      { name: 'Users', value: stats?.totalUsers || 0, color: '#3B82F6' },
      { name: 'Managers', value: stats?.totalManagers || 0, color: '#A855F7' },
    ];

    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const adminGrowthData: { month: string; spaces: number; bookings: number }[] = [];
    
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const mName = monthNames[monthIndex];
      
      const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
      
      const spacesCount = adminSpaces.filter((s: any) => {
        if (!s.createdAt) return true;
        const created = new Date(s.createdAt);
        return created <= endOfMonth;
      }).length;
      
      const bookingsCount = reservations.filter((r: any) => {
        const createdDate = r.createdAt || r.startDate;
        if (!createdDate) return true;
        const created = new Date(createdDate);
        return created <= endOfMonth;
      }).length;
      
      adminGrowthData.push({
        month: mName,
        spaces: spacesCount,
        bookings: bookingsCount
      });
    }

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/10">
        {/* Floating background glowing blobs */}
        <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

        {/* Premium Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 p-8 text-white shadow-xl shadow-indigo-500/10"
        >
          <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur-3xl opacity-10 -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                Admin Console
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Hello, {user?.name}</h1>
              <p className="text-indigo-100 mt-1.5 text-sm">{currentTime}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-right">
              <span className="block text-xs text-indigo-100 uppercase tracking-widest font-semibold">System Status</span>
              <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 justify-end mt-0.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-pulse" />
                Operational
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers || 0}
            icon={Users}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Partner Managers"
            value={stats?.totalManagers || 0}
            icon={UserCheckIcon}
            color="purple"
            delay={0.1}
          />
          <StatCard
            title="Coworking Spaces"
            value={stats?.totalSpaces || 0}
            icon={Building2}
            color="green"
            delay={0.2}
          />
          <StatCard
            title="Total Bookings"
            value={stats?.totalReservations || 0}
            icon={Calendar}
            color="orange"
            delay={0.3}
          />
        </div>

        {/* Recharts Diagrams Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">Platform Growth</h3>
              <p className="text-xs text-slate-500 mb-6">Evolution of spaces and bookings over the months</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adminGrowthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEspaces" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Spaces" dataKey="spaces" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEspaces)" />
                  <Area type="monotone" name="Bookings" dataKey="bookings" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRes)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Chart 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">Account Distribution</h3>
              <p className="text-xs text-slate-500 mb-6">Distribution by user roles</p>
            </div>
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={adminPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {adminPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Admin Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Quick shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.button
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => navigate('/dashboard/users')}
              className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Manage Accounts</h3>
                <p className="text-slate-500 text-sm mt-1">Create partner managers or reset user accounts</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
            <motion.button
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => navigate('/dashboard/spaces')}
              className="group p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all text-left flex items-center justify-between"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Supervise Spaces</h3>
                <p className="text-slate-500 text-sm mt-1">View the list of all created coworking spaces</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Manager Dashboard
  if (user?.role === 'manager') {
    const managerRevenueData = monthlyRevenueSpentData.map(m => ({ name: m.name, revenue: Math.round(m.revenue) }));
    const managerBookingVolumeData = monthlyBookingsData.map(m => ({ name: m.name, bookings: m.bookings }));

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/10">
        {/* Floating background glowing blobs */}
        <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-teal-500/5 blur-3xl pointer-events-none" />

        {/* Premium Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-teal-700 p-8 text-white shadow-xl shadow-emerald-500/10"
        >
          <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full blur-3xl opacity-10 -mr-16 -mt-16" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Partner Portal
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Glad to see you again, {user?.name}</h1>
              <p className="text-emerald-100 mt-1.5 text-sm">{currentTime}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-right">
              <span className="block text-xs text-emerald-100 uppercase tracking-widest font-semibold">Revenue Trend</span>
              <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5 justify-end mt-0.5 font-sans">
                <TrendingUp className="w-4 h-4" />
                Positive Growth
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="My Spaces"
            value={stats?.totalSpaces || 0}
            icon={Building2}
            color="green"
            delay={0}
          />
          <StatCard
            title="Total Bookings"
            value={displayTotalReservations}
            icon={Calendar}
            color="blue"
            delay={0.1}
          />
          <StatCard
            title="My Revenue"
            value={`${displayRevenue} DT`}
            icon={Coins}
            color="orange"
            delay={0.2}
            onClick={() => {
              console.log('Manager Revenue card clicked, setting states...');
              setHistoryType('revenue');
              setShowHistoryModal(true);
            }}
          />
        </div>

        {/* Recharts Diagrams Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">Monthly Revenue (DT)</h3>
              <p className="text-xs text-slate-500 mb-6">Evolution of your accumulated revenue</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={managerRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                  <Area type="monotone" name="Revenue (DT)" dataKey="revenue" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Chart 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">Booking Volume</h3>
              <p className="text-xs text-slate-500 mb-6">Evolution of the total number of bookings</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={managerBookingVolumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorResBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                  <Bar dataKey="bookings" name="Bookings" fill="url(#colorResBar)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Manage your spaces</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute right-0 bottom-0 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl opacity-60 -mr-8 -mb-8" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Manage My Spaces</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Add new photos, manage capacity, and update GPS coordinates for your coworking spaces.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard/spaces')}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-2 text-sm relative z-10"
              >
                Access Spaces
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>

            <motion.div
              whileHover={{ y: -6 }}
              className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute right-0 bottom-0 w-36 h-36 bg-blue-500/5 rounded-full blur-2xl opacity-60 -mr-8 -mb-8" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">Reservation Tracking</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-6">
                  Keep track of your clients' bookings in real-time, monitor occupancy dates, and optimize revenue.
                </p>
              </div>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/dashboard/reservations')}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-2 text-sm relative z-10"
              >
                View Bookings
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </div>
        {renderHistoryModal()}
      </div>
    );
  }

  // Regular Client Dashboard
  const clientSpentData = monthlyRevenueSpentData.map(m => ({ name: m.name, spent: Math.round(m.spent) }));
  const clientBookingFrequencyData = monthlyBookingsData.map(m => ({ name: m.name, bookings: m.bookings }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-full relative overflow-hidden bg-slate-50/10">
      {/* Floating background glowing blobs */}
      <div className="absolute top-[20%] left-[-10%] w-96 h-96 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Premium Client Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-650 to-indigo-700 p-8 text-white shadow-xl shadow-blue-500/10"
      >
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full blur-3xl opacity-10 -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider w-fit mb-3">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Premium Coworker
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Welcome, {user?.name}</h1>
            <p className="text-blue-100 mt-1.5 text-sm">{currentTime}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-right">
            <span className="block text-xs text-blue-100 uppercase tracking-widest font-semibold">Want to work?</span>
            <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5 justify-end mt-0.5 font-sans">
              <Clock className="w-4 h-4" />
              Ready for a session
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - 2 Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="My Bookings"
          value={displayTotalReservations}
          icon={Calendar}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Total Spent"
          value={`${displaySpent} DT`}
          icon={Coins}
          color="purple"
          delay={0.1}
          onClick={() => {
            console.log('Client Total Spent card clicked, setting states...');
            setHistoryType('spent');
            setShowHistoryModal(true);
          }}
        />
      </div>

      {/* Recharts Diagrams Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900">My Monthly Spending (DT)</h3>
            <p className="text-xs text-slate-500 mb-6">Evolution of your work budget</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={clientSpentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClientSpent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                <Area type="monotone" name="Spent (DT)" dataKey="spent" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClientSpent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Chart 2 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-bold text-slate-900">Booking Frequency</h3>
            <p className="text-xs text-slate-500 mb-6">Monthly evolution of your work sessions</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clientBookingFrequencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorClientBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a' }} />
                <Bar dataKey="bookings" name="Sessions" fill="url(#colorClientBar)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Ready to find your next desk?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -6 }}
            className="group bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-6">
                <Map className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Explore the Map</h3>
              <p className="text-blue-100 text-sm leading-relaxed mb-6">
                View all our partner spaces on a map integrating your GPS position, and let Google Maps guide you.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard/map')}
              className="py-3 px-6 bg-white text-blue-700 rounded-xl font-bold transition-all hover:bg-blue-50 flex items-center justify-center gap-2 text-sm w-full mt-auto"
            >
              Search on Map
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          <motion.div
            whileHover={{ y: -6 }}
            className="group bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all text-left flex flex-col justify-between min-h-[220px]"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center mb-6">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-2">My Bookings</h3>
              <p className="text-emerald-100 text-sm leading-relaxed mb-6">
                Track your active bookings, plan your coworking sessions, and view your full bill history.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard/reservations')}
              className="py-3 px-6 bg-white text-emerald-700 rounded-xl font-bold transition-all hover:bg-emerald-50 flex items-center justify-center gap-2 text-sm w-full mt-auto"
            >
              View my bookings
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </div>

      {renderHistoryModal()}
    </div>
  );
}

// Inline custom manager partner icon component
const UserCheckIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <polyline points="16 11 18 13 22 9" />
  </svg>
);
