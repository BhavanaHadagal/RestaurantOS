import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUserRole, isOwner as checkIsOwner } from '@/lib/rbac';
import { getRoleFromToken } from '@/lib/jwt';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: [],
      roleName: null,

      setAuth: (user, accessToken, refreshToken) => {
        const roleName = getUserRole(user, accessToken) || getRoleFromToken(accessToken);
        set({
          user,
          accessToken,
          refreshToken,
          permissions: user?.permissions || [],
          roleName,
        });
      },

      setTokens: (accessToken, refreshToken) =>
        set({
          accessToken,
          refreshToken,
          roleName: getRoleFromToken(accessToken) || get().roleName,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          permissions: [],
          roleName: null,
        }),

      updateUser: (user) => {
        const { accessToken } = get();
        const roleName = getUserRole(user, accessToken);
        set({
          user,
          permissions: user?.permissions || [],
          roleName,
        });
      },

      getRole: () => {
        const { user, accessToken, roleName } = get();
        return getUserRole(user, accessToken) || roleName || getRoleFromToken(accessToken);
      },

      isOwner: () => checkIsOwner(get().user, get().accessToken),

      hasPermission: (permission) => {
        const { permissions, user, accessToken } = get();
        if (checkIsOwner(user, accessToken)) return true;
        if (Array.isArray(permission)) {
          return permission.some((p) => permissions.includes(p));
        }
        return permissions.includes(permission);
      },

      hasAnyPermission: (permissionList) => {
        const { permissions, user, accessToken } = get();
        if (checkIsOwner(user, accessToken)) return true;
        return permissionList.some((p) => permissions.includes(p));
      },

      hasRole: (...roles) => {
        const role = get().getRole();
        return roles.includes(role);
      },
    }),
    {
      name: 'restaurantos-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        permissions: state.permissions,
        roleName: state.roleName,
      }),
    }
  )
);

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () =>
        set((state) => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          document.documentElement.classList.toggle('dark', newTheme === 'dark');
          return { theme: newTheme };
        }),
      setTheme: (theme) => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        set({ theme });
      },
    }),
    { name: 'restaurantos-theme' }
  )
);

export const useSidebarStore = create((set) => ({
  isOpen: true,
  isMobileOpen: false,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
  closeMobile: () => set({ isMobileOpen: false }),
}));

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) =>
    set({ notifications, unreadCount }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
}));
