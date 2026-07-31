const ROLES = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  CHEF: 'Chef',
  WAITER: 'Waiter',
  CASHIER: 'Cashier',
};

const PERMISSIONS = [
  // Dashboard
  { name: 'dashboard.view', module: 'dashboard', action: 'view' },
  { name: 'dashboard.analytics.full', module: 'dashboard', action: 'analytics_full' },
  { name: 'dashboard.analytics.limited', module: 'dashboard', action: 'analytics_limited' },
  { name: 'dashboard.analytics.kitchen', module: 'dashboard', action: 'analytics_kitchen' },
  { name: 'dashboard.analytics.billing', module: 'dashboard', action: 'analytics_billing' },

  // Settings
  { name: 'settings.view', module: 'settings', action: 'view' },
  { name: 'settings.update', module: 'settings', action: 'update' },

  // Staff
  { name: 'staff.view', module: 'staff', action: 'view' },
  { name: 'staff.create', module: 'staff', action: 'create' },
  { name: 'staff.update', module: 'staff', action: 'update' },
  { name: 'staff.delete', module: 'staff', action: 'delete' },
  { name: 'staff.assign_role', module: 'staff', action: 'assign_role' },
  { name: 'staff.reset_password', module: 'staff', action: 'reset_password' },

  // Tables
  { name: 'tables.view', module: 'tables', action: 'view' },
  { name: 'tables.create', module: 'tables', action: 'create' },
  { name: 'tables.update', module: 'tables', action: 'update' },
  { name: 'tables.delete', module: 'tables', action: 'delete' },

  // Reservations
  { name: 'reservations.view', module: 'reservations', action: 'view' },
  { name: 'reservations.create', module: 'reservations', action: 'create' },
  { name: 'reservations.update', module: 'reservations', action: 'update' },
  { name: 'reservations.delete', module: 'reservations', action: 'delete' },

  // Menu
  { name: 'menu.view', module: 'menu', action: 'view' },
  { name: 'menu.create', module: 'menu', action: 'create' },
  { name: 'menu.update', module: 'menu', action: 'update' },
  { name: 'menu.delete', module: 'menu', action: 'delete' },
  { name: 'menu.pricing', module: 'menu', action: 'pricing' },

  // Recipes
  { name: 'recipes.view', module: 'recipes', action: 'view' },
  { name: 'recipes.create', module: 'recipes', action: 'create' },
  { name: 'recipes.update', module: 'recipes', action: 'update' },
  { name: 'recipes.delete', module: 'recipes', action: 'delete' },

  // Orders
  { name: 'orders.view', module: 'orders', action: 'view' },
  { name: 'orders.create', module: 'orders', action: 'create' },
  { name: 'orders.update', module: 'orders', action: 'update' },
  { name: 'orders.delete', module: 'orders', action: 'delete' },
  { name: 'orders.cancel', module: 'orders', action: 'cancel' },

  // Kitchen
  { name: 'kitchen.view', module: 'kitchen', action: 'view' },
  { name: 'kitchen.update', module: 'kitchen', action: 'update' },

  // Customers
  { name: 'customers.view', module: 'customers', action: 'view' },
  { name: 'customers.create', module: 'customers', action: 'create' },
  { name: 'customers.update', module: 'customers', action: 'update' },
  { name: 'customers.delete', module: 'customers', action: 'delete' },

  // Bills & Payments
  { name: 'bills.view', module: 'bills', action: 'view' },
  { name: 'bills.create', module: 'bills', action: 'create' },
  { name: 'bills.update', module: 'bills', action: 'update' },
  { name: 'bills.discount', module: 'bills', action: 'discount' },
  { name: 'payments.view', module: 'payments', action: 'view' },
  { name: 'payments.create', module: 'payments', action: 'create' },

  // Inventory
  { name: 'inventory.view', module: 'inventory', action: 'view' },
  { name: 'inventory.create', module: 'inventory', action: 'create' },
  { name: 'inventory.update', module: 'inventory', action: 'update' },
  { name: 'inventory.delete', module: 'inventory', action: 'delete' },
  { name: 'inventory.stock_in', module: 'inventory', action: 'stock_in' },
  { name: 'inventory.stock_out', module: 'inventory', action: 'stock_out' },

  // Suppliers
  { name: 'suppliers.view', module: 'suppliers', action: 'view' },
  { name: 'suppliers.create', module: 'suppliers', action: 'create' },
  { name: 'suppliers.update', module: 'suppliers', action: 'update' },
  { name: 'suppliers.delete', module: 'suppliers', action: 'delete' },

  // Ingredients
  { name: 'ingredients.view', module: 'ingredients', action: 'view' },
  { name: 'ingredients.create', module: 'ingredients', action: 'create' },
  { name: 'ingredients.update', module: 'ingredients', action: 'update' },
  { name: 'ingredients.delete', module: 'ingredients', action: 'delete' },

  // Expenses
  { name: 'expenses.view', module: 'expenses', action: 'view' },
  { name: 'expenses.create', module: 'expenses', action: 'create' },
  { name: 'expenses.update', module: 'expenses', action: 'update' },
  { name: 'expenses.delete', module: 'expenses', action: 'delete' },

  // Invoices
  { name: 'invoices.view', module: 'invoices', action: 'view' },
  { name: 'invoices.create', module: 'invoices', action: 'create' },
  { name: 'invoices.update', module: 'invoices', action: 'update' },

  // Reports
  { name: 'reports.view', module: 'reports', action: 'view' },
  { name: 'reports.export', module: 'reports', action: 'export' },
  { name: 'reports.sales', module: 'reports', action: 'sales' },
  { name: 'reports.profit', module: 'reports', action: 'profit' },

  // AI
  { name: 'ai.view', module: 'ai', action: 'view' },
  { name: 'ai.invoice', module: 'ai', action: 'invoice' },
  { name: 'ai.stock', module: 'ai', action: 'stock' },
  { name: 'ai.waste', module: 'ai', action: 'waste' },
  { name: 'ai.pricing', module: 'ai', action: 'pricing' },
  { name: 'ai.prep', module: 'ai', action: 'prep' },
  { name: 'ai.shortage', module: 'ai', action: 'shortage' },
  { name: 'ai.insights', module: 'ai', action: 'insights' },
];

