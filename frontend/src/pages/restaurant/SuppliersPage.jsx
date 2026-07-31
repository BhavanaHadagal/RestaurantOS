import { GenericCrudPage, supplierColumns, supplierFormFields } from '@/pages/GenericCrudPage';
import { suppliersApi } from '@/lib/api';

export default function SuppliersPage() {
  return (
    <GenericCrudPage
      title="Suppliers"
      description="Manage supplier contacts and details"
      api={suppliersApi}
      queryKey="suppliers"
      columns={supplierColumns}
      formFields={supplierFormFields}
    />
  );
}
