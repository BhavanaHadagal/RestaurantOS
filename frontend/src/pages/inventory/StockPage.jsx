import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { CrudForm } from '@/components/common/CrudForm';
import { stockApi } from '@/lib/api';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

export default function StockPage() {
  const [modalType, setModalType] = useState(null);
  const tenantEnabled = useTenantQueryEnabled();
  const { data: stock, isLoading, refetch } = useQuery({
    queryKey: useTenantQueryKey('stock-levels'),
    queryFn: () => stockApi.getLevels().then((r) => r.data.data),
    enabled: tenantEnabled,
  });

  const { data: movements } = useQuery({
    queryKey: useTenantQueryKey('stock-movements'),
    queryFn: () => stockApi.getMovements({ limit: 20 }).then((r) => r.data.data),
    enabled: tenantEnabled,
  });

  const handleStockAction = async (formData) => {
    if (modalType === 'in') await stockApi.stockIn(formData);
    else await stockApi.stockOut(formData);
    setModalType(null);
    refetch();
  };

  const stockFields = [
    { name: 'productId', label: 'Product ID', required: true },
    { name: 'warehouseId', label: 'Warehouse ID', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true },
    { name: 'reason', label: 'Reason' },
  ];

  const stockColumns = [
    { key: 'product', label: 'Product', render: (r) => r.product?.name },
    { key: 'warehouse', label: 'Warehouse', render: (r) => r.warehouse?.name },
    { key: 'quantity', label: 'Quantity' },
    {
      key: 'status',
      label: 'Status',
      render: (r) => {
        const low = Number(r.quantity) <= Number(r.product?.minStock);
        return <Badge variant={low ? 'destructive' : 'success'}>{low ? 'Low' : 'OK'}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">Monitor and manage stock levels</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalType('in')}><ArrowDownToLine className="h-4 w-4" /> Stock In</Button>
          <Button variant="outline" onClick={() => setModalType('out')}><ArrowUpFromLine className="h-4 w-4" /> Stock Out</Button>
        </div>
      </div>

      <DataTable columns={stockColumns} data={stock || []} isLoading={isLoading} emptyTitle="No stock data" />

      <Card>
        <CardHeader><CardTitle>Recent Movements</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(movements || []).slice(0, 10).map((m) => (
              <div key={m.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                <span>{m.product?.name || m.ingredient?.name} - {m.type}</span>
                <span className="font-medium">{m.quantity} @ {m.warehouse?.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={!!modalType}
        onClose={() => setModalType(null)}
        title={modalType === 'in' ? 'Stock In' : 'Stock Out'}
      >
        <CrudForm fields={stockFields} onSubmit={handleStockAction} submitLabel="Submit" />
      </Modal>
    </div>
  );
}
