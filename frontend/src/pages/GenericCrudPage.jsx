import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DataTable } from '@/components/common/DataTable';import { Modal } from '@/components/common/Modal';
import { CrudForm, useCrudPage } from '@/components/common/CrudForm';
import { formatDate, formatCurrency } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/Badge';

export function GenericCrudPage({
  title,
  description,
  api,
  queryKey,
  columns,
  formFields,
  addLabel,
}) {
  const {
    data, pagination, isLoading, page, setPage, setSearch,
    modalOpen, setModalOpen, editItem, setEditItem,
    handleSubmit, deleteMutation, isSubmitting,
  } = useCrudPage(api, queryKey);

  const actionColumn = {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setEditItem(row); setModalOpen(true); }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Are you sure you want to delete this item?')) {
              deleteMutation.mutate(row.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>

      <DataTable
        columns={[...columns, actionColumn]}
        data={data}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={() => { setEditItem(null); setModalOpen(true); }}
        addLabel={addLabel || `Add ${title}`}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        title={editItem ? `Edit ${title}` : `Add ${title}`}
      >
        <CrudForm
          fields={formFields}
          onSubmit={handleSubmit}
          defaultValues={editItem || {}}
          isLoading={isSubmitting}
        />
      </Modal>
    </div>
  );
}

export const tableColumns = [
  { key: 'number', label: 'Table #' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'location', label: 'Location', hideOnMobile: true },
  {
    key: 'status',
    label: 'Status',
    render: (r) => <StatusBadge status={r.status} />,
  },
];
export const tableFormFields = [
  { name: 'number', label: 'Table Number', type: 'number', required: true },
  { name: 'capacity', label: 'Capacity', type: 'number', required: true },
  { name: 'location', label: 'Location', placeholder: 'Indoor / Outdoor' },
  {
    name: 'status', label: 'Status', type: 'select', required: true,
    options: [
      { value: 'AVAILABLE', label: 'Available' },
      { value: 'OCCUPIED', label: 'Occupied' },
      { value: 'RESERVED', label: 'Reserved' },
      { value: 'CLEANING', label: 'Cleaning' },
    ],
  },
];

export const customerColumns = [
  {
    key: 'avatar',
    label: '',
    className: 'w-12',
    render: (r) => (
      <Avatar firstName={r.name?.split(' ')[0]} lastName={r.name?.split(' ')[1]} size="sm" />
    ),
  },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email', hideOnMobile: true },
  { key: 'phone', label: 'Phone' },
  { key: 'createdAt', label: 'Joined', render: (r) => formatDate(r.createdAt), hideOnMobile: true },
];
export const customerFormFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'address', label: 'Address', type: 'textarea' },
];

export const supplierColumns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'gstNumber', label: 'GST' },
];

export const supplierFormFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' },
  { name: 'address', label: 'Address', type: 'textarea' },
  { name: 'gstNumber', label: 'GST Number' },
];

export const ingredientColumns = [
  { key: 'name', label: 'Name' },
  { key: 'unit', label: 'Unit' },
  { key: 'currentStock', label: 'Stock' },
  { key: 'minStock', label: 'Min Stock' },
  { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => formatCurrency(r.costPerUnit) },
];

export const ingredientFormFields = [
  { name: 'name', label: 'Name', required: true },
  { name: 'unit', label: 'Unit', required: true, placeholder: 'kg, liter, bunch' },
  { name: 'costPerUnit', label: 'Cost Per Unit', type: 'number', step: '0.01' },
  { name: 'minStock', label: 'Min Stock', type: 'number' },
  { name: 'currentStock', label: 'Current Stock', type: 'number' },
];

export const expenseColumns = [
  { key: 'title', label: 'Title' },
  { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
  { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
  { key: 'category', label: 'Category', render: (r) => r.category?.name },
];

export const expenseFormFields = [
  { name: 'title', label: 'Title', required: true },
  { name: 'amount', label: 'Amount', type: 'number', required: true, step: '0.01' },
  { name: 'date', label: 'Date', type: 'date', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'categoryId', label: 'Category ID', required: true },
];

export const staffColumns = [
  {
    key: 'avatar',
    label: '',
    className: 'w-12',
    render: (r) => (
      <Avatar src={r.avatar} firstName={r.firstName} lastName={r.lastName} size="sm" />
    ),
  },
  {
    key: 'name',
    label: 'Name',
    render: (r) => `${r.firstName} ${r.lastName}`,
  },
  { key: 'email', label: 'Email', hideOnMobile: true },
  { key: 'role', label: 'Role', render: (r) => r.role?.name },
  { key: 'isActive', label: 'Status', render: (r) => (r.isActive ? 'Active' : 'Inactive') },
];
export const staffFormFields = [
  { name: 'firstName', label: 'First Name', required: true },
  { name: 'lastName', label: 'Last Name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Password', type: 'password', required: true },
  { name: 'phone', label: 'Phone' },
  { name: 'avatar', label: 'Avatar URL', placeholder: 'https://...' },
  { name: 'roleId', label: 'Role ID', required: true },
];