import { GenericCrudPage, expenseColumns, expenseFormFields } from '@/pages/GenericCrudPage';
import { expensesApi } from '@/lib/api';

export default function ExpensesPage() {
  return (
    <GenericCrudPage
      title="Expenses"
      description="Track and manage business expenses"
      api={expensesApi}
      queryKey="expenses"
      columns={expenseColumns}
      formFields={expenseFormFields}
    />
  );
}
