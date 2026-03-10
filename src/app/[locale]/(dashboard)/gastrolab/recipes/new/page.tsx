import { getRecipeCategories, getRecipeFamilies } from "@/modules/gastrolab/actions/recipes"
import { getIngredientsForSelect } from "@/modules/gastrolab/actions/ingredients"
import { getMeasureUnits } from "@/modules/gastrolab/actions/settings"
import { RecipeForm } from "../_components/recipe-form"
import { Header } from "@/components/layout/header"

export default async function NewRecipePage() {
    const [categories, families, ingredients, units] = await Promise.all([
        getRecipeCategories(),
        getRecipeFamilies(),
        getIngredientsForSelect(),
        getMeasureUnits(),
    ])

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="gastrolab.recipes.new"
                backHref="/gastrolab/recipes"
            />

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <RecipeForm
                        categories={categories}
                        families={families}
                        ingredients={ingredients}
                        units={units}
                    />
                </div>
            </div>
        </div>
    )
}
