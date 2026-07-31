import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0b] py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 font-bold text-white">
                R
              </div>
              <span className="text-lg font-semibold text-white">RestaurantOS</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-zinc-500">
              The all-in-one AI platform that handles restaurant operations so you can focus on the food and the people.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Features</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li><a href="#preview" className="hover:text-orange-400 transition-colors">Product</a></li>
              <li><a href="#features" className="hover:text-orange-400 transition-colors">Features</a></li>
              <li><a href="#platform" className="hover:text-orange-400 transition-colors">Platform</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white">Account</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-500">
              <li><Link to="/login" className="hover:text-orange-400 transition-colors">Sign in</Link></li>
              <li><Link to="/signup" className="hover:text-orange-400 transition-colors">Sign up</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-zinc-600">
          © {new Date().getFullYear()} RestaurantOS. Built for restaurant owners, by people who get it.
        </div>
      </div>
    </footer>
  );
}
