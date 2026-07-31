import { getProductImageUrl } from '@/lib/images';
import { formatCurrency } from '@/lib/utils';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { DataTable } from '@/components/common/DataTable';
import { productsApi } from '@/lib/api';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/common/Modal';
import { CrudForm, useCrudPage } from '@/components/common/CrudForm';

const columns = [
  {
    key: 'thumb',
    label: '',
    className: 'w-14',
    render: (r) => (
      <Thumbnail src={getProductImageUrl(r.sku)} alt={r.name} fallbackName={r.name} size="sm" rounded="lg" />
    ),
  },
  { key: 'name', label: 'Product' },
  { key: 'sku', label: 'SKU', hideOnMobile: true },
  { key: 'category', label: 'Category', render: (r) => r.category?.name },
  { key: 'unit', label: 'Unit', hideOnMobile: true },
  { key: 'costPrice', label: 'Cost', render: (r) => formatCurrency(r.costPrice) },
  { key: 'minStock', label: 'Min Stock' },
];
const formFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'sku', label: 'SKU', required: true },
  { name: 'unit', label: 'Unit', required: true },
  { name: 'costPrice', label: 'Cost Price', type: 'number', step: '0.01' },
  { name: 'sellingPrice', label: 'Selling Price', type: 'number', step: '0.01' },
  { name: 'minStock', label: 'Min Stock', type: 'number' },
  { name: 'categoryId', label: 'Category ID', required: true },
];

export default function ProductsPage() {
  const {
    data, pagination, isLoading, setPage, setSearch,
    modalOpen, setModalOpen, editItem, setEditItem,
    handleSubmit, deleteMutation, isSubmitting,
  } = useCrudPage(productsApi, 'products');

  const actionColumn = {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={() => { setEditItem(row); setModalOpen(true); }}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(row.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Products</h1>
        <p className="text-muted-foreground">Manage inventory products</p>
      </div>
      <DataTable
        columns={[...columns, actionColumn]}
        data={data}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={() => { setEditItem(null); setModalOpen(true); }}
        addLabel="Add Product"
      />
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Product' : 'Add Product'}>
        <CrudForm fields={formFields} onSubmit={handleSubmit} defaultValues={editItem || {}} isLoading={isSubmitting} />
      </Modal>
    </div>
  );
}
