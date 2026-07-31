import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Thumbnail } from '@/components/ui/Thumbnail';
import { DataTable } from '@/components/common/DataTable';
import { Modal } from '@/components/common/Modal';
import { CrudForm, useCrudPage } from '@/components/common/CrudForm';
import { menuItemsApi, menuCategoriesApi } from '@/lib/api';
import { resolveMenuImageUrl } from '@/lib/images';

export default function MenuPage() {
  const [viewMode, setViewMode] = useState('grid');

  const { data: categories } = useQuery({
    queryKey: ['menu-categories'],
    queryFn: () => menuCategoriesApi.getAll().then((r) => r.data.data),
  });

  const {
    data, pagination, isLoading, setPage, setSearch,
    modalOpen, setModalOpen, editItem, setEditItem,
    handleSubmit, deleteMutation, isSubmitting,
  } = useCrudPage(menuItemsApi, 'menu-items');

  const menuImage = (item, width, height) =>
    resolveMenuImageUrl(item.name, item.category?.name, item.image, width, height);

  const columns = [
    {
      key: 'image',
      label: '',
      className: 'w-16',
      render: (r) => (
        <Thumbnail
          src={menuImage(r, 80, 80)}
          alt={r.name}
          fallbackName={r.name}
          category={r.category?.name}
          size="sm"
          rounded="lg"
        />
      ),
    },
    { key: 'name', label: 'Name' },
    { key: 'category', label: 'Category', render: (r) => r.category?.name },
    { key: 'price', label: 'Price', render: (r) => formatCurrency(r.price) },
    { key: 'prepTimeMinutes', label: 'Prep Time', render: (r) => `${r.prepTimeMinutes} min`, hideOnMobile: true },
    {
      key: 'isAvailable',
      label: 'Available',
      render: (r) => (
        <Badge variant={r.isAvailable ? 'success' : 'destructive'}>
          {r.isAvailable ? 'Yes' : 'No'}
        </Badge>
      ),
    },
  ];

  const formFields = [
    { name: 'name', label: 'Name', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'image', label: 'Image URL', placeholder: 'https://...' },
    { name: 'price', label: 'Price', type: 'number', required: true, step: '0.01' },
    { name: 'prepTimeMinutes', label: 'Prep Time (min)', type: 'number' },
    {
      name: 'categoryId', label: 'Category', type: 'select', required: true,
      options: categories?.map((c) => ({ value: c.id, label: c.name })) || [],
    },
  ];

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

  const menuCard = (item) => (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <Thumbnail
        src={menuImage(item, 400, 300)}
        alt={item.name}
        fallbackName={item.name}
        category={item.category?.name}
        size="cover"
        rounded="xl"
        className="rounded-b-none"
      />
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="font-semibold truncate">{item.name}</p>
            <p className="text-xs text-muted-foreground">{item.category?.name}</p>
          </div>
          <Badge variant={item.isAvailable ? 'success' : 'destructive'} className="shrink-0">
            {item.isAvailable ? 'Available' : 'Off'}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
          <span className="text-xs text-muted-foreground">{item.prepTimeMinutes} min</span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setEditItem(item); setModalOpen(true); }}>
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu</h1>
          <p className="text-muted-foreground">Manage menu categories and items</p>
        </div>
        <div className="flex gap-2 self-start">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'grid' && !isLoading && data.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data.map((item) => (
              <div key={item.id}>{menuCard(item)}</div>
            ))}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(pagination.page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(pagination.page + 1)}>
                Next
              </Button>
            </div>
          )}
          <Button className="fixed bottom-6 right-6 md:hidden shadow-lg rounded-full h-14 w-14 p-0 z-30" onClick={() => { setEditItem(null); setModalOpen(true); }}>
            +
          </Button>
        </>
      ) : (
        <DataTable
          columns={[...columns, actionColumn]}
          data={data}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          onSearch={setSearch}
          onAdd={() => { setEditItem(null); setModalOpen(true); }}
          addLabel="Add Menu Item"
          mobileCardRender={menuCard}
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Edit Item' : 'Add Menu Item'}>
        {editItem && (
          <div className="mb-4 flex justify-center">
            <Thumbnail
              src={menuImage(editItem, 160, 120)}
              alt={editItem.name}
              fallbackName={editItem.name}
              category={editItem.category?.name}
              size="lg"
            />
          </div>
        )}
        <CrudForm fields={formFields} onSubmit={handleSubmit} defaultValues={editItem || {}} isLoading={isSubmitting} />
      </Modal>
    </div>
  );
}
