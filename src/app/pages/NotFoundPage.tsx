/**
 * @file NotFoundPage.tsx
 * @description Standard 404 error page. Displays a user-friendly error message
 * when routing to an undefined path and provides navigation back to the dashboard overview.
 */

import { Link } from 'react-router';
import { Home, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

/**
 * 404 Not Found Page Component.
 * 
 * @function NotFoundPage
 * @returns {JSX.Element}
 */
export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950 select-none">
      {/* Premium ambient backdrop glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[15%] -left-[15%] w-[60%] h-[60%] rounded-full bg-rose-500/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 90 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-8 text-center relative overflow-hidden">
          {/* Subtle glowing corner */}
          <div className="absolute right-0 top-0 w-24 h-24 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-full blur-2xl opacity-10 -mr-6 -mt-6" />

          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-rose-500 to-rose-600 text-white rounded-3xl mb-6 shadow-lg shadow-rose-500/20 animate-bounce" style={{ animationDuration: '3s' }}>
            <HelpCircle className="w-10 h-10" />
          </div>

          <h1 className="text-7xl font-black bg-gradient-to-r from-rose-500 to-indigo-600 bg-clip-text text-transparent tracking-tighter mb-2">
            404
          </h1>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight mb-3">
            Oops! Page Not Found
          </h2>
          <p className="text-slate-300 text-xs font-semibold px-4 leading-relaxed mb-8">
            The coworking space or page you are looking for seems to be missing or has been relocated to another dimension.
          </p>

          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
            {/* Link routing back to the main dashboard */}
            <Link
              to="/dashboard"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Home className="w-4.5 h-4.5" />
              Back to Dashboard
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

