import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, Sun, Moon, Menu, LogOut, User, Settings,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Breadcrumb } from '@/components/layout/Sidebar';
import { useAuthStore, useThemeStore, useSidebarStore } from '@/stores/authStore';
import { notificationsApi, authApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';

export function Navbar() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { toggleMobile } = useSidebarStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll({ limit: 10 }).then((r) => r.data),
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // continue logout
    }
    authLogout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleMobile}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden sm:flex items-center gap-1 text-sm text-muted-foreground min-w-0 truncate">
        <Breadcrumb />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." className="w-64 pl-9 h-9" />
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell className="h-4 w-4" />
            {notifData?.unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
                {notifData.unreadCount}
              </span>
            )}
          </Button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border bg-background shadow-lg z-50">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifData?.data?.length ? (
                  notifData.data.map((n) => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer',
                        !n.isRead && 'bg-muted/30'
                      )}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-sm text-muted-foreground text-center">No notifications</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
          >
            <Avatar
              src={user?.avatar}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size="sm"
            />
            <span className="hidden md:block text-sm font-medium">
              {user?.firstName} {user?.lastName}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-background shadow-lg z-50 py-1">
              <button
                onClick={() => { navigate('/settings'); setShowProfile(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
              >
                <User className="h-4 w-4" /> Profile
              </button>
              <button
                onClick={() => { navigate('/settings'); setShowProfile(false); }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
              >
                <Settings className="h-4 w-4" /> Settings
              </button>
              <hr className="my-1" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
