import { motion } from 'framer-motion';
import {
  LayoutDashboard, ChefHat, Sparkles, TrendingUp, ShoppingBag,
  AlertTriangle, Brain, DollarSign,
} from 'lucide-react';

function ScreenFrame({ title, icon: Icon, children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay }}
      className={`flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <Icon className="h-3.5 w-3.5 text-orange-400" />
        <span className="text-xs font-medium text-zinc-300">{title}</span>
      </div>
      <div className="flex-1 p-3">{children}</div>
    </motion.div>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-500">Good evening, Raj</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Revenue', value: '₹2.4L', icon: TrendingUp },
          { label: 'Orders', value: '47', icon: ShoppingBag },
          { label: 'Occupancy', value: '78%', icon: ChefHat },
          { label: 'Low stock', value: '3', icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 bg-zinc-900/80 p-2">
            <s.icon className="mb-1 h-3 w-3 text-orange-400" />
            <p className="text-sm font-bold text-white">{s.value}</p>
            <p className="text-[9px] text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-2">
        <p className="mb-1.5 text-[9px] text-zinc-500">Revenue trend</p>
        <div className="flex h-8 items-end gap-0.5">
          {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-orange-600 to-amber-400"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function KitchenPreview() {
  const tickets = [
    { id: 'ROS-1042', item: 'Butter Chicken ×2', status: 'Preparing', tone: 'bg-amber-500/20 text-amber-300' },
    { id: 'ROS-1043', item: 'Masala Dosa', status: 'New', tone: 'bg-orange-500/20 text-orange-300' },
    { id: 'ROS-1041', item: 'Veg Biryani', status: 'Ready', tone: 'bg-emerald-500/20 text-emerald-300' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-zinc-500">12 active orders</p>
      {tickets.map((t) => (
        <div
          key={t.id}
          className="rounded-lg border border-white/5 bg-zinc-900/80 px-2.5 py-2"
        >
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-medium text-white">{t.id}</p>
              <p className="truncate text-[9px] text-zinc-500">{t.item}</p>
            </div>
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-medium ${t.tone}`}>
              {t.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AiPreview() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {['Stock', 'Pricing', 'Waste'].map((tab, i) => (
          <span
            key={tab}
            className={`rounded-md px-2 py-0.5 text-[8px] font-medium ${
              i === 1 ? 'bg-orange-500/25 text-orange-200' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {tab}
          </span>
        ))}
      </div>
      <div className="rounded-lg border border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-transparent p-2.5">
        <div className="flex items-center gap-1.5 text-[9px] text-orange-300">
          <DollarSign className="h-3 w-3" />
          Menu pricing
        </div>
        <p className="mt-1 text-[10px] font-medium leading-snug text-white">
          Raise Paneer Tikka by ₹20
        </p>
        <p className="mt-0.5 text-[9px] text-zinc-400">Est. +₹4,200/month</p>
      </div>
      <div className="rounded-lg border border-white/5 bg-zinc-900/80 p-2.5">
        <div className="flex items-center gap-1.5 text-[9px] text-zinc-400">
          <Brain className="h-3 w-3 text-orange-400" />
          Invoice OCR
        </div>
        <p className="mt-1 text-[10px] text-zinc-300">MY COMPANY · ₹1,470 extracted</p>
      </div>
    </div>
  );
}

export function HeroShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="relative mx-auto max-w-5xl px-2"
    >
      <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-orange-500/10 via-transparent to-transparent blur-3xl" />

      <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
        <ScreenFrame title="Dashboard" icon={LayoutDashboard} delay={0.35} className="sm:-rotate-1 sm:translate-y-1">
          <DashboardPreview />
        </ScreenFrame>
        <ScreenFrame title="Kitchen Queue" icon={ChefHat} delay={0.45} className="sm:z-10 sm:scale-[1.03]">
          <KitchenPreview />
        </ScreenFrame>
        <ScreenFrame title="AI Center" icon={Sparkles} delay={0.55} className="sm:rotate-1 sm:translate-y-1">
          <AiPreview />
        </ScreenFrame>
      </div>
    </motion.div>
  );
}

export function FeatureMockup({ image, alt, reverse = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: reverse ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
    >
      <img src={image} alt={alt} className="h-64 w-full object-cover sm:h-80" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
    </motion.div>
  );
}
