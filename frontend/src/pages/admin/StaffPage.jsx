import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { staffColumns } from '@/pages/GenericCrudPage';
import { staffApi, rolesApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/common/Modal';
import { CrudForm, useCrudPage } from '@/components/common/CrudForm';
import { DataTable } from '@/components/common/DataTable';
import { useAuthStore } from '@/stores/authStore';
import { ROLES, isOwner } from '@/lib/rbac';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

const ASSIGNABLE_ROLES = [ROLES.MANAGER, ROLES.CHEF, ROLES.WAITER, ROLES.CASHIER];

export default function StaffPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const ownerView = isOwner(user, accessToken);
  const tenantEnabled = useTenantQueryEnabled();

  const {
    data, pagination, isLoading, page, setPage, setSearch,
    modalOpen, setModalOpen, editItem, setEditItem,
    handleSubmit, deleteMutation, isSubmitting,
  } = useCrudPage(staffApi, 'staff', { pageSize: 50 });

  const { data: roles = [] } = useQuery({
    queryKey: useTenantQueryKey('roles'),
    queryFn: () => rolesApi.getAll().then((r) => r.data.data || []),
    enabled: tenantEnabled && ownerView,
  });

  const roleOptions = useMemo(() => {
    const allowed = editItem?.role?.name === ROLES.OWNER
      ? roles
      : roles.filter((role) => ASSIGNABLE_ROLES.includes(role.name));

    return allowed.map((role) => ({ value: role.id, label: role.name }));
  }, [roles, editItem]);

  const formFields = useMemo(() => [
    { name: 'firstName', label: 'First Name', required: true },
    { name: 'lastName', label: 'Last Name', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    {
      name: 'password',
      label: editItem ? 'Password (leave blank to keep)' : 'Password',
      type: 'password',
      required: !editItem,
    },
    { name: 'phone', label: 'Phone' },
    {
      name: 'roleId',
      label: 'Role',
      type: 'select',
      required: true,
      options: roleOptions,
    },
    {
      name: 'isActive',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ], [editItem, roleOptions]);

  const actionColumn = ownerView ? {
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setEditItem(row); setModalOpen(true); }}
          disabled={row.role?.name === ROLES.OWNER && row.email !== user?.email}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={row.role?.name === ROLES.OWNER}
          onClick={() => {
            if (confirm('Deactivate this staff member?')) {
              deleteMutation.mutate(row.id);
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    ),
  } : null;

  const onSubmit = (formData) => {
    const payload = {
      ...formData,
      isActive: formData.isActive === 'true' || formData.isActive === true,
    };
    if (editItem && !payload.password) delete payload.password;
    handleSubmit(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-muted-foreground">
          Manage staff members and roles. Each role has its own dashboard access.
        </p>
      </div>

      <DataTable
        columns={actionColumn ? [...staffColumns, actionColumn] : staffColumns}
        data={data}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        onAdd={ownerView ? () => { setEditItem(null); setModalOpen(true); } : undefined}
        addLabel="Add Staff"
        emptyTitle="No staff members yet"
        emptyDescription={ownerView ? 'Add team members and assign roles.' : 'Staff list is empty for this workspace.'}
      />

      {ownerView && (
        <Modal
          isOpen={modalOpen}
          onClose={() => { setModalOpen(false); setEditItem(null); }}
          title={editItem ? 'Edit Staff Member' : 'Add Staff Member'}
        >
          <CrudForm
            fields={formFields}
            onSubmit={onSubmit}
            defaultValues={editItem ? {
              ...editItem,
              roleId: editItem.roleId || editItem.role?.id,
              isActive: String(editItem.isActive ?? true),
            } : { isActive: 'true' }}
            isLoading={isSubmitting}
          />
        </Modal>
      )}
    </div>
  );
}
