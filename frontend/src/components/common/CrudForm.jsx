import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { useTenantQueryEnabled, useTenantQueryKey } from '@/hooks/useTenantQueryKey';

export function FormField({ label, error, children, required, labelClassName }) {
  return (
    <div className="space-y-2">
      {label && (
        <Label className={labelClassName}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}

export function CrudForm({ fields, onSubmit, defaultValues, isLoading, submitLabel = 'Save' }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.map((field) => (
        <FormField
          key={field.name}
          label={field.label}
          error={errors[field.name]}
          required={field.required}
        >
          {field.type === 'select' ? (
            <Select {...register(field.name, { required: field.required })}>
              <option value="">Select {field.label}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          ) : field.type === 'textarea' ? (
            <textarea
              {...register(field.name, { required: field.required })}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder={field.placeholder}
            />
          ) : (
            <Input
              type={field.type || 'text'}
              placeholder={field.placeholder}
              step={field.step}
              {...register(field.name, {
                required: field.required,
                valueAsNumber: field.type === 'number',
              })}
            />
          )}
        </FormField>
      ))}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function useCrudPage(api, queryKey, options = {}) {
  const pageSize = options.pageSize || 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const queryClient = useQueryClient();
  const tenantScopeKey = useTenantQueryKey(queryKey);
  const tenantQueryKey = useTenantQueryKey(queryKey, page, search);
  const tenantEnabled = useTenantQueryEnabled();

  const { data, isLoading, refetch } = useQuery({
    queryKey: tenantQueryKey,
    queryFn: () => api.getAll({ page, limit: pageSize, search }).then((r) => r.data),
    enabled: tenantEnabled,
  });

  const createMutation = useMutation({
    mutationFn: (formData) => api.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantScopeKey });
      setModalOpen(false);
      setEditItem(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data: formData }) => api.update(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantScopeKey });
      setModalOpen(false);
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tenantScopeKey }),
  });

  const handleSubmit = (formData) => {
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return {
    data: data?.data || [],
    pagination: data?.pagination,
    isLoading,
    page,
    setPage,
    search,
    setSearch,
    modalOpen,
    setModalOpen,
    editItem,
    setEditItem,
    handleSubmit,
    deleteMutation,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
    refetch,
  };
}