const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: PERMISSIONS.map((p) => p.name),

  [ROLES.MANAGER]: [
    'dashboard.view', 'dashboard.analytics.limited',
    'tables.view', 'tables.create', 'tables.update', 'tables.delete',
    'reservations.view', 'reservations.create', 'reservations.update', 'reservations.delete',
    'menu.view', 'menu.create', 'menu.update', 'menu.pricing',
    'recipes.view',
    'ingredients.view',
    'orders.view', 'orders.create', 'orders.update', 'orders.delete',
    'customers.view', 'customers.create', 'customers.update',
    'suppliers.view', 'suppliers.create', 'suppliers.update', 'suppliers.delete',
    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.stock_in', 'inventory.stock_out',
    'expenses.view', 'expenses.create', 'expenses.update',
    'invoices.view',
    'staff.view',
    'reports.view', 'reports.export', 'reports.profit',
    'ai.view', 'ai.invoice', 'ai.stock', 'ai.waste', 'ai.pricing', 'ai.prep', 'ai.shortage', 'ai.insights',
    'kitchen.view',
    'bills.view', 'payments.view',
  ],

  [ROLES.CHEF]: [
    'dashboard.view', 'dashboard.analytics.kitchen',
    'kitchen.view', 'kitchen.update',
    'orders.view', 'orders.update',
    'menu.view',
    'recipes.view',
    'ingredients.view',
    'ai.view', 'ai.prep', 'ai.shortage',
  ],

  [ROLES.WAITER]: [
    'dashboard.view',
    'tables.view', 'tables.update',
    'reservations.view', 'reservations.create', 'reservations.update',
    'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
    'menu.view',
    'customers.view', 'customers.create',
    'payments.view',
  ],

  [ROLES.CASHIER]: [
    'dashboard.view', 'dashboard.analytics.billing',
    'orders.view',
    'bills.view', 'bills.create', 'bills.update', 'bills.discount',
    'payments.view', 'payments.create',
    'reports.view', 'reports.sales',
  ],
};

const ROLE_DEFAULT_ROUTE = {
  [ROLES.OWNER]: '/dashboard',
  [ROLES.MANAGER]: '/dashboard',
  [ROLES.CHEF]: '/kitchen',
  [ROLES.WAITER]: '/dashboard',
  [ROLES.CASHIER]: '/dashboard',
};

const isOwner = (roleName) => roleName === ROLES.OWNER;

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DEFAULT_ROUTE,
  isOwner,
};
