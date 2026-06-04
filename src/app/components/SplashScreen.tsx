/**
 * @file SplashScreen.tsx
 * @description Renders a beautifully animated initial splash screen.
 * Displays the SpotFinder branding logo, animated typography, and a progress loader.
 */

import { motion } from 'motion/react';
import appLogo from '../../assets/logo.png';

/**
 * SplashScreen component.
 * Displays the animated application loading splash interface.
 * 
 * @function SplashScreen
 * @returns {JSX.Element}
 */
export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100 select-none overflow-hidden"
    >
      {/* Decorative ambient glowing blobs */}
      <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />

      {/* Main Centered Container */}
      <div className="relative flex flex-col items-center space-y-6 text-center z-10 px-6">
        
        {/* Animated App Logo Wrapper */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15,
            delay: 0.2
          }}
          className="relative"
        >
          {/* Logo outer glowing ring */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[32px] blur-xl opacity-25 scale-110 animate-pulse" />
          
          {/* Premium Logo Frame */}
          <div className="relative w-28 h-28 bg-white rounded-[32px] shadow-[0_20px_50px_rgba(79,70,229,0.15)] border-2 border-slate-100 p-2 flex items-center justify-center">
            <motion.img 
              src={appLogo} 
              alt="SpotFinder Logo" 
              className="w-full h-full object-contain rounded-2xl"
              animate={{ 
                y: [0, -6, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </div>
        </motion.div>

        {/* Text Container */}
        <div className="space-y-2">
          {/* App Name */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent tracking-tight font-sans drop-shadow-sm"
          >
            SpotFinder
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="text-slate-650 text-xs font-bold uppercase tracking-[0.2em]"
          >
            Find Your Coworking Oasis
          </motion.p>
        </div>

        {/* Dynamic Loading/Progress Indicator (5 seconds duration) */}
        <div className="w-40 h-[4px] bg-slate-200/80 rounded-full overflow-hidden mt-8 relative border border-slate-100 shadow-inner">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 4.3, // fill up right before the full 5 second exit
              ease: "easeInOut",
              delay: 0.4
            }}
            className="h-full bg-gradient-to-r from-indigo-550 to-purple-550 rounded-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
