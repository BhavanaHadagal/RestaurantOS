const DEFAULT_PRODUCTION_API = 'https://restaurantos-api-w0id.onrender.com/api';
const DEFAULT_PRODUCTION_SOCKET = 'https://restaurantos-api-w0id.onrender.com';

function isVercelHost() {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');
}

export function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return '/api';
  if (isVercelHost()) return DEFAULT_PRODUCTION_API;
  return '/api';
}

export function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  if (isVercelHost()) return DEFAULT_PRODUCTION_SOCKET;
  return 'http://localhost:5000';
}

export const DEMO_LOGIN = {
  email: 'owner@restaurantos.com',
  password: 'Password@123',
};

/** Demo accounts — full dummy data (₹26L revenue, 40 tables, 1000+ orders). Password for all: Password@123 */
export const DEMO_ACCOUNTS = [
  { role: 'Owner', email: 'owner@restaurantos.com', description: 'Full dashboard & all modules' },
  { role: 'Manager', email: 'manager@restaurantos.com', description: 'Operations & reports' },
  { role: 'Chef', email: 'chef@restaurantos.com', description: 'Kitchen queue' },
  { role: 'Waiter', email: 'waiter@restaurantos.com', description: 'Tables & orders' },
  { role: 'Cashier', email: 'cashier@restaurantos.com', description: 'Billing & payments' },
];
