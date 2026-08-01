import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * Rehydrates user profile (role, permissions, restaurant workspace) on app load.
 */
export function AuthBootstrap({ children }) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (!accessToken) return;

    authApi
      .getProfile()
      .then((res) => {
        updateUser(res.data.data);
        queryClient.clear();
      })
      .catch(() => {
        /* profile fetch failed — JWT fallbacks still apply */
      });
  }, [accessToken, updateUser, queryClient]);

  return children;
}
