import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { spacesAPI, reservationsAPI } from '../../utils/api';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Zap,
  ChevronRight,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────────────────────
// Google Gemini API Key
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_API_KEY = 'AIzaSyAF9yYRSdbg5QCES2OayJaItALqLj163O8';

// Initialize once at module level (not inside component to avoid re-creation)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ChatAction[];
}

interface ChatAction {
  label: string;
  path: string;
}

const QUICK_SUGGESTIONS = [
  'Find me a quiet space to study',
  'Find the closest space to my location',
  'Show me all available spaces',
  'Find a space for 10 people',
];

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! 👋 I'm **SpotFinder AI**, your intelligent workspace assistant.\n\nI can help you:\n- 🔍 **Find the perfect coworking space** based on your needs\n- 📍 **Locate spaces near you** using your GPS\n- 📅 **Check your bookings** and reservations\n- 🧭 **Navigate the app** step by step\n\nWhat are you looking for today?",
  timestamp: new Date(),
};

// Render bold **text** markdown
function parseMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-white">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Haversine distance in km between two GPS points
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Strip [ACTION:Label:Path] tokens and return them separately
function parseActions(text: string): { cleanText: string; actions: ChatAction[] } {
  const actions: ChatAction[] = [];
  const cleanText = text
    .replace(/\[ACTION:([^:]+):([^\]]+)\]/g, (_, label, path) => {
      actions.push({ label: label.trim(), path: path.trim() });
      return '';
    })
    .trim();
  return { cleanText, actions };
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart rule-based fallback (used when Gemini API quota is exhausted)
// ─────────────────────────────────────────────────────────────────────────────
function smartFallback(
  query: string,
  spaces: any[],
  reservations: any[],
  userId: any,
  userLat?: number,
  userLon?: number
): { cleanText: string; actions: ChatAction[] } {
  const q = query.toLowerCase();
  const actions: ChatAction[] = [];

  // ── Intent: bookings / reservations ──────────────────────────────────────
  if (/booking|reserv|appointment|my space|my booking/i.test(q)) {
    const mine = reservations.filter(
      (r: any) => String(r.userId?.id || r.userId) === String(userId)
    );
    if (!mine.length) {
      actions.push({ label: 'View Bookings', path: '/dashboard/reservations' });
      return { cleanText: "You don't have any bookings yet. Head to the map to find and book a space!", actions };
    }
    const lines = mine.map((r: any) =>
      `• **${r.spaceId || 'Space'}** — Status: ${r.status || 'N/A'}, From ${r.startDate || '?'} to ${r.endDate || '?'}`
    ).join('\n');
    actions.push({ label: 'View Bookings', path: '/dashboard/reservations' });
    return { cleanText: `Here are your reservations:\n\n${lines}`, actions };
  }

  // ── Intent: closest / nearest (needs GPS) ────────────────────────────────
  if (/nearest|closest|near me|close to me|near my|localisation|location/i.test(q)) {
    if (!userLat || !userLon) {
      return { cleanText: 'To find the nearest space I need your location. Please allow location access in your browser and try again.', actions };
    }
    const withDist = spaces
      .filter((s: any) => s.latitude && s.longitude)
      .map((s: any) => ({
        ...s,
        dist: haversineKm(userLat!, userLon!, parseFloat(s.latitude), parseFloat(s.longitude)),
      }))
      .sort((a: any, b: any) => a.dist - b.dist)
      .slice(0, 3);
    if (!withDist.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/map' });
      return { cleanText: 'No spaces have GPS coordinates set yet. Check the interactive map for all available spaces.', actions };
    }
    const lines = withDist.map((s: any) =>
      `• **${s.name || s.title}** — ${s.dist.toFixed(1)} km away | Capacity: ${s.capacity || 'N/A'} | $${s.pricePerDay || s.price || 'N/A'}/day`
    ).join('\n');
    actions.push({ label: 'Open Map', path: '/dashboard/map' });
    return { cleanText: `Here are the **3 closest spaces** to your location:\n\n${lines}`, actions };
  }

  // ── Intent: capacity / people ─────────────────────────────────────────────
  const capMatch = q.match(/(\d+)\s*(people|person|persons|seats?|capacity)/i)
    || q.match(/(for|capacity)\s+(\d+)/i);
  if (capMatch) {
    const cap = parseInt(capMatch[1] || capMatch[2]);
    const filtered = spaces.filter((s: any) => s.capacity && parseInt(s.capacity) >= cap);
    if (!filtered.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/spaces' });
      return { cleanText: `No spaces found with a capacity of **${cap}+** people. Here are all available spaces:`, actions };
    }
    const lines = filtered.slice(0, 5).map((s: any) =>
      `• **${s.name || s.title}** — Capacity: ${s.capacity} | Type: ${s.type || 'Coworking'} | $${s.pricePerDay || s.price || 'N/A'}/day`
    ).join('\n');
    actions.push({ label: 'View Spaces', path: '/dashboard/spaces' });
    return { cleanText: `Spaces that fit **${cap}+ people**:\n\n${lines}`, actions };
  }

  // ── Intent: price / budget ────────────────────────────────────────────────
  const priceMatch = q.match(/(under|less than|below|max|budget)\s*\$?(\d+)/i)
    || q.match(/\$?(\d+)\s*(max|maximum|or less)/i);
  if (priceMatch) {
    const maxPrice = parseInt(priceMatch[2] || priceMatch[1]);
    const filtered = spaces.filter((s: any) => {
      const p = parseFloat(s.pricePerDay || s.price || '9999');
      return p <= maxPrice;
    });
    if (!filtered.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/spaces' });
      return { cleanText: `No spaces found under **$${maxPrice}/day**. Check all spaces for current pricing.`, actions };
    }
    const lines = filtered.slice(0, 5).map((s: any) =>
      `• **${s.name || s.title}** — $${s.pricePerDay || s.price}/day | Capacity: ${s.capacity || 'N/A'} | Type: ${s.type || 'Coworking'}`
    ).join('\n');
    actions.push({ label: 'View Spaces', path: '/dashboard/spaces' });
    return { cleanText: `Spaces under **$${maxPrice}/day**:\n\n${lines}`, actions };
  }

  // ── Intent: quiet / study ─────────────────────────────────────────────────
  if (/quiet|study|focus|silent|individual|solo|alone/i.test(q)) {
    const filtered = spaces.filter((s: any) =>
      /quiet|study|focus|individual|private/i.test(`${s.type} ${s.name} ${s.description} ${s.amenities}`)
    );
    const toShow = (filtered.length ? filtered : spaces).slice(0, 4);
    const lines = toShow.map((s: any) =>
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | $${s.pricePerDay || s.price || 'N/A'}/day`
    ).join('\n');
    actions.push({ label: 'Open Map', path: '/dashboard/map' });
    return {
      cleanText: filtered.length
        ? `Here are **quiet spaces for studying**:\n\n${lines}`
        : `No spaces are specifically labeled "quiet" yet. Here are all available spaces:\n\n${lines}`,
      actions,
    };
  }

  // ── Intent: collaborative / team / meeting ────────────────────────────────
  if (/collab|team|meeting|group|open space|cowork|office/i.test(q)) {
    const filtered = spaces.filter((s: any) =>
      /collab|team|meeting|open|cowork|office/i.test(`${s.type} ${s.name} ${s.description} ${s.amenities}`)
    );
    const toShow = (filtered.length ? filtered : spaces).slice(0, 4);
    const lines = toShow.map((s: any) =>
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | $${s.pricePerDay || s.price || 'N/A'}/day`
    ).join('\n');
    actions.push({ label: 'Open Map', path: '/dashboard/map' });
    return {
      cleanText: filtered.length
        ? `Here are **collaborative spaces**:\n\n${lines}`
        : `Here are available spaces that could work for your team:\n\n${lines}`,
      actions,
    };
  }

  // ── Intent: all spaces / show spaces / available ──────────────────────────
  if (/all space|show space|available|list|what space|which space/i.test(q)) {
    if (!spaces.length) {
      actions.push({ label: 'View Map', path: '/dashboard/map' });
      return { cleanText: 'No spaces have been added to the platform yet. Check back soon!', actions };
    }
    const lines = spaces.slice(0, 6).map((s: any) =>
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | $${s.pricePerDay || s.price || 'N/A'}/day`
    ).join('\n');
    actions.push({ label: 'View All on Map', path: '/dashboard/map' });
    return { cleanText: `Here are all **${spaces.length} available spaces**:\n\n${lines}`, actions };
  }

  // ── Intent: how to book / navigation help ─────────────────────────────────
  if (/how|book|reserv|navigate|where|find|help|guide/i.test(q)) {
    actions.push({ label: 'Open Map', path: '/dashboard/map' });
    actions.push({ label: 'My Bookings', path: '/dashboard/reservations' });
    return {
      cleanText:
        'Here\'s how to book a space:\n\n1. **Open the Map** → Browse all available spaces\n2. **Click a space** → View details and availability\n3. **Click "Book Now"** → Choose your dates and confirm\n4. **Check My Bookings** → Track all your reservations\n\nNeed more help?',
      actions,
    };
  }

  // ── Default fallback ──────────────────────────────────────────────────────
  actions.push({ label: 'View All Spaces', path: '/dashboard/map' });
  return {
    cleanText: `I can help you with:\n- 🔍 **Finding spaces** (quiet, collaborative, by capacity, by price)\n- 📍 **Nearest space** to your location\n- 📅 **Your bookings** and reservations\n- 🗺️ **Navigating the app**\n\nTry: *"Find me a quiet space"* or *"Find a space for 5 people"*`,
    actions,
  };
}

export function AIChatBot() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show for regular users
  if (!user || user.role !== 'user') return null;

  // Load real platform data when chat first opens
  useEffect(() => {
    if (isOpen && !dataLoaded && token) {
      loadContextData();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, token]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop the entrance pulse after 5 s
  useEffect(() => {
    const t = setTimeout(() => setIsPulsing(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const loadContextData = async () => {
    try {
      const [spacesRes, resRes] = await Promise.all([
        spacesAPI.getAll(token!),
        reservationsAPI.getAll(token!),
      ]);
      setSpaces(spacesRes.spaces || []);
      setReservations(resRes.reservations || []);
      setDataLoaded(true);
    } catch (e) {
      console.error('[AIChatBot] Failed to load context data:', e);
    }
  };

  // Build the system instruction injected before every conversation
  const buildSystemPrompt = (userLat?: number, userLon?: number): string => {
    const spacesSummary = spaces
      .map((s: any, i: number) => {
        const lat = s.latitude ? parseFloat(s.latitude) : null;
        const lon = s.longitude ? parseFloat(s.longitude) : null;
        let distStr = '';
        if (userLat && userLon && lat && lon) {
          const dist = haversineKm(userLat, userLon, lat, lon);
          distStr = ` | Distance: ${dist.toFixed(1)} km`;
        }
        return `Space ${i + 1}: Name="${s.name || s.title}", Type="${s.type || 'Coworking'}", Capacity=${s.capacity || 'N/A'}, Price/day=$${s.pricePerDay || s.price || 'N/A'}, Amenities="${s.amenities || s.description || ''}", Available=${s.available !== false}${distStr}`;
      })
      .join('\n');

    const myReservations = reservations
      .filter((r: any) => String(r.userId?.id || r.userId) === String(user?.id))
      .map(
        (r: any) =>
          `- Space ID ${r.spaceId}: Status=${r.status}, Start=${r.startDate}, End=${r.endDate}`
      )
      .join('\n');

    return `You are SpotFinder AI, the intelligent assistant of the SpotFinder coworking platform.

RULES (NEVER BREAK THESE):
- Always respond in ENGLISH only — no exceptions
- Be concise, warm, and helpful
- Use **bold** markdown to highlight key names and facts
- When suggesting spaces, always show: Name, Capacity, Price/day, and Type
- For navigation guidance, end your message with: [ACTION:Go to Map:/dashboard/map] or [ACTION:My Bookings:/dashboard/reservations] or [ACTION:View Spaces:/dashboard/spaces]
- NEVER invent data — only use the real spaces listed below
- If no spaces match, say so honestly

CURRENT USER: ${user?.name}

COWORKING SPACES AVAILABLE ON PLATFORM:
${spacesSummary || 'No spaces have been added yet.'}

USER RESERVATIONS:
${myReservations || 'No reservations found.'}

APP ROUTES:
- Dashboard: /dashboard/overview
- Interactive Map: /dashboard/map
- My Bookings: /dashboard/reservations
- Messaging: /dashboard/chat`;
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Auto-detect location queries and fetch GPS
      let userLat: number | undefined;
      let userLon: number | undefined;
      const locationKeywords = ['nearest', 'closest', 'near me', 'near my location', 'close to me', 'my area', 'localisation', 'location'];
      const wantsLocation = locationKeywords.some(kw => content.toLowerCase().includes(kw));

      if (wantsLocation && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 })
          );
          userLat = pos.coords.latitude;
          userLon = pos.coords.longitude;
        } catch {
          // Location denied — AI will handle gracefully
        }
      }

      const systemPrompt = buildSystemPrompt(userLat, userLon);

      // Build conversation history (exclude welcome, keep last 6 pairs)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .slice(-12)
        .map(m => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.content }],
        }));

      // Use the official SDK — much more reliable than raw fetch
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        systemInstruction: systemPrompt,
      });

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(content.trim());
      const rawText = result.response.text();

      const { cleanText, actions } = parseActions(rawText);

      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: cleanText,
          timestamp: new Date(),
          actions,
        },
      ]);
    } catch (err: any) {
      console.error('[AIChatBot] Gemini error:', err);
      const errMsg: string = err?.message || err?.toString() || 'Unknown error';
      const isRateLimit = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted') || errMsg.toLowerCase().includes('rate');

      if (isRateLimit) {
        // ── Gemini quota exhausted → smart rule-based fallback ────────────
        console.warn('[AIChatBot] Quota hit — using smart fallback mode');
        let fbLat: number | undefined;
        let fbLon: number | undefined;
        const locationKeywords = ['nearest', 'closest', 'near me', 'near my location', 'close to me', 'my area', 'localisation', 'location'];
        if (locationKeywords.some(kw => content.toLowerCase().includes(kw)) && navigator.geolocation) {
          try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 })
            );
            fbLat = pos.coords.latitude;
            fbLon = pos.coords.longitude;
          } catch { /* location denied */ }
        }
        const fb = smartFallback(content, spaces, reservations, user?.id, fbLat, fbLon);
        setMessages(prev => [
          ...prev,
          {
            id: `fb-${Date.now()}`,
            role: 'assistant',
            content: fb.cleanText,
            timestamp: new Date(),
            actions: fb.actions,
          },
        ]);
      } else {
        const isKeyError =
          errMsg.toLowerCase().includes('api_key') ||
          errMsg.toLowerCase().includes('api key') ||
          errMsg.toLowerCase().includes('permission denied') ||
          errMsg.toLowerCase().includes('authentication');
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: isKeyError
              ? '⚠️ **API key error.** Please check the Gemini API key in `AIChatBot.tsx`.'
              : `⚠️ **Error:** ${errMsg}`,
            timestamp: new Date(),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (action: ChatAction) => {
    navigate(action.path);
    setIsOpen(false);
  };

  const handleReset = () => setMessages([WELCOME_MESSAGE]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <motion.div
        className="fixed bottom-6 right-6 z-[200]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.5 }}
      >
        {isPulsing && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-indigo-500 opacity-30 animate-ping" />
        )}
        <motion.button
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          className={`relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? 'bg-slate-800 shadow-slate-900/40'
              : 'bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 shadow-indigo-500/40'
          }`}
          aria-label="Open AI Assistant"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div key="spark" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* ── Chat Window ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-24 right-6 z-[199] w-[370px] max-w-[calc(100vw-24px)] flex flex-col rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)] border border-white/10"
            style={{ height: '560px', maxHeight: 'calc(100vh - 110px)' }}
          >
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-violet-800 px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight">SpotFinder AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-indigo-200 font-bold">Active · English</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white transition-all"
                  title="Reset conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-slate-950 px-4 py-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                    msg.role === 'user'
                      ? 'bg-indigo-600'
                      : 'bg-gradient-to-br from-purple-600 to-violet-700'
                  }`}>
                    {msg.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-white" />
                      : <Sparkles className="w-3.5 h-3.5 text-white" />
                    }
                  </div>

                  {/* Bubble + Actions */}
                  <div className={`flex flex-col gap-2 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed font-medium whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700/60'
                    }`}>
                      {msg.role === 'assistant' ? parseMarkdown(msg.content) : msg.content}
                    </div>

                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {msg.actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => handleAction(action)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-md hover:scale-105"
                          >
                            <ChevronRight className="w-3 h-3" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-600 font-bold px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick suggestions (only on fresh conversation) */}
            {messages.length === 1 && (
              <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-3 py-2.5">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-2">Quick suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="text-[10px] font-bold px-2.5 py-1 bg-slate-800 hover:bg-indigo-900/60 text-slate-300 hover:text-white border border-slate-700 hover:border-indigo-600 rounded-lg transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-3 py-3 flex items-center gap-2.5">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask me anything about spaces..."
                className="flex-1 bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 placeholder-slate-500 outline-none transition-all"
                disabled={isLoading}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 flex-shrink-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                {isLoading
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />
                }
              </motion.button>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 bg-slate-950 py-1.5 text-center border-t border-slate-800">
              <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider flex items-center justify-center gap-1">
                <Zap className="w-2.5 h-2.5 text-indigo-700" />
                Powered by Google Gemini · SpotFinder AI
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
