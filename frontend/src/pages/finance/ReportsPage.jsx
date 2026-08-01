import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { reportsApi } from '@/lib/api';
import { formatCurrency, formatDateTime, getMonthStartDateInputValue, toLocalDateInputValue } from '@/lib/utils';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

const reportTypes = [
  { key: 'sales', label: 'Sales Report', fn: reportsApi.sales },
  { key: 'expenses', label: 'Expense Report', fn: reportsApi.expenses },
  { key: 'inventory', label: 'Inventory Report', fn: reportsApi.inventory },
  { key: 'suppliers', label: 'Supplier Report', fn: reportsApi.suppliers },
  { key: 'profit', label: 'Profit Report', fn: reportsApi.profit },
];

const SUMMARY_LABELS = {
  totalRevenue: 'Total Revenue',
  totalOrders: 'Total Orders',
  averageOrder: 'Average Order',
  total: 'Total',
  count: 'Count',
};

function formatSummaryValue(key, value) {
  if (value == null) return '—';
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${typeof v === 'number' ? formatCurrency(v) : v}`)
      .join(' · ');
  }
  if (typeof value !== 'number') return String(value);

  if (key === 'totalOrders' || key === 'count') {
    return value.toLocaleString('en-IN');
  }
  if (key === 'averageOrder' || key === 'totalRevenue' || key === 'total' || key.endsWith('Amount')) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return value.toLocaleString('en-IN');
}

function SalesOrdersTable({ orders = [] }) {
  if (!orders.length) {
    return <p className="text-sm text-muted-foreground">No orders in this date range.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Order #</th>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-left font-medium">Type</th>
            <th className="px-3 py-2 text-left font-medium">Customer</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.slice(0, 50).map((order) => (
            <tr key={order.orderNumber} className="border-t">
              <td className="px-3 py-2">{order.orderNumber}</td>
              <td className="px-3 py-2">{formatDateTime(order.date)}</td>
              <td className="px-3 py-2">{order.type}</td>
              <td className="px-3 py-2">{order.customer || '—'}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(order.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length > 50 && (
        <p className="px-3 py-2 text-xs text-muted-foreground border-t">
          Showing 50 of {orders.length} orders. Export for the full list.
        </p>
      )}
    </div>
  );
}

function ExpensesTable({ expenses = [] }) {
  if (!expenses.length) {
    return <p className="text-sm text-muted-foreground">No expenses in this date range.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Title</th>
            <th className="px-3 py-2 text-left font-medium">Category</th>
            <th className="px-3 py-2 text-left font-medium">Date</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.slice(0, 50).map((expense, i) => (
            <tr key={`${expense.title}-${i}`} className="border-t">
              <td className="px-3 py-2">{expense.title}</td>
              <td className="px-3 py-2">{expense.category}</td>
              <td className="px-3 py-2">{formatDateTime(expense.date)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(expense.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuppliersTable({ suppliers = [] }) {
  if (!suppliers.length) {
    return <p className="text-sm text-muted-foreground">No suppliers found.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Supplier</th>
            <th className="px-3 py-2 text-left font-medium">Contact</th>
            <th className="px-3 py-2 text-left font-medium">GST</th>
            <th className="px-3 py-2 text-right font-medium">Ingredients</th>
            <th className="px-3 py-2 text-right font-medium">Purchases</th>
            <th className="px-3 py-2 text-right font-medium">Invoices</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.name} className="border-t">
              <td className="px-3 py-2 font-medium">{supplier.name}</td>
              <td className="px-3 py-2">
                <div>{supplier.email || '—'}</div>
                <div className="text-muted-foreground">{supplier.phone || '—'}</div>
              </td>
              <td className="px-3 py-2">{supplier.gstNumber || '—'}</td>
              <td className="px-3 py-2 text-right">{supplier.ingredientCount ?? 0}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(supplier.totalPurchases)}</td>
              <td className="px-3 py-2 text-right">{supplier.invoiceCount ?? 0}</td>
              <td className="px-3 py-2">{supplier.isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({ title, rows = [], columns }) {
  if (!rows.length) {
    return null;
  }
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 font-medium ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((row, i) => (
              <tr key={`${row.name}-${i}`} className="border-t">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-2 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: getMonthStartDateInputValue(),
    endDate: toLocalDateInputValue(),
  });

  const tenantEnabled = useTenantQueryEnabled();

  const { data, isLoading } = useQuery({
    queryKey: useTenantQueryKey('report', activeReport, dateRange),
    queryFn: () => {
      const report = reportTypes.find((r) => r.key === activeReport);
      const params = ['inventory', 'suppliers'].includes(activeReport) ? {} : dateRange;
      return report.fn(params).then((r) => r.data.data);
    },
    enabled: tenantEnabled,
  });

  const handleExport = async (format) => {
    const blob = await reportsApi.export(activeReport, { ...dateRange, format });
    const url = window.URL.createObjectURL(new Blob([blob.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport}-report.${format === 'csv' ? 'csv' : 'xlsx'}`;
    a.click();
  };

  const suppliers = Array.isArray(data) ? data : [];
  const reportData = Array.isArray(data) ? null : data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate and export business reports</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((r) => (
          <Button
            key={r.key}
            variant={activeReport === r.key ? 'default' : 'outline'}
            onClick={() => setActiveReport(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {!['inventory', 'suppliers'].includes(activeReport) && (
        <div className="flex gap-4 items-end">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })} />
          </div>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{reportTypes.find((r) => r.key === activeReport)?.label}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-48 animate-pulse bg-muted rounded" />
          ) : (
            <div className="space-y-4">
              {reportData?.summary && (
                <div className="grid gap-4 md:grid-cols-3">
                  {Object.entries(reportData.summary).map(([key, value]) => (
                    <div key={key} className="p-4 rounded-lg bg-muted/30">
                      <p className="text-sm text-muted-foreground">
                        {SUMMARY_LABELS[key] || key.replace(/([A-Z])/g, ' $1')}
                      </p>
                      <p className="text-xl font-bold">{formatSummaryValue(key, value)}</p>
                    </div>
                  ))}
                </div>
              )}
              {reportData?.revenue !== undefined && (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="text-xl font-bold">{formatCurrency(reportData.revenue)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Expenses</p>
                    <p className="text-xl font-bold">{formatCurrency(reportData.expenses)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="text-xl font-bold">{formatCurrency(reportData.profit)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Margin</p>
                    <p className="text-xl font-bold">{reportData.profitMargin}%</p>
                  </div>
                </div>
              )}
              {activeReport === 'sales' && reportData?.orders && (
                <SalesOrdersTable orders={reportData.orders} />
              )}
              {activeReport === 'expenses' && reportData?.expenses && (
                <ExpensesTable expenses={reportData.expenses} />
              )}
              {activeReport === 'suppliers' && (
                <SuppliersTable suppliers={suppliers} />
              )}
              {activeReport === 'inventory' && reportData && (
                <div className="space-y-6">
                  <InventoryTable
                    title="Products"
                    rows={reportData.products}
                    columns={[
                      { key: 'name', label: 'Product' },
                      { key: 'sku', label: 'SKU' },
                      { key: 'warehouse', label: 'Warehouse' },
                      { key: 'quantity', label: 'Qty', align: 'right' },
                      { key: 'minStock', label: 'Min', align: 'right' },
                    ]}
                  />
                  <InventoryTable
                    title="Ingredients"
                    rows={reportData.ingredients}
                    columns={[
                      { key: 'name', label: 'Ingredient' },
                      { key: 'supplier', label: 'Supplier' },
                      { key: 'currentStock', label: 'Stock', align: 'right' },
                      { key: 'minStock', label: 'Min', align: 'right' },
                      { key: 'unit', label: 'Unit' },
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
