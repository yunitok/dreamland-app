import { getRecipeCategories, getRecipeFamilies } from "@/modules/sherlock/actions/recipes"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"
import { getMeasureUnits } from "@/modules/sherlock/actions/settings"
import { RecipeForm } from "../_components/recipe-form"
import { Header } from "@/components/layout/header"

export default async function NewRecipePage() {
    const [categories, families, ingredients, units] = await Promise.all([
        getRecipeCategories(),
        getRecipeFamilies(),
        getIngredients({}),
        getMeasureUnits(),
    ])

    return (
        <div className="flex flex-col h-[calc(100vh-65px)]">
            <Header
                titleKey="sherlock.recipes.new"
                backHref="/sherlock/recipes"
            />

            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-5xl mx-auto">
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
