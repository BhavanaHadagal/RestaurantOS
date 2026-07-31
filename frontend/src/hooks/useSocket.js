import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '@/stores/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket() {
  const { accessToken } = useAuthStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  useEffect(() => {
    if (!accessToken) return;

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join-dashboard');
    });

    socket.on('new-order', (order) => {
      addNotification({
        title: 'New Order',
        message: `Order ${order.orderNumber} received`,
        type: 'ORDER',
      });
    });

    socket.on('low-stock-alert', (data) => {
      addNotification({
        title: 'Low Stock Alert',
        message: `${data.count} items below minimum stock`,
        type: 'STOCK',
      });
    });

    socket.on('kitchen-update', () => {
      // Kitchen updates handled by page-level refetch
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, addNotification]);
}
