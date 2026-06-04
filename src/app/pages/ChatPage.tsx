/**
 * @file ChatPage.tsx
 * @description In-app chat interface between clients and managers.
 * Shows a listing of available chat threads (filtered dynamically based on active reservation bookings),
 * retrieves and normalizes messages in real-time using long-polling, handles message sending, and updates read status.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { messagesAPI, spacesAPI, reservationsAPI } from '../../utils/api';
import { 
  Send, 
  MessageSquare, 
  User, 
  Building2, 
  Clock, 
  Check, 
  Search, 
  AlertCircle,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  receiverName: string;
  receiverEmail: string;
  createdAt: string;
  read: boolean;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'user' | 'admin';
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

export function ChatPage() {
  const { user, token } = useAuth();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (user?.role === 'admin') {
    return <Navigate to="/dashboard/overview" replace />;
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarMobileVisible, setIsSidebarMobileVisible] = useState(true);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);


  // Get query params if user clicked "Contacter le Manager" from a space
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const managerId = params.get('managerId');
    if (managerId && managerId !== String(user?.id)) {
      setActiveContactId(managerId);
      setIsSidebarMobileVisible(false);
    }
  }, [location.search, user?.id]);

  // Load messages, spaces, and reservations (to discover managers)
  const loadData = async (silent = false) => {
    if (!token || !user) return;
    try {
      if (!silent) setIsLoading(true);

      // 1. Fetch messages
      const { messages: fetchedMessages } = await messagesAPI.getAll(token);
      const formattedMsgs: Message[] = (fetchedMessages || [])
        .filter((m: any) => !m.content?.startsWith('[Notification]'))
        .map((m: any) => ({
          id: m.id,
          content: m.content,
          senderId: String(m.senderId?.id || m.senderId),
          senderName: m.senderName || m.senderId?.username || 'Utilisateur',
          senderEmail: m.senderEmail || m.senderId?.email || '',
          receiverId: String(m.receiverId?.id || m.receiverId),
          receiverName: m.receiverName || m.receiverId?.username || 'Manager',
          receiverEmail: m.receiverEmail || m.receiverId?.email || '',
          createdAt: m.createdAt,
          read: !!m.read
        }));

      // Fetch all spaces and reservations (cache in state, fetch only on mount or non-silent reload)
      let spacesList = spaces;
      if (!silent || spaces.length === 0) {
        const { spaces: fetchedSpaces } = await spacesAPI.getAll(token);
        spacesList = fetchedSpaces;
        setSpaces(fetchedSpaces);
      }

      let reservationsList = reservations;
      if (!silent || reservations.length === 0) {
        const { reservations: fetchedReservations } = await reservationsAPI.getAll(token);
        reservationsList = fetchedReservations;
        setReservations(fetchedReservations);
      }

      console.log("CHATPAGE LOGS:", {
        spaces: spacesList,
        reservations: reservationsList,
        user,
        messages: formattedMsgs
      });

      // Keep any temporary messages that are not yet resolved/saved in the backend to prevent flickers or missing messages while sending
      setMessages(prev => {
        const tempMessages = prev.filter(m => String(m.id).startsWith('temp-'));
        const unresolvedTemp = tempMessages.filter(t => 
          !formattedMsgs.some(f => 
            f.senderId === t.senderId && 
            f.receiverId === t.receiverId && 
            f.content === t.content
          )
        );
        return [...formattedMsgs, ...unresolvedTemp];
      });


      // 2. Build the list of active/allowed contacts based on active reservations
      const allowedContactsMap: Record<string, { id: string; name: string; email: string; role: 'user' | 'manager' }> = {};

      const activeReservations = (reservationsList || []).filter((resv: any) => {
        const status = String(resv.status || '').toLowerCase();
        return status !== 'completed' && status !== 'terminée' && status !== 'cancelled' && status !== 'annulée';
      });

      if (user.role === 'user') {
        // As a user, I can chat with managers of spaces I currently have active reservations for
        activeReservations.forEach((resv: any) => {
          const resvUserId = String(resv.userId?.id || resv.userId || '');
          const currentUserId = String(user?.id || '');
          
          if (resvUserId === currentUserId && resv.spaceId) {
            const space = (spacesList || []).find((s: any) => String(s.id) === String(resv.spaceId));
            if (space) {
              const mId = String(space.managerId?.id || space.managerId);
              if (mId && mId !== String(user.id)) {
                allowedContactsMap[mId] = {
                  id: mId,
                  name: space.managerName || space.managerId?.username || 'Espace Manager',
                  email: space.managerEmail || space.managerId?.email || '',
                  role: 'manager'
                };
              }
            }
          }
        });

        // Also allow the manager from the interactive map redirect (?managerId=...)
        const params = new URLSearchParams(location.search);
        const queryManagerId = params.get('managerId');
        if (queryManagerId && queryManagerId !== String(user.id) && !allowedContactsMap[queryManagerId]) {
          const spaceWithManager = (spacesList || []).find((s: any) => String(s.managerId?.id || s.managerId) === String(queryManagerId));
          if (spaceWithManager) {
            allowedContactsMap[queryManagerId] = {
              id: queryManagerId,
              name: spaceWithManager.managerName || spaceWithManager.managerId?.username || 'Espace Manager',
              email: spaceWithManager.managerEmail || spaceWithManager.managerId?.email || '',
              role: 'manager'
            };
          } else {
            // Check if there is an existing message to extract their username/email
            const msgWithManager = formattedMsgs.find(m => m.senderId === queryManagerId || m.receiverId === queryManagerId);
            if (msgWithManager) {
              const isSender = msgWithManager.senderId === queryManagerId;
              allowedContactsMap[queryManagerId] = {
                id: queryManagerId,
                name: isSender ? msgWithManager.senderName : msgWithManager.receiverName,
                email: isSender ? msgWithManager.senderEmail : msgWithManager.receiverEmail,
                role: 'manager'
              };
            } else {
              allowedContactsMap[queryManagerId] = {
                id: queryManagerId,
                name: 'Espace Manager',
                email: '',
                role: 'manager'
              };
            }
          }
        }
      } else if (user.role === 'manager') {
        // As a manager, I can chat with users who have active reservations for my spaces
        const mySpaces = (spacesList || []).filter((s: any) => {
          const mId = String(s.managerId?.id || s.managerId || '');
          return mId === String(user.id);
        });
        
        activeReservations.forEach((resv: any) => {
          const space = mySpaces.find((s: any) => String(s.id) === String(resv.spaceId));
          if (space && resv.userId) {
            const uId = String(resv.userId?.id || resv.userId);
            if (uId && uId !== String(user.id)) {
              allowedContactsMap[uId] = {
                id: uId,
                name: resv.userId?.username || resv.userName || 'Utilisateur',
                email: resv.userId?.email || resv.userEmail || '',
                role: 'user'
              };
            }
          }
        });
      }

      // Also allow any contact who has existing message history with the user (so completed/cancelled threads are preserved)
      formattedMsgs.forEach((msg) => {
        const otherId = msg.senderId === String(user.id) ? msg.receiverId : msg.senderId;
        const otherName = msg.senderId === String(user.id) ? msg.receiverName : msg.senderName;
        const otherEmail = msg.senderId === String(user.id) ? msg.receiverEmail : msg.senderEmail;
        const otherRole = user.role === 'user' ? 'manager' : 'user';

        if (otherId && otherId !== String(user.id) && !allowedContactsMap[otherId]) {
          allowedContactsMap[otherId] = {
            id: otherId,
            name: otherName,
            email: otherEmail,
            role: otherRole as any
          };
        }
      });

      // 3. Construct discoveredContactsMap ONLY for allowed contacts
      const discoveredContactsMap: Record<string, Contact> = {};

      // Initialize all allowed contacts first so they always appear even if no messages yet
      Object.keys(allowedContactsMap).forEach((id) => {
        const allowed = allowedContactsMap[id];
        discoveredContactsMap[id] = {
          id: allowed.id,
          name: allowed.name,
          email: allowed.email,
          role: allowed.role,
          unreadCount: 0,
          lastMessage: "No messages yet. Start the conversation!",
          lastMessageTime: undefined
        };
      });

      // Populate message history only for allowed contacts
      formattedMsgs.forEach((msg) => {
        const otherId = msg.senderId === String(user.id) ? msg.receiverId : msg.senderId;
        const otherName = msg.senderId === String(user.id) ? msg.receiverName : msg.senderName;
        const otherEmail = msg.senderId === String(user.id) ? msg.receiverEmail : msg.senderEmail;
        
        const isSenderMe = msg.senderId === String(user.id);
        const isUnread = !msg.read && !isSenderMe;

        // ONLY allow if the contact is in our allowed list
        if (otherId && otherId !== String(user.id) && allowedContactsMap[otherId]) {
          discoveredContactsMap[otherId].lastMessage = msg.content;
          discoveredContactsMap[otherId].lastMessageTime = msg.createdAt;

          if (isUnread) {
            discoveredContactsMap[otherId].unreadCount += 1;
          }
        }
      });

      // Convert back to sorted list (most recent message first)
      const contactList = Object.values(discoveredContactsMap).sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setContacts(contactList);

      // If active contact is no longer in the allowed contacts list, reset it
      if (activeContactId && !discoveredContactsMap[activeContactId]) {
        setActiveContactId(null);
      }

      // Auto-mark active contact's unread messages as read (non-blocking Promise.all)
      if (activeContactId) {
        const unreadMsgs = formattedMsgs.filter(
          m => m.senderId === activeContactId && m.receiverId === String(user.id) && !m.read
        );
        if (unreadMsgs.length > 0) {
          Promise.all(unreadMsgs.map(m => messagesAPI.markAsRead(token, m.id)))
            .catch(err => console.error("Failed to mark messages as read:", err));
        }
      }

      setError('');
    } catch (err: any) {
      console.error(err);
      setError("Error loading messaging: " + (err.message || err));
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (token && user) {
      loadData();
    }
  }, [activeContactId, token, user]);

  // Real-time interval polling loop (every 5 seconds)
  useEffect(() => {
    if (!token || !user) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeContactId, token, user]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeContactId]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContactId || !token) return;

    const content = newMessage.trim();
    setNewMessage('');

    const tempMsg: Message = {
      id: 'temp-' + Date.now() + '-' + Math.random().toString(),
      content,
      senderId: String(user?.id),
      senderName: user?.name || '',
      senderEmail: user?.email || '',
      receiverId: activeContactId,
      receiverName: contacts.find(c => c.id === activeContactId)?.name || 'Recipient',
      receiverEmail: contacts.find(c => c.id === activeContactId)?.email || '',
      createdAt: new Date().toISOString(),
      read: false
    };

    // 1. Instantly append to local messages for TRUE instantaneous responsiveness UI
    setMessages(prev => [...prev, tempMsg]);
    
    // 2. Instantly update last message in contacts list
    setContacts(prev => prev.map(c => c.id === activeContactId ? {
      ...c,
      lastMessage: content,
      lastMessageTime: new Date().toISOString()
    } : c));

    try {
      const { message } = await messagesAPI.sendMessage(token, activeContactId, content);
      // Replace temporary ID with the real database ID so future actions work seamlessly
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, id: message.id } : m));
    } catch (err: any) {
      setError("Could not send message: " + err.message);
      // Remove temporary message from list on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  // Filter contacts by search query
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeContact = contacts.find(c => c.id === activeContactId);
  const activeChatMessages = messages.filter(
    m => (m.senderId === String(user?.id) && m.receiverId === activeContactId) || 
         (m.senderId === activeContactId && m.receiverId === String(user?.id))
  );

  const formatChatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-65px)] lg:h-[calc(100vh-2px)] bg-slate-50 relative overflow-hidden">
      
      {/* LEFT SIDEBAR - Contacts List */}
      <div className={`w-full lg:w-80 border-r border-slate-200 bg-white flex flex-col transition-all duration-300 absolute lg:relative z-20 h-full ${
        isSidebarMobileVisible ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600 animate-pulse" />
            Messaging
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            {user?.role === 'user' ? 'Chat with your Managers' : 'Reply to your Clients'}
          </p>
          
          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for a contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800 placeholder-slate-400 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Contacts scrolling list */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {isLoading && contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-slate-400">Loading contacts...</span>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 px-4">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-500">No contact found</p>
              <p className="text-xs text-slate-400 mt-1">Managers will automatically appear once a booking is made or they are contacted.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isActive = contact.id === activeContactId;
              return (
                <button
                  key={contact.id}
                  onClick={() => {
                    setActiveContactId(contact.id);
                    setIsSidebarMobileVisible(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-start gap-3 relative group border ${
                    isActive 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                      : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200 text-slate-800'
                  }`}
                >
                  {/* Avatar wrapper */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black relative flex-shrink-0 uppercase ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : 'bg-gradient-to-tr from-slate-100 to-slate-200 text-slate-600 group-hover:scale-105 transition-transform'
                  }`}>
                    {contact.role === 'manager' ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                    {contact.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 border-2 border-white rounded-full text-[9px] font-black text-white flex items-center justify-center animate-bounce">
                        {contact.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Info block */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-black truncate leading-none ${isActive ? 'text-white' : 'text-slate-900'}`}>
                        {contact.name}
                      </p>
                      {contact.lastMessageTime && (
                        <span className={`text-[9px] font-bold ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {formatChatTime(contact.lastMessageTime)}
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-xs mt-1 font-bold truncate ${
                      isActive ? 'text-indigo-100' : 'text-slate-500'
                    }`}>
                      {contact.lastMessage}
                    </p>

                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-white/10 text-white' 
                        : contact.role === 'manager' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {contact.role}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Chat Window */}
      <div className="flex-1 flex flex-col bg-slate-50 h-full relative z-10">
        <AnimatePresence mode="wait">
          {activeContactId ? (
            <motion.div
              key={activeContactId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full w-full bg-slate-50"
            >
              {/* Header of Chat */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm relative z-10">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setIsSidebarMobileVisible(true)}
                    className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-all lg:hidden"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                    {activeContact?.role === 'manager' ? (
                      <Building2 className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none">
                      {activeContact?.name || "Chat"}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider inline-block">
                      {activeContact?.email}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Active
                </span>
              </div>

              {/* Chat Message Scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-indigo-50/10 to-transparent">
                {activeChatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <MessageSquare className="w-12 h-12 text-slate-300 mb-3 animate-bounce" />
                    <p className="text-base font-black text-slate-800">Say hello! 👋</p>
                    <p className="text-xs text-slate-500 font-bold mt-1 max-w-xs">
                      Start a chat with your manager to ask questions about the coworking space.
                    </p>
                  </div>
                ) : (
                  activeChatMessages.map((msg) => {
                    const isMe = msg.senderId === String(user?.id);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 relative border text-sm font-semibold shadow-sm ${
                            isMe
                              ? 'bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-br-none border-indigo-600'
                              : 'bg-white text-slate-800 rounded-bl-none border-slate-100'
                          }`}
                        >
                          <p className="leading-relaxed font-bold break-words">{msg.content}</p>
                          
                          <div className="flex items-center justify-end gap-1 mt-1.5">
                            <Clock className={`w-3 h-3 ${isMe ? 'text-indigo-200' : 'text-slate-400'}`} />
                            <span className={`text-[9px] font-bold ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                              {formatChatTime(msg.createdAt)}
                            </span>
                            {isMe && (
                              <Check className={`w-3.5 h-3.5 ${msg.read ? 'text-emerald-300' : 'text-indigo-300'}`} />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input form */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 relative z-10"
              >
                <input
                  type="text"
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 pl-4 pr-4 py-3.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold text-slate-800 placeholder-slate-400 transition-all shadow-inner"
                />
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-md hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0 transition-all"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </form>
            </motion.div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
              <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
                <MessageSquare className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800">No open discussion</h3>
              <p className="text-sm font-bold text-slate-500 mt-2 max-w-sm">
                Select a contact from the left column or go to a coworking space to start a discussion.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
