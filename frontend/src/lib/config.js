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

