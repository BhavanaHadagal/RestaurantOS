import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { canAccessRoute, getDefaultRouteForRole } from '@/lib/rbac';

export function ProtectedRoute({ children, permission, permissions: requiredPerms }) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const permissions = useAuthStore((s) => s.permissions);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const hasAnyPermission = useAuthStore((s) => s.hasAnyPermission);
  const getRole = useAuthStore((s) => s.getRole);
  const role = getRole();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/403" replace />;
  }

  if (requiredPerms && !hasAnyPermission(requiredPerms)) {
    return <Navigate to="/403" replace />;
  }

  if (!canAccessRoute(location.pathname, permissions, role)) {
    return <Navigate to="/403" replace />;
  }

  return children;
}

export function RoleRedirect() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const getRole = useAuthStore((s) => s.getRole);

  if (!accessToken) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRouteForRole(getRole())} replace />;
}
