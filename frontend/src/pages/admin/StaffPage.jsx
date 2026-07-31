import { GenericCrudPage, staffColumns, staffFormFields } from '@/pages/GenericCrudPage';
import { staffApi } from '@/lib/api';

export default function StaffPage() {
  return (
    <GenericCrudPage
      title="Staff"
      description="Manage staff members and roles"
      api={staffApi}
      queryKey="staff"
      columns={staffColumns}
      formFields={staffFormFields}
    />
  );
}
