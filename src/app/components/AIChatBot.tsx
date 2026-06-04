/**
 * @file AIChatBot.tsx
 * @description Interactive AI chatbot assistant for SpotFinder using Gemini API (with a smart rules-based fallback).
 * Allows users to search for coworking spaces, find spaces close to them, check their bookings, 
 * and ask navigational questions with inline suggestions.
 */

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
  Settings,
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

// Parse coordinate safely to a number or null
function parseCoord(val: any): number | null {
  if (val === undefined || val === null) return null;
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(parsed) ? null : parsed;
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

interface ChatCompletionParams {
  provider: 'gemini' | 'openrouter' | 'groq';
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: { role: 'user' | 'model'; parts: { text: string }[] }[];
  userMessage: string;
}

// Unified callLLM helper to route messages to Gemini, OpenRouter, or Groq
async function callLLM({
  provider,
  apiKey,
  model,
  systemPrompt,
  history,
  userMessage
}: ChatCompletionParams): Promise<string> {
  if (provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model || 'gemini-2.0-flash-lite',
      systemInstruction: systemPrompt,
    });

    const chat = geminiModel.startChat({ history });
    const result = await chat.sendMessage(userMessage);
    return result.response.text();
  }

  // Format messages for OpenRouter / Groq (standard Chat Completions format)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.parts[0]?.text || ''
    })),
    { role: 'user', content: userMessage }
  ];

  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SpotFinder AI'
      },
      body: JSON.stringify({
        model: model || 'openrouter/free',
        messages
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'llama3-8b-8192',
        messages
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  throw new Error(`Unsupported provider: ${provider}`);
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

  // ── Intent: recommend / best / rating / top ────────────────────────────────
  if (/recommend|recomand|best|top|rating|highest rated|popular/i.test(q)) {
    let sortedSpaces = [...spaces];
    const hasLocation = userLat !== undefined && userLon !== undefined;
    
    if (hasLocation) {
      // Calculate distances mapping correct lat/lng properties
      sortedSpaces = sortedSpaces.map((s: any) => {
        const lat = parseCoord(s.lat) ?? parseCoord(s.latitude);
        const lon = parseCoord(s.lng) ?? parseCoord(s.longitude);
        let dist = Infinity;
        if (lat !== null && lon !== null) {
          dist = haversineKm(userLat!, userLon!, lat, lon);
        }
        return {
          ...s,
          dist
        };
      });

      // Sort spaces:
      // We want to prioritize spaces that are nearby.
      // Spaces within 50 km are "nearby".
      // We sort nearby spaces primarily by rating (descending), then by distance (ascending).
      // If spaces are not nearby (all are > 50 km), they are also sorted by rating descending (and then distance).
      sortedSpaces.sort((a: any, b: any) => {
        const aNearby = a.dist <= 50;
        const bNearby = b.dist <= 50;
        
        if (aNearby && !bNearby) return -1;
        if (!aNearby && bNearby) return 1;
        
        // If both are nearby or both are not nearby, sort by rating descending
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.01) {
          return ratingDiff;
        }
        // If ratings are equal, sort by distance ascending
        return a.dist - b.dist;
      });
    } else {
      // No location: sort all spaces by rating descending
      sortedSpaces.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }

    const topSpaces = sortedSpaces.slice(0, 3);
    if (!topSpaces.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/map' });
      return { cleanText: 'No spaces have been added to the platform yet. Check back soon!', actions };
    }

    const lines = topSpaces.map((s: any) => {
      const distInfo = s.dist !== undefined && s.dist !== Infinity ? ` | ${s.dist.toFixed(1)} km away` : '';
      return `• **${s.name || s.title}** — Rating: ⭐ **${s.rating || 'N/A'}/5**${distInfo} | Capacity: ${s.capacity || 'N/A'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`;
    }).join('\n');

    actions.push({ label: 'Open Map', path: '/dashboard/map' });
    const locationPrefix = hasLocation ? "near you" : "on the platform";
    return {
      cleanText: `Here are the **top-rated spaces ${locationPrefix}**:\n\n${lines}${!hasLocation ? '\n\n*(Tip: Share your location for closer recommendations!)*' : ''}`,
      actions
    };
  }

  // ── Intent: closest / nearest (needs GPS) ────────────────────────────────
  if (/nearest|closest|near me|close to me|near my|localisation|location/i.test(q)) {
    if (!userLat || !userLon) {
      return { cleanText: 'To find the nearest space I need your location. Please allow location access in your browser and try again.', actions };
    }
    const withDist = spaces
      .map((s: any) => {
        const lat = parseCoord(s.lat) ?? parseCoord(s.latitude);
        const lon = parseCoord(s.lng) ?? parseCoord(s.longitude);
        let dist = Infinity;
        if (lat !== null && lon !== null) {
          dist = haversineKm(userLat!, userLon!, lat, lon);
        }
        return {
          ...s,
          dist,
        };
      })
      .filter((s: any) => s.dist !== Infinity)
      .sort((a: any, b: any) => a.dist - b.dist)
      .slice(0, 3);
    if (!withDist.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/map' });
      return { cleanText: 'No spaces have GPS coordinates set yet. Check the interactive map for all available spaces.', actions };
    }
    const lines = withDist.map((s: any) =>
      `• **${s.name || s.title}** — ${s.dist.toFixed(1)} km away | Capacity: ${s.capacity || 'N/A'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`
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
      `• **${s.name || s.title}** — Capacity: ${s.capacity} | Type: ${s.type || 'Coworking'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`
    ).join('\n');
    actions.push({ label: 'View Spaces', path: '/dashboard/spaces' });
    return { cleanText: `Spaces that fit **${cap}+ people**:\n\n${lines}`, actions };
  }

  // ── Intent: price / budget ────────────────────────────────────────────────
  const priceMatch = q.match(/(under|less than|below|max|budget)\s*(\d+)/i)
    || q.match(/(\d+)\s*(max|maximum|or less|dt|dinar)/i);
  if (priceMatch) {
    const maxPrice = parseInt(priceMatch[2] || priceMatch[1]);
    const filtered = spaces.filter((s: any) => {
      const p = parseFloat(s.pricePerHour || '9999');
      return p <= maxPrice;
    });
    if (!filtered.length) {
      actions.push({ label: 'View All Spaces', path: '/dashboard/spaces' });
      return { cleanText: `No spaces found under **${maxPrice} DT/hour**. Check all spaces for current pricing.`, actions };
    }
    const lines = filtered.slice(0, 5).map((s: any) =>
      `• **${s.name || s.title}** — Price: **${s.pricePerHour || 'N/A'} DT/h** | Capacity: ${s.capacity || 'N/A'} | Type: ${s.type || 'Coworking'}`
    ).join('\n');
    actions.push({ label: 'View Spaces', path: '/dashboard/spaces' });
    return { cleanText: `Spaces under **${maxPrice} DT/hour**:\n\n${lines}`, actions };
  }

  // ── Intent: quiet / study ─────────────────────────────────────────────────
  if (/quiet|study|focus|silent|individual|solo|alone/i.test(q)) {
    const filtered = spaces.filter((s: any) =>
      /quiet|study|focus|individual|private/i.test(`${s.type} ${s.name} ${s.description} ${s.amenities}`)
    );
    const toShow = (filtered.length ? filtered : spaces).slice(0, 4);
    const lines = toShow.map((s: any) =>
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`
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
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`
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
      `• **${s.name || s.title}** — Type: ${s.type || 'Coworking'} | Capacity: ${s.capacity || 'N/A'} | Price: **${s.pricePerHour || 'N/A'} DT/h**`
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

/**
 * AIChatBot component.
 * Renders the floating chat button and the chat panel overlay, handling 
 * user messages, querying the Gemini AI API, and falling back to a rules-based system when offline/quota limit met.
 * 
 * @function AIChatBot
 * @returns {JSX.Element}
 */
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
  const [showSettings, setShowSettings] = useState(false);
  const [provider, setProvider] = useState<'gemini' | 'openrouter' | 'groq'>(() => {
    return (localStorage.getItem('spotfinder_chat_provider') as any) || 'openrouter';
  });
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('spotfinder_chat_api_key');
    if (saved) return saved;
    const prov = localStorage.getItem('spotfinder_chat_provider') || 'openrouter';
    return prov === 'gemini'
      ? GEMINI_API_KEY
      : '';
  });
  const [model, setModel] = useState(() => {
    const saved = localStorage.getItem('spotfinder_chat_model');
    if (saved) return saved;
    const prov = localStorage.getItem('spotfinder_chat_provider') || 'openrouter';
    return prov === 'gemini'
      ? 'gemini-2.0-flash-lite'
      : prov === 'groq'
      ? 'llama3-8b-8192'
      : 'openrouter/free';
  });
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

  // Migrate stale local storage model to new openrouter/free default
  useEffect(() => {
    const savedModel = localStorage.getItem('spotfinder_chat_model');
    if (savedModel === 'google/gemini-2.5-flash:free') {
      localStorage.removeItem('spotfinder_chat_model');
      setModel('openrouter/free');
    }
  }, []);

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
    let sortedSpaces = [...spaces];
    const hasLocation = userLat !== undefined && userLon !== undefined;

    if (hasLocation) {
      // Calculate distances mapping correct lat/lng properties
      sortedSpaces = sortedSpaces.map((s: any) => {
        const lat = parseCoord(s.lat) ?? parseCoord(s.latitude);
        const lon = parseCoord(s.lng) ?? parseCoord(s.longitude);
        let dist = Infinity;
        if (lat !== null && lon !== null) {
          dist = haversineKm(userLat!, userLon!, lat, lon);
        }
        return {
          ...s,
          dist
        };
      });

      // Sort spaces:
      // We want to prioritize spaces that are nearby.
      // Spaces within 50 km are "nearby".
      // We sort nearby spaces primarily by rating (descending), then by distance (ascending).
      // If spaces are not nearby (all are > 50 km), they are also sorted by rating descending (and then distance).
      sortedSpaces.sort((a: any, b: any) => {
        const aNearby = a.dist <= 50;
        const bNearby = b.dist <= 50;
        
        if (aNearby && !bNearby) return -1;
        if (!aNearby && bNearby) return 1;
        
        // If both are nearby or both are not nearby, sort by rating descending
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.01) {
          return ratingDiff;
        }
        // If ratings are equal, sort by distance ascending
        return a.dist - b.dist;
      });
    } else {
      // No location: sort all spaces by rating descending
      sortedSpaces.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
    }

    const spacesSummary = sortedSpaces
      .map((s: any, i: number) => {
        const lat = parseCoord(s.lat) ?? parseCoord(s.latitude);
        const lon = parseCoord(s.lng) ?? parseCoord(s.longitude);
        let distStr = '';
        if (hasLocation && lat !== null && lon !== null && s.dist !== Infinity) {
          distStr = ` | Distance: ${s.dist.toFixed(1)} km`;
        }
        return `Space ${i + 1}: Name="${s.name || s.title}", Type="${s.type || 'Coworking'}", Capacity=${s.capacity || 'N/A'}, Price/hour=${s.pricePerHour || 'N/A'} DT, Rating=${s.rating || 'N/A'}/5${distStr}, Amenities="${s.amenities || s.description || ''}", Available=${s.available !== false}`;
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
- When suggesting spaces, always show: Name, Capacity, Price/hour, and Type
- If the user asks for a recommendation, "recomandation", "best", "top", or "most rated" space:
  1. If the user's location is known (distances are shown in the list below), you MUST recommend the highest-rated spaces that are close/near to them (which are already sorted to the very top of the spaces list below). Explicitly state their Rating (e.g. **4.9/5**) and how far they are (Distance in km).
  2. If the user's location is NOT known (no distance is shown), recommend the highest-rated spaces overall and politely tell them they can enable location access for personalized nearby recommendations.
- For navigation guidance, end your message with: [ACTION:Go to Map:/dashboard/map] or [ACTION:My Bookings:/dashboard/reservations] or [ACTION:View Spaces:/dashboard/spaces]
- NEVER invent data — only use the real spaces listed below
- If no spaces match, say so honestly

CURRENT USER: ${user?.name}

COWORKING SPACES AVAILABLE ON PLATFORM (sorted with the highest-rated and closest spaces near the top):
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
      const locationKeywords = ['nearest', 'closest', 'near me', 'near my location', 'close to me', 'my area', 'localisation', 'location', 'recommend', 'recomand', 'best', 'rating'];
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

      // Resolve the active API key and model based on the provider
      let activeKey = apiKey;
      if (!activeKey) {
        if (provider === 'gemini') {
          activeKey = GEMINI_API_KEY;
        }
      }
      
      if (!activeKey) {
        throw new Error(`Please set your API key for ${provider} in the settings ⚙️ menu.`);
      }

      const rawText = await callLLM({
        provider,
        apiKey: activeKey,
        model,
        systemPrompt,
        history,
        userMessage: content.trim()
      });

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
        const locationKeywords = ['nearest', 'closest', 'near me', 'near my location', 'close to me', 'my area', 'localisation', 'location', 'recommend', 'recomand', 'best', 'rating'];
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
          errMsg.toLowerCase().includes('authentication') ||
          errMsg.toLowerCase().includes('settings');
        setMessages(prev => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: isKeyError
              ? `⚠️ **API key error.** ${errMsg.includes('settings') ? errMsg : 'Please check your API key in the settings ⚙️ menu.'}`
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
                  onClick={() => setShowSettings(prev => !prev)}
                  className={`p-1.5 rounded-lg hover:bg-white/10 text-indigo-200 hover:text-white transition-all ${showSettings ? 'bg-white/15 text-white' : ''}`}
                  title="Chatbot Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
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

            {/* Settings Panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-4 py-3.5 space-y-3"
                >
                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                      Provider
                    </label>
                    <select
                      value={provider}
                      onChange={e => {
                        const nextProv = e.target.value as any;
                        setProvider(nextProv);
                        // Auto-populate default model
                        if (nextProv === 'gemini') {
                          setModel('gemini-2.0-flash-lite');
                        } else if (nextProv === 'groq') {
                          setModel('llama3-8b-8192');
                        } else {
                          setModel('openrouter/free');
                        }
                      }}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none transition-all"
                    >
                      <option value="openrouter">OpenRouter (No Region Blocks)</option>
                      <option value="gemini">Google Gemini (Direct)</option>
                      <option value="groq">Groq (Ultra Fast)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey === GEMINI_API_KEY ? '' : apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder={provider === 'gemini' ? "Paste key (or leave blank to use default)..." : "Paste your API key..."}
                      className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-wider mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      placeholder="e.g. openrouter/free"
                      className="w-full bg-slate-800 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[9px] text-slate-500 font-medium">
                      {provider === 'openrouter' ? (
                        <>
                          Free key at{' '}
                          <a
                            href="https://openrouter.ai/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-black"
                          >
                            openrouter.ai
                          </a>
                        </>
                      ) : provider === 'groq' ? (
                        <>
                          Free key at{' '}
                          <a
                            href="https://console.groq.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-black"
                          >
                            console.groq.com
                          </a>
                        </>
                      ) : (
                        <>
                          Free key at{' '}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-black"
                          >
                            Google AI Studio
                          </a>
                        </>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        const trimmedKey = apiKey.trim();
                        const trimmedModel = model.trim();

                        localStorage.setItem('spotfinder_chat_provider', provider);
                        
                        if (trimmedKey && trimmedKey !== GEMINI_API_KEY) {
                          localStorage.setItem('spotfinder_chat_api_key', trimmedKey);
                        } else {
                          localStorage.removeItem('spotfinder_chat_api_key');
                          if (provider === 'gemini') {
                            setApiKey(GEMINI_API_KEY);
                          } else {
                            setApiKey('');
                          }
                        }

                        if (trimmedModel) {
                          localStorage.setItem('spotfinder_chat_model', trimmedModel);
                        } else {
                          localStorage.removeItem('spotfinder_chat_model');
                        }

                        setShowSettings(false);
                      }}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                    >
                      Save Settings
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
