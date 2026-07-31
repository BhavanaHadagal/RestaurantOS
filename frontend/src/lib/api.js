import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          useAuthStore.getState().setTokens(data.data.accessToken, data.data.refreshToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  getProfile: () => api.get('/auth/profile'),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getCharts: (period) => api.get('/dashboard/charts', { params: { period } }),
};

export const createCrudApi = (resource) => ({
  getAll: (params) => api.get(`/${resource}`, { params }),
  getById: (id) => api.get(`/${resource}/${id}`),
  create: (data) => api.post(`/${resource}`, data),
  update: (id, data) => api.put(`/${resource}/${id}`, data),
  delete: (id) => api.delete(`/${resource}/${id}`),
});

export const ordersApi = {
  ...createCrudApi('orders'),
  getKitchenQueue: () => api.get('/orders/kitchen'),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updateItemStatus: (orderId, itemId, status) =>
    api.patch(`/orders/${orderId}/items/${itemId}/status`, { status }),
};

export const billsApi = {
  getAll: (params) => api.get('/bills', { params }),
  create: (orderId) => api.post('/bills', { orderId }),
};

export const paymentsApi = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};

export const stockApi = {
  getLevels: () => api.get('/stock'),
  stockIn: (data) => api.post('/stock/in', data),
  stockOut: (data) => api.post('/stock/out', data),
  getMovements: (params) => api.get('/stock/movements', { params }),
  recordExpired: (data) => api.post('/stock/expired', data),
  recordDamaged: (data) => api.post('/stock/damaged', data),
};

export const purchaseOrdersApi = {
  getAll: (params) => api.get('/purchase-orders', { params }),
  create: (data) => api.post('/purchase-orders', data),
  updateStatus: (id, status) => api.patch(`/purchase-orders/${id}/status`, { status }),
};

export const aiApi = {
  getShortage: () => api.get('/ai/shortage'),
  getReorder: () => api.get('/ai/reorder'),
  getPricing: () => api.get('/ai/pricing'),
  getPrepTime: (menuItemId) => api.get(`/ai/prep-time/${menuItemId}`),
  getWaste: () => api.get('/ai/waste'),
  getInsights: () => api.get('/ai/insights'),
  predictShortages: () => api.post('/ai/predict-shortages'),
  recommendStock: () => api.post('/ai/recommend-stock'),
  menuPricing: () => api.post('/ai/menu-pricing'),
  preparationTime: (menuItemId) => api.post('/ai/preparation-time', { menuItemId }),
  wasteAnalysis: () => api.post('/ai/waste-analysis'),
};

export const invoicesApi = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  getDashboard: () => api.get('/ai/invoices/dashboard'),
  upload: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  uploadMultiple: (files, onProgress) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/ai/invoice/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
  },
  update: (id, data) => api.put(`/invoices/${id}`, data),
  approve: (id) => api.patch(`/invoices/${id}/approve`),
  reject: (id, reason) => api.patch(`/invoices/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/invoices/${id}`),
  exportRegister: (params) =>
    api.get('/ai/invoices/export/excel', { params, responseType: 'blob' }),
};

export const reportsApi = {
  sales: (params) => api.get('/reports/sales', { params }),
  expenses: (params) => api.get('/reports/expenses', { params }),
  inventory: () => api.get('/reports/inventory'),
  suppliers: () => api.get('/reports/suppliers'),
  profit: (params) => api.get('/reports/profit', { params }),
  export: (type, params) =>
    api.get(`/reports/${type}/export`, { params, responseType: 'blob' }),
};

export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const staffApi = createCrudApi('staff');
export const tablesApi = createCrudApi('tables');
export const reservationsApi = createCrudApi('reservations');
export const menuCategoriesApi = createCrudApi('menu-categories');
export const menuItemsApi = createCrudApi('menu-items');
export const customersApi = createCrudApi('customers');
export const suppliersApi = createCrudApi('suppliers');
export const ingredientsApi = createCrudApi('ingredients');
export const productCategoriesApi = createCrudApi('product-categories');
export const productsApi = createCrudApi('products');
export const warehousesApi = createCrudApi('warehouses');
export const expenseCategoriesApi = createCrudApi('expense-categories');
export const expensesApi = createCrudApi('expenses');
