import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ArrowRight } from 'lucide-react';

interface Slide {
  title: string;
  description: string;
  illustration: React.ReactNode;
}

export function WelcomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides: Slide[] = [
    {
      title: "Find Your Ideal Space",
      description: "Browse a selection of unique and professional coworking spaces in Tunisia, perfectly suited to your work style.",
      illustration: (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Laptop background and network connections */}
          <rect x="40" y="70" width="120" height="70" rx="8" stroke="#00C4CC" strokeWidth="3" fill="#E6FFFA" />
          <line x1="30" y1="140" x2="170" y2="140" stroke="#718096" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 140L90 152H110L120 140" stroke="#718096" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          
          <path d="M50 50H100V70" stroke="#718096" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M150 40V70" stroke="#718096" strokeWidth="1.5" />
          <circle cx="150" cy="35" r="5" fill="#FF9F43" />
          <path d="M100 50L130 50" stroke="#718096" strokeWidth="1.5" />
          
          <line x1="60" y1="90" x2="140" y2="90" stroke="#00C4CC" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="70" y1="105" x2="130" y2="105" stroke="#FF9F43" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="120" x2="110" y2="120" stroke="#00C4CC" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )
    },
    {
      title: "Google Maps Navigation",
      description: "View the exact location of each space on our interactive map and plan your route in one click on Google Maps.",
      illustration: (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Map layout on computer screen */}
          <rect x="40" y="70" width="120" height="70" rx="8" stroke="#00C4CC" strokeWidth="3" fill="#E6FFFA" />
          <line x1="30" y1="140" x2="170" y2="140" stroke="#718096" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 140L90 152H110L120 140" stroke="#718096" strokeWidth="3" strokeLinecap="round" />
 
          <line x1="60" y1="105" x2="140" y2="105" stroke="#A3E2D7" strokeWidth="2" />
          <line x1="90" y1="70" x2="90" y2="140" stroke="#A3E2D7" strokeWidth="2" />
          <line x1="120" y1="70" x2="120" y2="140" stroke="#A3E2D7" strokeWidth="2" />
 
          {/* Large glowing pointer */}
          <g transform="translate(100, 75)">
            <path d="M0 -30 C-12 -30 -20 -22 -20 -10 C-20 5 0 25 0 25 C0 25 20 5 20 -10 C20 -22 12 -30 0 -30 Z" fill="#FF9F43" stroke="#FFF" strokeWidth="2" />
            <circle cx="0" cy="-10" r="6" fill="#FFF" />
          </g>
        </svg>
      )
    },
    {
      title: "Simplified Bookings",
      description: "Book your desk or room by the hour or by the day, track your expenses in Dinars (DT) and optimize your productivity.",
      illustration: (
        <svg className="w-48 h-48 mx-auto" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Calendar agenda list layout */}
          <rect x="55" y="45" width="90" height="110" rx="10" stroke="#718096" strokeWidth="3" fill="#FFF" />
          <rect x="75" y="35" width="50" height="15" rx="5" stroke="#718096" strokeWidth="3" fill="#E2E8F0" />
          
          <rect x="70" y="65" width="20" height="20" rx="3" stroke="#00C4CC" strokeWidth="2.5" fill="#E6FFFA" />
          <rect x="110" y="65" width="20" height="20" rx="3" stroke="#00C4CC" strokeWidth="2.5" />
          <rect x="70" y="100" width="20" height="20" rx="3" stroke="#00C4CC" strokeWidth="2.5" />
          <rect x="110" y="100" width="20" height="20" rx="3" stroke="#FF9F43" strokeWidth="2.5" fill="#FFEFE6" />
 
          {/* Measuring tools */}
          <rect x="45" y="135" width="110" height="15" rx="2" stroke="#FF9F43" strokeWidth="2" fill="#FFEFE6" />
          <line x1="60" y1="135" x2="60" y2="142" stroke="#FF9F43" strokeWidth="1.5" />
          <line x1="75" y1="135" x2="75" y2="145" stroke="#FF9F43" strokeWidth="1.5" />
          <line x1="90" y1="135" x2="90" y2="142" stroke="#FF9F43" strokeWidth="1.5" />
          <line x1="105" y1="135" x2="105" y2="145" stroke="#FF9F43" strokeWidth="1.5" />
          <line x1="120" y1="135" x2="120" y2="142" stroke="#FF9F43" strokeWidth="1.5" />
          <line x1="135" y1="135" x2="135" y2="145" stroke="#FF9F43" strokeWidth="1.5" />
 
          {/* Pencil */}
          <path d="M40 50L45 120L35 120Z" fill="#FF9F43" stroke="#718096" strokeWidth="2" />
          <rect x="35" y="55" width="10" height="55" fill="#FFEFE6" stroke="#718096" strokeWidth="2" />
        </svg>
      )
    }
  ];
 
  const handleSkipOrFinish = () => {
    localStorage.setItem('cowork_onboarding_completed', 'true');
    navigate('/dashboard');
  };
 
  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleSkipOrFinish();
    }
  };
 
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-white via-indigo-50/15 to-white relative overflow-hidden select-none">
      {/* Decorative ultra-vibrant glowing ambient blobs */}
      <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-[30%] left-[60%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none" />
 
      {/* Main card mockup - Elevated to high-fidelity luxury light theme */}
      <div className="relative w-full max-w-[380px] min-h-[580px] bg-white rounded-[40px] shadow-[0_25px_60px_rgba(79,70,229,0.12)] border-2 border-slate-200/80 p-8 flex flex-col justify-between overflow-hidden">
        
        {/* Swiper content block with transitions */}
        <div className="flex-1 flex flex-col justify-between py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 120, damping: 15 }}
              className="flex-1 flex flex-col justify-between text-center space-y-6"
            >
              {/* Top Illustration container */}
              <div className="flex items-center justify-center h-48 relative">
                {slides[currentSlide].illustration}
              </div>
 
              {/* Title and descriptions */}
              <div className="space-y-3.5">
                <h2 className="text-xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                  {slides[currentSlide].title}
                </h2>
                <p className="text-slate-700 text-xs font-bold px-4 leading-relaxed max-w-[290px] mx-auto">
                  {slides[currentSlide].description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
 
        {/* Action Bottom Section - Navigation dots and triggers */}
        <div className="space-y-6 pt-4 flex flex-col items-center">
          {/* Indicator dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? "bg-indigo-600 w-6" 
                    : "bg-slate-200 hover:bg-slate-350"
                }`}
              />
            ))}
          </div>
 
          {/* Dynamic Action Trigger Button */}
          <div className="w-full flex items-center justify-center">
            {currentSlide < slides.length - 1 ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkipOrFinish}
                className="py-3 px-10 text-xs font-bold text-indigo-700 bg-indigo-50/70 border border-indigo-100 hover:bg-indigo-100 transition-all rounded-full shadow-sm"
              >
                Skip Intro
              </motion.button>
            ) : null}
 
            {currentSlide === slides.length - 1 ? (
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSkipOrFinish}
                className="py-3.5 px-12 text-sm font-black text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg shadow-indigo-500/25 hover:brightness-105 transition-all flex items-center gap-2"
              >
                Get Started
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </motion.button>
            ) : null}
          </div>
 
          {/* Swipe next chevron utility */}
          {currentSlide < slides.length - 1 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="absolute right-6 bottom-8 w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:brightness-105 transition-all"
            >
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
