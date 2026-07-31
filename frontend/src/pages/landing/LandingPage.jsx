import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package, Receipt, BarChart3, ChefHat, Users,
  ArrowRight, Check, Star, Sparkles, Clock, Shield, UserPlus, LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { HeroShowcase, FeatureMockup } from '@/components/landing/HeroShowcase';
import { getAvatarUrl } from '@/lib/images';

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 },
};

const features = [
  {
    id: 'ai',
    badge: 'AI Autopilot',
    title: 'Stop reacting. Start preventing.',
    description:
      'Use AI Center to forecast ingredient shortages, tune menu pricing, analyze waste, and read business insights — with invoice OCR built in.',
    bullets: [
      'Ingredient shortage & reorder predictions',
      'Menu pricing optimization',
      'Invoice OCR with confidence scoring',
      'Waste analysis & business insights',
    ],
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80',
    cta: 'Explore AI features',
  },
  {
    id: 'operations',
    badge: 'Operations',
    title: 'Run service without the chaos',
    description:
      'From table management to kitchen queue — keep front-of-house and back-of-house in sync with real-time order updates and status tracking.',
    bullets: [
      'Live kitchen queue with status updates',
      'Tables & reservations management',
      'Real-time order updates via Socket.IO',
      'Bills, payments & customer records',
    ],
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    reverse: true,
    cta: 'See operations',
  },
  {
    id: 'inventory',
    badge: 'Inventory & Costs',
    title: 'Find the money you\'re losing',
    description:
      'Track stock levels, purchase orders, and supplier invoices. AI catches anomalies, duplicate charges, and low-stock situations before they cost you.',
    bullets: [
      'Stock in/out with movement history',
      'Purchase order workflow',
      'Expense tracking & monthly reports',
      'Excel/CSV export for accounting',
    ],
    image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800&q=80',
    cta: 'Manage inventory',
  },
];

const stats = [
  { value: '14', label: 'app modules', sub: 'Dashboard through settings' },
  { value: '5', label: 'staff roles', sub: 'Owner, manager, chef, waiter, cashier' },
  { value: 'AI', label: 'Center built in', sub: 'Stock, pricing, waste & insights' },
  { value: 'Excel', label: '& CSV export', sub: 'Sales and finance reports' },
];

const extras = [
  { icon: ChefHat, title: 'Menu & Recipes', desc: 'Track dishes, ingredients, prep times, and profitability.' },
  { icon: Users, title: 'Staff & RBAC', desc: 'Manage team accounts with role-based access for each job function.' },
  { icon: Receipt, title: 'Invoice Processing', desc: 'Upload PDF or image invoices — OCR extracts every line item.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Sales, expense, profit, and supplier reports with export.' },
  { icon: Package, title: 'Multi-warehouse Stock', desc: 'Track products across locations with par-level alerts.' },
  { icon: Shield, title: 'Enterprise Security', desc: 'JWT auth, RBAC permissions, and activity logging.' },
];


