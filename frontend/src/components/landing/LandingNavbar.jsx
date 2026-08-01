import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navLinks = [
  { label: 'Product', href: '#preview' },
  { label: 'Features', href: '#features' },
  { label: 'Platform', href: '#platform' },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a0b]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white shadow-lg shadow-orange-500/25">
            R
          </div>
          <span className="text-lg font-semibold text-white">RestaurantOS</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-6 lg:gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 transition-colors hover:text-white whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
          <Button asChild variant="ghost" className="text-zinc-300 hover:text-white hover:bg-white/10">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 hover:opacity-90 shadow-lg shadow-orange-500/20">
            <Link to="/signup">Sign up</Link>
          </Button>
        </div>

        <button
          type="button"
          className="ml-auto shrink-0 text-white md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border-t border-white/10 bg-[#0a0a0b] px-4 py-4 md:hidden"
        >
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-zinc-400 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="outline" className="w-full border-zinc-700 text-white">
              <Link to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
            </Button>
            <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-amber-500">
              <Link to="/signup" onClick={() => setMobileOpen(false)}>Sign up</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
