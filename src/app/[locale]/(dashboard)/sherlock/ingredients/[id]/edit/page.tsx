import { notFound } from "next/navigation";
import { getMeasureUnits, getCategories, getSuppliers } from "@/modules/sherlock/actions/settings";
import { getIngredient } from "@/modules/sherlock/actions/ingredients";
import { IngredientForm } from "../../_components/ingredient-form";
import { Header } from "@/components/layout/header";

interface EditIngredientPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditIngredientPage({ params }: EditIngredientPageProps) {
  const { id } = await params;

  const [units, categories, suppliers, ingredient] = await Promise.all([
    getMeasureUnits(),
    getCategories(),
    getSuppliers(),
    getIngredient(id),
  ]);

  if (!ingredient) {
    notFound();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <Header
        titleKey="sherlock.ingredients.edit"
        backHref="/sherlock/ingredients"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <IngredientForm
            units={units}
            categories={categories}
            suppliers={suppliers}
            initialData={ingredient}
          />
        </div>
      </div>
    </div>
  );
}
