import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthBootstrap } from '@/components/auth/AuthBootstrap';
import { DashboardLayout } from '@/components/layout/Layout';
import ForbiddenPage from '@/pages/ForbiddenPage';
import { useThemeStore } from '@/stores/authStore';
import { reservationsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { GenericCrudPage } from '@/pages/GenericCrudPage';

import LandingPage from '@/pages/landing/LandingPage';
import LoginPage from '@/pages/auth/LoginPage';
import SignupPage from '@/pages/auth/SignupPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import TablesPage from '@/pages/restaurant/TablesPage';
import CustomersPage from '@/pages/restaurant/CustomersPage';
import SuppliersPage from '@/pages/restaurant/SuppliersPage';
import IngredientsPage from '@/pages/restaurant/IngredientsPage';
import OrdersPage from '@/pages/restaurant/OrdersPage';
import KitchenPage from '@/pages/restaurant/KitchenPage';
import MenuPage from '@/pages/restaurant/MenuPage';
import BillsPage from '@/pages/restaurant/BillsPage';
import PaymentsPage from '@/pages/restaurant/PaymentsPage';
import ProductsPage from '@/pages/inventory/ProductsPage';
import StockPage from '@/pages/inventory/StockPage';
import PurchasesPage from '@/pages/inventory/PurchasesPage';
import ExpensesPage from '@/pages/finance/ExpensesPage';
import InvoicesPage from '@/pages/finance/InvoicesPage';
import ReportsPage from '@/pages/finance/ReportsPage';
import AIPage from '@/pages/ai/AIPage';
import StaffPage from '@/pages/admin/StaffPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

function ThemeProvider({ children }) {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return children;
}

const reservationColumns = [
  { key: 'customerName', label: 'Customer' },
  { key: 'partySize', label: 'Party Size' },
  { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
  { key: 'time', label: 'Time' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

const reservationFormFields = [
  { name: 'customerName', label: 'Customer Name', required: true },
  { name: 'customerPhone', label: 'Phone', required: true },
  { name: 'customerEmail', label: 'Email', type: 'email' },
  { name: 'partySize', label: 'Party Size', type: 'number', required: true },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'time', label: 'Time', required: true, placeholder: '19:00' },
  { name: 'notes', label: 'Notes', type: 'textarea' },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthBootstrap>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<DashboardLayout />}>
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tables" element={<TablesPage />} />
              <Route
                path="/reservations"
                element={
                  <GenericCrudPage
                    title="Reservations"
                    description="Manage table reservations"
                    api={reservationsApi}
                    queryKey="reservations"
                    columns={reservationColumns}
                    formFields={reservationFormFields}
                  />
                }
              />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/kitchen" element={<KitchenPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/bills" element={<BillsPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/inventory/products" element={<ProductsPage />} />
              <Route path="/inventory/stock" element={<StockPage />} />
              <Route path="/inventory/purchases" element={<PurchasesPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/ingredients" element={<IngredientsPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/ai" element={<AIPage />} />
              <Route path="/staff" element={<StaffPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </AuthBootstrap>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
