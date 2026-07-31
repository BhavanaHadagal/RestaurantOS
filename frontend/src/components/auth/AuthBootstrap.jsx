import { useEffect } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/rbac';

/**
 * Rehydrates user profile (role + permissions) when the persisted store is stale.
 */
export function AuthBootstrap({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!accessToken) return;

    const role = getUserRole(user, accessToken);
    const needsRefresh = !role || !permissions?.length || !user?.role?.name;

    if (!needsRefresh) return;

    authApi
      .getProfile()
      .then((res) => updateUser(res.data.data))
      .catch(() => {
        /* profile fetch failed — JWT fallbacks still apply */
      });
  }, [accessToken, user, permissions, updateUser]);

  return children;
}
