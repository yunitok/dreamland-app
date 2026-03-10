import { getMeasureUnits, getCategories, getSuppliers } from "@/modules/gastrolab/actions/settings";
import { IngredientForm } from "../_components/ingredient-form";
import { Header } from "@/components/layout/header";

export default async function NewIngredientPage() {
  const [units, categories, suppliers] = await Promise.all([
    getMeasureUnits(),
    getCategories(),
    getSuppliers(),
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="gastrolab.ingredients.new"
        backHref="/gastrolab/ingredients"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          <IngredientForm
            units={units}
            categories={categories}
            suppliers={suppliers}
          />
        </div>
      </div>
    </div>
  );
}
