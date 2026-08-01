import { useAuthStore } from '@/stores/authStore';

/** React Query keys scoped to the logged-in user's restaurant workspace. */
export function useTenantQueryKey(baseKey, ...parts) {
  const user = useAuthStore((s) => s.user);
  return [baseKey, user?.id, user?.restaurantId, ...parts];
}

export function useTenantQueryEnabled() {
  const user = useAuthStore((s) => s.user);
  return Boolean(user?.id && user?.restaurantId);
}
