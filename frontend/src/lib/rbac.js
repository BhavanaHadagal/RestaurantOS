export const ROLES = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CHEF: 'Chef',
  WAITER: 'Waiter',
  CASHIER: 'Cashier',
};

export const SIGNUP_ROLE_OPTIONS = [
  {
    value: ROLES.OWNER,
    label: 'Owner',
    description: 'Full access to dashboard, staff, settings, inventory, and AI tools.',
  },
  {
    value: ROLES.MANAGER,
    label: 'Manager',
    description: 'Run daily operations, menu, inventory, invoices, reports, and AI insights.',
  },
  {
    value: ROLES.CHEF,
    label: 'Chef',
    description: 'Kitchen dashboard, orders, recipes, ingredients, and AI alerts.',
  },
  {
    value: ROLES.WAITER,
    label: 'Waiter',
    description: 'Front-of-house access to tables, orders, and menu.',
  },
  {
    value: ROLES.CASHIER,
    label: 'Cashier',
    description: 'Billing, payments, orders, and sales reports.',
  },
];

export function getUserRole(user, accessToken) {
  if (user?.role?.name) return user.role.name;
  if (typeof user?.role === 'string') return user.role;
  if (user?.roleName) return user.roleName;
  if (accessToken) {
    try {
      const base64 = accessToken.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (base64) {
        const payload = JSON.parse(atob(base64));
        if (payload.role) return payload.role;
      }
    } catch {
      /* ignore malformed token */
    }
  }
  return null;
}

export const ROLE_DEFAULT_ROUTE = {
  [ROLES.OWNER]: '/dashboard',
  [ROLES.MANAGER]: '/dashboard',
  [ROLES.CHEF]: '/kitchen',
  [ROLES.WAITER]: '/dashboard',
  [ROLES.CASHIER]: '/dashboard',
};

export const ROUTE_PERMISSIONS = {
  '/dashboard': ['dashboard.view'],
  '/tables': ['tables.view'],
  '/reservations': ['reservations.view'],
  '/menu': ['menu.view'],
  '/orders': ['orders.view'],
  '/kitchen': ['kitchen.view'],
  '/customers': ['customers.view'],
  '/bills': ['bills.view'],
  '/payments': ['payments.view'],
  '/inventory/products': ['inventory.view'],
  '/inventory/stock': ['inventory.view'],
  '/inventory/purchases': ['inventory.view'],
  '/suppliers': ['suppliers.view'],
  '/ingredients': ['ingredients.view'],
  '/expenses': ['expenses.view'],
  '/invoices': ['invoices.view'],
  '/reports': ['reports.view', 'reports.sales'],
  '/ai': ['ai.view'],
  '/staff': ['staff.view'],
  '/settings': ['settings.view'],
};

export const ROLE_NAV = {
  [ROLES.OWNER]: [
    { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
    { to: '/orders', label: 'Orders', permission: 'orders.view' },
    { to: '/tables', label: 'Tables', permission: 'tables.view' },
    { to: '/reservations', label: 'Reservations', permission: 'reservations.view' },
    { to: '/menu', label: 'Menu', permission: 'menu.view' },
    { to: '/ingredients', label: 'Recipes & Ingredients', permission: 'ingredients.view' },
    { to: '/suppliers', label: 'Suppliers', permission: 'suppliers.view' },
    { to: '/inventory/products', label: 'Inventory', permission: 'inventory.view' },
    { to: '/expenses', label: 'Expenses', permission: 'expenses.view' },
    { to: '/invoices', label: 'Invoice Processing', permission: 'invoices.view' },
    { to: '/staff', label: 'Staff', permission: 'staff.view' },
    { to: '/ai', label: 'AI Center', permission: 'ai.view' },
    { to: '/reports', label: 'Reports', permission: 'reports.view' },
    { to: '/settings', label: 'Settings', permission: 'settings.view' },
  ],
  [ROLES.MANAGER]: [
    { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
    { to: '/orders', label: 'Orders', permission: 'orders.view' },
    { to: '/tables', label: 'Tables', permission: 'tables.view' },
    { to: '/reservations', label: 'Reservations', permission: 'reservations.view' },
    { to: '/menu', label: 'Menu', permission: 'menu.view' },
    { to: '/suppliers', label: 'Suppliers', permission: 'suppliers.view' },
    { to: '/inventory/products', label: 'Inventory', permission: 'inventory.view' },
    { to: '/expenses', label: 'Expenses', permission: 'expenses.view' },
    { to: '/invoices', label: 'Invoices', permission: 'invoices.view' },
    { to: '/ai', label: 'AI Center', permission: 'ai.view' },
    { to: '/reports', label: 'Reports', permission: 'reports.view' },
  ],
  [ROLES.CHEF]: [
    { to: '/kitchen', label: 'Kitchen Dashboard', permission: 'kitchen.view' },
    { to: '/orders', label: 'Orders', permission: 'orders.view' },
    { to: '/ingredients', label: 'Recipes & Ingredients', permission: 'ingredients.view' },
    { to: '/ai', label: 'AI Alerts', permission: 'ai.view' },
  ],
  [ROLES.WAITER]: [
    { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
    { to: '/tables', label: 'Tables', permission: 'tables.view' },
    { to: '/orders', label: 'Orders', permission: 'orders.view' },
    { to: '/menu', label: 'Menu', permission: 'menu.view' },
  ],
  [ROLES.CASHIER]: [
    { to: '/dashboard', label: 'Dashboard', permission: 'dashboard.view' },
    { to: '/bills', label: 'Billing', permission: 'bills.view' },
    { to: '/orders', label: 'Orders', permission: 'orders.view' },
    { to: '/payments', label: 'Payments', permission: 'payments.view' },
    { to: '/reports', label: 'Sales', permission: 'reports.sales' },
  ],
};

export function isOwner(user, accessToken) {
  return getUserRole(user, accessToken) === ROLES.OWNER;
}

export function canAccessRoute(pathname, permissions, role) {
  if (pathname === '/403') return true;
  if (role === ROLES.OWNER) return true;

  const routeKey = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!routeKey) return true;

  const required = ROUTE_PERMISSIONS[routeKey];
  return required.some((p) => permissions?.includes(p));
}

export function getDefaultRouteForRole(role) {
  return ROLE_DEFAULT_ROUTE[role] || '/dashboard';
}

export function getNavForRole(role) {
  return ROLE_NAV[role] || ROLE_NAV[ROLES.WAITER];
}

export function canViewDashboardSection(section, permissions, role) {
  if (role === ROLES.OWNER) return true;

  const rules = {
    revenue: ['dashboard.analytics.full', 'dashboard.analytics.limited', 'dashboard.analytics.billing'],
    profit: ['dashboard.analytics.full'],
    expenses: ['dashboard.analytics.full', 'dashboard.analytics.limited'],
    purchases: ['dashboard.analytics.full', 'dashboard.analytics.limited'],
    charts: ['dashboard.analytics.full', 'dashboard.analytics.limited'],
    kitchen: ['dashboard.analytics.kitchen', 'kitchen.view'],
    billing: ['dashboard.analytics.billing'],
    occupancy: ['dashboard.view', 'dashboard.analytics.limited'],
    orders: ['orders.view', 'dashboard.view'],
  };

  const required = rules[section] || ['dashboard.view'];
  return required.some((p) => permissions?.includes(p));
}
