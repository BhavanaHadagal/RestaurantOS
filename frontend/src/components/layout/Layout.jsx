import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore } from '@/stores/authStore';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/rbac';

export function DashboardLayout() {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const permissions = useAuthStore((s) => s.permissions);
  const getRole = useAuthStore((s) => s.getRole);
  const role = getRole();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!canAccessRoute(location.pathname, permissions, role)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function DashboardHomeRedirect() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const getRole = useAuthStore((s) => s.getRole);
  if (!accessToken) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRouteForRole(getRole())} replace />;
}
