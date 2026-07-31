import { useState, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Upload, FileText, Check, X, AlertCircle, Download, Trash2,
  BarChart3, Clock, DollarSign, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED = ['.pdf', '.png', '.jpg', '.jpeg'];

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InvoicesPage() {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const { data: dashboard } = useQuery({
    queryKey: ['invoice-dashboard'],
    queryFn: () => invoicesApi.getDashboard().then((r) => r.data.data),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['invoices', page, search, statusFilter],
    queryFn: () =>
      invoicesApi.getAll({ page, limit: 10, search: search || undefined, status: statusFilter || undefined })
        .then((r) => r.data),
  });

  const validateFiles = (files) => {
    const valid = [];
    for (const file of files) {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      if (!ACCEPTED.includes(ext)) {
        showToast(`${file.name}: invalid type`, 'error');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        showToast(`${file.name}: exceeds 20MB limit`, 'error');
        continue;
      }
      valid.push(file);
    }
    return valid;
  };

  const processFiles = async (files) => {
    const valid = validateFiles(files);
    if (!valid.length) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      if (valid.length === 1) {
        const response = await invoicesApi.upload(valid[0], (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        setEditInvoice(response.data.data);
        showToast('Invoice processed — review extracted data');
      } else {
        const response = await invoicesApi.uploadMultiple(valid, (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        const results = response.data.data || [];
        const ok = results.filter((r) => r.success).length;
        showToast(`${ok}/${valid.length} invoices processed`);
        if (results[0]?.success) setEditInvoice(results[0].data);
      }
      refetch();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleSave = async () => {
    if (!editInvoice) return;
    await invoicesApi.update(editInvoice.id, editInvoice);
    setEditInvoice(null);
    refetch();
    showToast('Invoice saved');
  };

  const handleApprove = async () => {
    if (!editInvoice) return;
    await invoicesApi.approve(editInvoice.id);
    setEditInvoice(null);
    refetch();
    showToast('Invoice approved');
  };

  const handleReject = async () => {
    if (!editInvoice) return;
    const reason = window.prompt('Rejection reason (optional):');
    await invoicesApi.reject(editInvoice.id, reason || 'Rejected during review');
    setEditInvoice(null);
    refetch();
    showToast('Invoice rejected', 'error');
  };

  const handleExport = async () => {
    try {
      const response = await invoicesApi.exportRegister({
        startDate: undefined,
        endDate: undefined,
        status: statusFilter || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expense-register.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Expense register downloaded');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const removeItemRow = (index) => {
    const items = editInvoice.items.filter((_, i) => i !== index);
    setEditInvoice({ ...editInvoice, items });
  };

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'supplierName', label: 'Supplier' },
    { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
    { key: 'invoiceDate', label: 'Date', render: (r) => formatDate(r.invoiceDate) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'confidence',
      label: 'OCR',
      render: (r) => {
        const conf = r.ocrConfidence?.averageConfidence ?? r.ocrConfidence;
        const pct = typeof conf === 'number' ? `${(conf * 100).toFixed(0)}%` : '-';
        return (
          <span className={cn(typeof conf === 'number' && conf < 0.6 && 'text-amber-600 font-medium')}>
            {pct}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => setEditInvoice(r)}>
          Review
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in fade-in',
          toast.type === 'error' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'
        )}>
          {toast.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invoice Processing</h1>
          <p className="text-muted-foreground">AI-powered OCR for supplier invoices — PDF, PNG, JPG up to 20MB</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export Excel
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={(e) => processFiles(Array.from(e.target.files || []))}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Processing...' : 'Upload'}
          </Button>
        </div>
      </div>

      {dashboard && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={FileText} label="Processed" value={dashboard.invoicesProcessed} />
          <StatCard icon={Clock} label="Pending Review" value={dashboard.pendingReview} sub={`${dashboard.failedOcr} failed OCR`} />
          <StatCard icon={DollarSign} label="Monthly Expense" value={formatCurrency(dashboard.monthlyExpense)} />
          <StatCard icon={BarChart3} label="OCR Accuracy" value={`${dashboard.ocrAccuracy}%`} sub={`Avg ${dashboard.avgProcessingMs}ms`} />
        </div>
      )}

      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
      >
        <CardContent className="py-10 text-center">
          {uploading ? (
            <div className="space-y-3 max-w-xs mx-auto">
              <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
              <p className="text-sm font-medium">Processing with OCR + Gemini...</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress || 30}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{uploadProgress}% uploaded</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Drag & drop invoices here</p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse — multiple files supported
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {['', 'PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'FAILED'].map((s) => (
          <Button
            key={s || 'all'}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => { setStatusFilter(s); setPage(1); }}
          >
            {s || 'All'}
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        emptyTitle="No invoices processed"
        onSearch={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search supplier or invoice #..."
        pagination={data?.pagination}
        onPageChange={setPage}
      />

      <Modal
        isOpen={!!editInvoice}
        onClose={() => setEditInvoice(null)}
        title="Review Extracted Invoice"
        description="Edit fields, fix validation errors, then approve or reject."
        size="lg"
      >
        {editInvoice && (
          <div className="space-y-4">
            {editInvoice.isDuplicate && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Possible duplicate invoice detected
              </div>
            )}

            {(editInvoice.validationErrors?.length > 0) && (
              <div className="p-3 rounded-lg bg-destructive/10 text-sm space-y-1">
                <p className="font-medium text-destructive">Validation Errors</p>
                {editInvoice.validationErrors.map((err, i) => (
                  <p key={i} className="text-muted-foreground">• {typeof err === 'string' ? err : err.message || JSON.stringify(err)}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'supplierName', label: 'Supplier Name' },
                { key: 'invoiceNumber', label: 'Invoice Number' },
                { key: 'gstNumber', label: 'GST Number' },
                { key: 'invoiceDate', label: 'Invoice Date' },
                { key: 'subtotal', label: 'Subtotal', type: 'number' },
                { key: 'total', label: 'Grand Total', type: 'number' },
                { key: 'tax', label: 'Tax', type: 'number' },
                { key: 'paymentTerms', label: 'Payment Terms' },
              ].map(({ key, label, type }) => {
                const conf = editInvoice.ocrConfidence?.[key];
                const lowConf = conf && conf < 0.6;
                return (
                  <div key={key} className="space-y-1">
                    <Label className="flex items-center gap-2">
                      {label}
                      {lowConf && <AlertCircle className="h-3 w-3 text-amber-500" />}
                      {conf && (
                        <Badge variant={lowConf ? 'warning' : 'success'} className="text-[10px]">
                          {(conf * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </Label>
                    <Input
                      type={type || 'text'}
                      value={editInvoice[key] ?? ''}
                      onChange={(e) => setEditInvoice({ ...editInvoice, [key]: e.target.value })}
                      className={lowConf ? 'border-amber-500' : ''}
                    />
                  </div>
                );
              })}
            </div>

            {editInvoice.items?.length > 0 && (
              <div>
                <Label>Line Items</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {editInvoice.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_80px_80px_32px] gap-2 p-2 rounded bg-muted/30 text-sm items-center">
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const items = [...editInvoice.items];
                          items[i] = { ...items[i], name: e.target.value };
                          setEditInvoice({ ...editInvoice, items });
                        }}
                      />
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const items = [...editInvoice.items];
                          items[i] = { ...items[i], quantity: e.target.value };
                          setEditInvoice({ ...editInvoice, items });
                        }}
                      />
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const items = [...editInvoice.items];
                          items[i] = { ...items[i], unitPrice: e.target.value };
                          setEditInvoice({ ...editInvoice, items });
                        }}
                      />
                      <span className="text-xs">{formatCurrency(item.total)}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeItemRow(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {editInvoice.aiReasoning && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-1">AI Reasoning</p>
                <p className="text-muted-foreground">{editInvoice.aiReasoning}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditInvoice(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject}><X className="h-4 w-4" /> Reject</Button>
              <Button variant="secondary" onClick={handleSave}>Save Draft</Button>
              <Button onClick={handleApprove}><Check className="h-4 w-4" /> Approve</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
