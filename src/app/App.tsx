/**
 * @file App.tsx
 * @description Root application component that manages the entry state, 
 * including displaying a splash screen before rendering the main application router.
 */

import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import SplashScreen from './components/SplashScreen';
import { AnimatePresence, motion } from 'motion/react';

/**
 * Root App component.
 * Displays the SplashScreen for 5 seconds upon loading, then renders the RouterProvider.
 * 
 * @function App
 * @returns {JSX.Element} The rendered React component.
 */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" />
      ) : (
        <motion.div
          key="app-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full min-h-screen"
        >
          <RouterProvider router={router} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}