const testimonials = [
  {
    quote: 'Kitchen queue and live order status finally keep our team in sync — front-of-house and back-of-house see the same picture.',
    author: 'Meera Kapoor',
    role: 'Owner, The Copper Pot',
    highlight: 'Kitchen & orders',
  },
  {
    quote: 'Invoice OCR and low-stock alerts caught issues we used to find at month-end. AI Center is part of our daily routine now.',
    author: 'Vikram Singh',
    role: 'General Manager, Harbor & Hearth',
    highlight: 'AI & inventory',
  },
  {
    quote: 'One login for dashboard, staff roles, reports, and billing — we stopped juggling spreadsheets and three different apps.',
    author: 'Anita Desai',
    role: 'Manager, Bloom Café',
    highlight: 'All-in-one platform',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white overflow-x-hidden">
      <LandingNavbar />
      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-orange-500/10 blur-[120px]" />
          <div className="absolute top-20 right-0 h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-300 mb-8"
          >
            <Sparkles className="h-4 w-4" />
            AI-Powered Restaurant Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl"
          >
            Build a restaurant{' '}
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
              that actually thrives.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400"
          >
            Run orders, tables, kitchen, inventory, invoices, and AI insights from one platform —
            with role-based access for every member of your team.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2 text-left"
          >
            <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-b from-orange-500/10 to-zinc-950/40 p-6 transition-colors hover:border-orange-500/40">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
                <UserPlus className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">Create your workspace</h3>
              <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                Register as owner and run your own restaurant data from day one.
              </p>
              <Button
                asChild
                className="mt-5 w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90"
              >
                <Link to="/signup">
                  Sign up
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 transition-colors hover:border-white/20">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
                <LogIn className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">Try the live demo</h3>
              <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                Explore menus, orders, kitchen, inventory, and AI with sample data.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-5 w-full border-zinc-700 bg-zinc-950/60 text-white hover:bg-zinc-800 hover:text-white"
              >
                <Link to="/login">Sign in to demo</Link>
              </Button>
              <p className="mt-3 text-xs text-zinc-600">
                <span className="text-zinc-500">Demo:</span>{' '}
                <span className="font-mono text-zinc-400">owner@restaurantos.com</span>
              </p>
            </div>
          </motion.div>
        </div>

        <div id="preview" className="relative mx-auto mt-16 max-w-7xl px-4 lg:px-8 scroll-mt-24">
          <HeroShowcase />
        </div>
      </section>

      {/* Platform intro */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8 text-center">
          <motion.p {...fadeUp} className="text-sm font-medium text-orange-400 uppercase tracking-wider">The Platform</motion.p>
          <motion.h2 {...fadeUp} className="mt-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Run a more profitable restaurant,{' '}
            <span className="text-zinc-500">starting today</span>
          </motion.h2>
          <motion.p {...fadeUp} className="mx-auto mt-4 max-w-2xl text-zinc-400">
            One login gives you dashboard, operations, inventory, finance, and AI —
            the same modules shown in the app sidebar.
          </motion.p>
        </div>
      </section>

      {/* Feature sections */}
      <section id="features" className="space-y-32 pb-24 scroll-mt-24">
        {features.map((feature) => (
          <div key={feature.id} id={feature.id} className="mx-auto max-w-7xl px-4 lg:px-8 scroll-mt-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <motion.div
                {...fadeUp}
                className={feature.reverse ? 'lg:order-2' : ''}
              >
                <span className="inline-block rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                  {feature.badge}
                </span>
                <h3 className="mt-4 text-3xl font-bold">{feature.title}</h3>
                <p className="mt-4 text-zinc-400 leading-relaxed">{feature.description}</p>
                <ul className="mt-6 space-y-3">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3 text-sm text-zinc-300">
                      <Check className="h-5 w-5 shrink-0 text-orange-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button className="mt-8 bg-white/10 hover:bg-white/15 text-white border border-white/10">
                    {feature.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </motion.div>
              <div className={feature.reverse ? 'lg:order-1' : ''}>
                <FeatureMockup image={feature.image} alt={feature.title} reverse={feature.reverse} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Stats */}
      <section id="platform" className="border-y border-white/5 bg-zinc-950/50 py-24 scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl">What&apos;s in the product</h2>
            <p className="mt-4 text-zinc-400">Real modules and roles — no inflated marketing numbers.</p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-2 font-medium text-white">{stat.label}</p>
                <p className="text-sm text-zinc-500">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Extra features grid */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2 {...fadeUp} className="text-center text-3xl font-bold mb-16">
            Plus everything else you need
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {extras.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 hover:border-orange-500/20 transition-colors"
              >
                <item.icon className="h-8 w-8 text-orange-400 mb-4" />
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 bg-zinc-950/30">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.h2 {...fadeUp} className="text-center text-3xl font-bold mb-4">
            Trusted by restaurant teams
          </motion.h2>
          <motion.p {...fadeUp} className="text-center text-zinc-500 mb-16 max-w-2xl mx-auto">
            Operators use RestaurantOS for kitchen flow, inventory, AI insights, and day-to-day management.
          </motion.p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/50 p-6 lg:p-8"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="flex-1 text-zinc-300 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex items-center gap-3 pt-6 border-t border-white/5">
                  <img
                    src={getAvatarUrl(t.author)}
                    alt={t.author}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-orange-500/30 bg-zinc-800"
                  />
                  <div>
                    <p className="font-semibold text-white text-sm">{t.author}</p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex w-fit rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
                  {t.highlight}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <motion.div
            {...fadeUp}
            className="relative overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-zinc-900 to-amber-500/5 p-12 lg:p-20 text-center"
          >
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80')] bg-cover bg-center opacity-10" />
            <div className="relative">
              <Clock className="h-10 w-10 text-orange-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold sm:text-4xl">Ready to run a smarter restaurant?</h2>
              <p className="mx-auto mt-4 max-w-xl text-zinc-400">
                Sign in to the demo restaurant or create your own workspace — same product, your data.
              </p>
              <div className="mt-8 flex flex-col items-center gap-5">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0"
                >
                  <Link to="/signup">Sign up</Link>
                </Button>
                <p className="text-sm text-zinc-500">
                  Want to explore first?{' '}
                  <Link to="/login" className="font-medium text-zinc-300 hover:text-orange-400 transition-colors">
                    Sign in to the demo
                  </Link>
                </p>
              </div>
              <p className="mt-6 text-sm text-zinc-600">
                No credit card required · Setup in under 5 minutes · Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
