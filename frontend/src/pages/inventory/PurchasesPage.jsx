import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { DataTable } from '@/components/common/DataTable';
import { purchaseOrdersApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';

export default function PurchasesPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.getAll().then((r) => r.data),
  });

  const columns = [
    { key: 'poNumber', label: 'PO #' },
    { key: 'supplier', label: 'Supplier', render: (r) => r.supplier?.name },
    { key: 'totalAmount', label: 'Total', render: (r) => formatCurrency(r.totalAmount) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'orderDate', label: 'Date', render: (r) => formatDate(r.orderDate) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => r.status !== 'RECEIVED' && (
        <Button
          size="sm"
          onClick={async () => {
            await purchaseOrdersApi.updateStatus(r.id, 'RECEIVED');
            refetch();
          }}
        >
          Mark Received
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground">Manage supplier purchase orders</p>
      </div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} emptyTitle="No purchase orders" />
    </div>
  );
}
