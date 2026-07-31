import { GenericCrudPage, ingredientColumns, ingredientFormFields } from '@/pages/GenericCrudPage';
import { ingredientsApi } from '@/lib/api';

export default function IngredientsPage() {
  return (
    <GenericCrudPage
      title="Ingredients"
      description="Manage recipe ingredients and stock levels"
      api={ingredientsApi}
      queryKey="ingredients"
      columns={ingredientColumns}
      formFields={ingredientFormFields}
    />
  );
}
