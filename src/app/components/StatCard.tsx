import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon | React.ComponentType<any>;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';
  delay?: number;
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-blue-400/20',
    glow: 'hover:shadow-blue-500/30 hover:border-blue-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-400/20',
    glow: 'hover:shadow-emerald-500/30 hover:border-emerald-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
  purple: {
    bg: 'bg-gradient-to-br from-fuchsia-600 to-purple-700 text-white border-purple-400/20',
    glow: 'hover:shadow-purple-500/30 hover:border-purple-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
  orange: {
    bg: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-400/20',
    glow: 'hover:shadow-amber-500/30 hover:border-amber-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
  red: {
    bg: 'bg-gradient-to-br from-rose-500 to-red-600 text-white border-rose-400/20',
    glow: 'hover:shadow-rose-500/30 hover:border-rose-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-rose-600 text-white border-pink-400/20',
    glow: 'hover:shadow-pink-500/30 hover:border-pink-400',
    iconBg: 'bg-white/20 text-white shadow-none backdrop-blur-md',
  },
};

export function StatCard({ title, value, icon: Icon, color, delay = 0, onClick }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 80, damping: 15, delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => {
        console.log('StatCard clicked. Title:', title, 'Has onClick:', !!onClick);
        if (onClick) onClick();
      }}
      className={`rounded-3xl p-6 border shadow-lg ${colors.bg} ${colors.glow} transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Decorative absolute glow blob */}
      <div className="absolute -right-12 -top-12 w-24 h-24 rounded-full blur-2xl opacity-20 bg-white" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{title}</span>
        <div className={`p-3 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="relative z-10">
        <motion.p
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 100, delay: delay + 0.15 }}
          className="text-3xl font-black text-white tracking-tight"
        >
          {value}
        </motion.p>
      </div>
    </motion.div>
  );
}
