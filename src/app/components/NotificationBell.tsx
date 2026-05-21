import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI } from '../../utils/api';
import { 
  Bell, 
  BellRing, 
  Calendar, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Check, 
  X,
  MessageSquare,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationMessage {
  id: string;
  content: string;
  read: boolean;
  createdAt: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
}

export function NotificationBell() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token || !user) return;

    // Load initial notifications
    loadNotifications();

    // Set up polling (every 15 seconds)
    const interval = setInterval(() => {
      loadNotifications();
    }, 15000);

    return () => clearInterval(interval);
  }, [token, user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!token || !user) return;
    try {
      const { messages } = await messagesAPI.getAll(token);
      
      // Filter only notification types and targeted at current user
      const filtered = messages
        .filter((msg: any) => 
          msg.content && 
          msg.content.startsWith('[Notification]') && 
          String(msg.receiverId) === String(user.id)
        )
        .map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          read: msg.read === true,
          createdAt: msg.createdAt,
          senderId: msg.senderId,
          senderName: msg.senderName,
          receiverId: msg.receiverId
        }))
        // Newest notifications first
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Count unread
      const unreads = filtered.filter((n: any) => !n.read).length;
      
      // Animate bell if new unread notifications arrive
      if (unreads > unreadCount) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1200);
      }

      setNotifications(filtered);
      setUnreadCount(unreads);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await messagesAPI.markAsRead(token, id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map(id => messagesAPI.markAsRead(token, id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const parseNotificationContent = (content: string) => {
    const raw = content.replace('[Notification]', '').trim();
    const parts = raw.split('|');
    let title = parts[0]?.trim() || 'Notification';
    let body = parts[1]?.trim() || '';

    // Dynamically translate historical French notifications to English
    const titleMap: { [key: string]: string } = {
      'Réservation Confirmée': 'Booking Confirmed',
      'Session Terminée': 'Booking Completed',
      'Réservation Annulée': 'Booking Canceled',
      'Espace Modifié': 'Space Modified',
      'Espace Supprimé': 'Space Deleted',
      'Réservation Modifiée': 'Booking Modified',
      'Nouvelle Réservation': 'New Booking',
    };

    if (titleMap[title]) {
      title = titleMap[title];
    }

    // Body translation (on-the-fly replacements for key French notification sentences)
    if (body.includes("a été confirmée par le manager")) {
      body = body
        .replace("Votre réservation pour l'espace", "Your booking for space")
        .replace("prévue le", "scheduled on")
        .replace("a été confirmée par le manager", "has been confirmed by the manager");
    } else if (body.includes("est maintenant terminée") && body.includes("laisser un avis")) {
      body = body
        .replace("Votre session pour l'espace", "Your session for space")
        .replace("est maintenant terminée. Vous pouvez laisser un avis sur la qualité de votre session.", "is now complete. You can leave a review on the quality of your session.")
        .replace("est maintenant terminée. Vous pouvez laisser un avis.", "is now complete. You can leave a review on the quality of your session.");
    } else if (body.includes("Le manager a annulé votre réservation")) {
      body = body
        .replace("Le manager a annulé votre réservation pour l'espace", "The manager has canceled your booking for space")
        .replace("prévue le", "scheduled on");
    } else if (body.includes("a annulé sa réservation") || body.includes("a annulé leur réservation")) {
      body = body
        .replace("L'coworker", "Coworker")
        .replace("a annulé sa réservation pour l'espace", "has canceled their booking for space")
        .replace("a annulé leur réservation pour l'espace", "has canceled their booking for space")
        .replace("prévue le", "scheduled on");
    } else if (body.includes("Le manager a mis à jour les détails de l'espace")) {
      body = body
        .replace("Le manager a mis à jour les détails de l'espace", "The manager has updated the details of the space")
        .replace("dans lequel vous avez une réservation active.", "in which you have an active booking.");
    } else if (body.includes("a été définitivement supprimé/fermé")) {
      body = body
        .replace("L'espace", "The space")
        .replace("a été définitivement supprimé/fermé par le manager. Votre réservation a été annulée.", "has been permanently deleted/closed by the manager. Your booking has been canceled.");
    } else if (body.includes("a modifié sa réservation") || body.includes("a modifié leur réservation")) {
      body = body
        .replace("L'coworker", "Coworker")
        .replace("a modifié sa réservation pour l'espace", "has modified their booking for space")
        .replace("a modifié leur réservation pour l'espace", "has modified their booking for space")
        .replace("nouveau créneau:", "new slot:");
    } else if (body.includes("a réservé votre espace")) {
      body = body
        .replace("L'coworker", "Coworker")
        .replace("anonyme", "anonymous")
        .replace("a réservé votre espace", "has booked your space")
        .replace("pour le", "for");
    }

    // Translate months and days from French to English in the body
    const monthsFrToEn: { [key: string]: string } = {
      'janvier': 'Jan',
      'février': 'Feb',
      'mars': 'Mar',
      'avril': 'Apr',
      'mai': 'May',
      'juin': 'Jun',
      'juillet': 'Jul',
      'août': 'Aug',
      'septembre': 'Sep',
      'octobre': 'Oct',
      'novembre': 'Nov',
      'décembre': 'Dec',
    };
    for (const [fr, en] of Object.entries(monthsFrToEn)) {
      if (body.toLowerCase().includes(fr)) {
        const regex = new RegExp(fr, 'gi');
        body = body.replace(regex, en);
      }
    }

    return { title, body };
  };

  const getNotificationVisuals = (title: string) => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('supprimé') || lowerTitle.includes('annulé') || lowerTitle.includes('fermé') || lowerTitle.includes('delete') || lowerTitle.includes('cancel')) {
      return {
        icon: Trash2,
        colorClass: 'text-rose-600 bg-rose-50 border-rose-100',
        dotClass: 'bg-rose-500'
      };
    }
    if (lowerTitle.includes('créé') || lowerTitle.includes('nouvelle') || lowerTitle.includes('booking') || lowerTitle.includes('réservé')) {
      return {
        icon: Calendar,
        colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        dotClass: 'bg-emerald-500'
      };
    }
    if (lowerTitle.includes('modifié') || lowerTitle.includes('mise à jour') || lowerTitle.includes('update')) {
      return {
        icon: Edit,
        colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        dotClass: 'bg-indigo-500'
      };
    }
    return {
      icon: Bell,
      colorClass: 'text-slate-600 bg-slate-50 border-slate-100',
      dotClass: 'bg-slate-500'
    };
  };

  const formatNotificationTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  if (!user) return null;

  return (
    <div className="relative z-50" ref={dropdownRef}>
      {/* Bell Button with glowing badge */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2.5 rounded-xl border relative transition-all duration-300 flex items-center justify-center ${
          isOpen
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm shadow-indigo-550/10'
            : 'bg-slate-50 border-slate-150 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-800'
        }`}
      >
        <AnimatePresence mode="wait">
          {isAnimating || unreadCount > 0 ? (
            <motion.div
              key="ringing-bell"
              animate={isAnimating ? {
                rotate: [0, -15, 15, -10, 10, -5, 5, 0],
                transition: { duration: 0.8, ease: "easeInOut" }
              } : {}}
            >
              <BellRing className={`w-5 h-5 ${unreadCount > 0 ? 'text-indigo-600' : ''}`} />
            </motion.div>
          ) : (
            <motion.div key="still-bell">
              <Bell className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse badge count */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-r from-rose-500 to-red-600 text-white font-extrabold text-[10px] flex items-center justify-center shadow-md border-2 border-white animate-fade-in">
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* Glassmorphism Notification Dropdown List */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col z-50 text-slate-800"
          >
            {/* Dropdown Header */}
            <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-[10px] text-indigo-600 font-extrabold mt-0.5">
                    {unreadCount} unread
                  </p>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 bg-white hover:bg-indigo-50 border border-slate-150 hover:border-indigo-150 px-2.5 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications Scroll Area */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100/60 flex-1">
              {notifications.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">No notifications</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                      You will be notified in real-time about any changes.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => {
                  const { title, body } = parseNotificationContent(notif.content);
                  const visuals = getNotificationVisuals(title);
                  const Icon = visuals.icon;

                  return (
                    <div
                      key={notif.id}
                      onClick={(e) => !notif.read && handleMarkAsRead(notif.id, e)}
                      className={`p-4 transition-all flex gap-3 relative cursor-pointer group ${
                        notif.read 
                          ? 'bg-white hover:bg-slate-50/50' 
                          : 'bg-indigo-50/15 hover:bg-indigo-50/30'
                      }`}
                    >
                      {/* Left: Indicator Dot & Icon */}
                      <div className="flex-shrink-0 flex items-start mt-0.5 relative">
                        {!notif.read && (
                          <span className={`absolute -left-1 -top-1 w-2.5 h-2.5 rounded-full ${visuals.dotClass} border border-white animate-pulse z-10`} />
                        )}
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm relative ${visuals.colorClass}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                      </div>

                      {/* Center: Info text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-black text-slate-900 leading-tight truncate`}>
                            {title}
                          </p>
                          <span className="text-[9px] text-slate-450 font-bold flex items-center gap-1 flex-shrink-0 whitespace-nowrap mt-0.5">
                            <Clock className="w-3 h-3 text-slate-350" />
                            {formatNotificationTime(notif.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-bold mt-1.5 leading-relaxed">
                          {body}
                        </p>
                      </div>

                      {/* Right: Quick Check Button (only if unread) */}
                      {!notif.read && (
                        <div className="flex-shrink-0 flex items-center justify-center self-center pl-1">
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-250 border border-transparent transition-all"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

             {/* Dropdown Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">
                SpotFinder &bull; System Notifications
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
