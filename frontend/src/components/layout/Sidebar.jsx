import { NavLink, useLocation } from 'react-router-dom';
import {
  ChevronLeft, LayoutDashboard, ShoppingBag, Grid3X3, CalendarDays, UtensilsCrossed,
  BookOpen, Truck, Package, Receipt, Users, Sparkles, BarChart3, Settings,
  ChefHat, CreditCard, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavForRole } from '@/lib/rbac';
import { useAuthStore, useSidebarStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

const NAV_ICONS = {
  Dashboard: LayoutDashboard,
  Orders: ShoppingBag,
  Tables: Grid3X3,
  Reservations: CalendarDays,
  Menu: UtensilsCrossed,
  'Recipes & Ingredients': BookOpen,
  Suppliers: Truck,
  Inventory: Package,
  Expenses: Receipt,
  Staff: Users,
  'AI Center': Sparkles,
  'AI Alerts': Sparkles,
  Reports: BarChart3,
  Settings: Settings,
  Billing: CreditCard,
  Payments: Wallet,
  Sales: BarChart3,
  'Kitchen Dashboard': ChefHat,
};

const LOGO_URL = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=64&h=64&fit=crop&q=80';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const getRole = useAuthStore((s) => s.getRole);
  const { isOpen, toggle, isMobileOpen, closeMobile } = useSidebarStore();
  const role = getRole();
  const navItems = getNavForRole(role).filter((item) => hasPermission(item.permission));

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 h-16 border-b">
        <img
          src={LOGO_URL}
          alt="RestaurantOS"
          className="h-9 w-9 rounded-lg object-cover shrink-0 ring-2 ring-primary/20"
        />
        {(isOpen || isMobileOpen) && (
          <div className="min-w-0">
            <span className="font-semibold text-lg block truncate">RestaurantOS</span>
            {role && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</span>
            )}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = NAV_ICONS[item.label] || LayoutDashboard;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobile}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {(isOpen || isMobileOpen) && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t hidden lg:block">
        <Button variant="ghost" size="sm" onClick={toggle} className="w-full justify-center">
          <ChevronLeft className={cn('h-4 w-4 transition-transform', !isOpen && 'rotate-180')} />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-40 h-screen border-r bg-background transition-all duration-300',
          isOpen ? 'w-64' : 'w-16',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function Breadcrumb() {
  const location = useLocation();
  const labels = {
    dashboard: 'Dashboard',
    tables: 'Tables',
    reservations: 'Reservations',
    menu: 'Menu',
    orders: 'Orders',
    kitchen: 'Kitchen Queue',
    customers: 'Customers',
    bills: 'Bills',
    payments: 'Payments',
    inventory: 'Inventory',
    products: 'Products',
    stock: 'Stock',
    purchases: 'Purchase Orders',
    suppliers: 'Suppliers',
    ingredients: 'Ingredients',
    expenses: 'Expenses',
    invoices: 'Invoices',
    reports: 'Reports',
    ai: 'AI Center',
    staff: 'Staff',
    settings: 'Settings',
  };

  const segments = location.pathname.split('/').filter(Boolean);
  const current = segments[segments.length - 1];

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground truncate">
      <span className="hidden md:inline">Home</span>
      {segments.length > 0 && (
        <>
          <span className="hidden md:inline">/</span>
          <span className="text-foreground font-medium truncate">
            {labels[current] || current}
          </span>
        </>
      )}
    </nav>
  );
}
