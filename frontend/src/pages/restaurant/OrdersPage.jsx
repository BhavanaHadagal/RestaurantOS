import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/common/DataTable';
import { Select } from '@/components/ui/Select';
import { ordersApi } from '@/lib/api';

const STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];

export default function OrdersPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.getAll({ limit: 20 }).then((r) => r.data),
    refetchInterval: 15000,
  });

  const updateStatus = async (id, status) => {
    await ordersApi.updateStatus(id, status);
    refetch();
  };

  const columns = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'type', label: 'Type', hideOnMobile: true },
    { key: 'table', label: 'Table', render: (r) => r.table?.number || '-' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: (r) => formatDate(r.createdAt), hideOnMobile: true },
    {
      key: 'actions',
      label: 'Update Status',
      render: (r) => (
        <Select
          value={r.status}
          onChange={(e) => updateStatus(r.id, e.target.value)}
          className="min-w-[140px] h-9 text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Manage and track all orders</p>
      </div>
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={data?.pagination}
        emptyTitle="No orders yet"
        emptyDescription="Orders will appear here when created."
      />
    </div>
  );
}
