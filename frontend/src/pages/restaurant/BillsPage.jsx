import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/common/DataTable';
import { billsApi } from '@/lib/api';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

export default function BillsPage() {
  const tenantEnabled = useTenantQueryEnabled();
  const { data, isLoading } = useQuery({
    queryKey: useTenantQueryKey('bills'),
    queryFn: () => billsApi.getAll().then((r) => r.data),
    enabled: tenantEnabled,
  });

  const columns = [
    { key: 'billNumber', label: 'Bill #' },
    { key: 'order', label: 'Order', render: (r) => r.order?.orderNumber },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bills</h1>
        <p className="text-muted-foreground">View and manage customer bills</p>
      </div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} emptyTitle="No bills" />
    </div>
  );
}
