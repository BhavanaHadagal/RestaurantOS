import { GenericCrudPage, customerColumns, customerFormFields } from '@/pages/GenericCrudPage';
import { customersApi } from '@/lib/api';

export default function CustomersPage() {
  return (
    <GenericCrudPage
      title="Customers"
      description="Manage customer records"
      api={customersApi}
      queryKey="customers"
      columns={customerColumns}
      formFields={customerFormFields}
    />
  );
}
