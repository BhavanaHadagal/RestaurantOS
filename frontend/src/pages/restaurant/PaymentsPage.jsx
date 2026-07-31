import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { DataTable } from '@/components/common/DataTable';
import { paymentsApi } from '@/lib/api';

export default function PaymentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.getAll().then((r) => r.data),
  });

  const columns = [
    { key: 'bill', label: 'Bill', render: (r) => r.bill?.billNumber },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'method', label: 'Method' },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">Payment transaction records</p>
      </div>
      <DataTable columns={columns} data={data?.data || []} isLoading={isLoading} emptyTitle="No payments" />
    </div>
  );
}
