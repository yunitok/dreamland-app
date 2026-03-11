import { notFound } from "next/navigation"
import { getRecipeById, getRecipeCategories, getRecipeFamilies } from "@/modules/gastrolab/actions/recipes"
import { getIngredientsForSelect } from "@/modules/gastrolab/actions/ingredients"
import { getMeasureUnits } from "@/modules/gastrolab/actions/settings"
import { RecipeForm } from "../../_components/recipe-form"
import { Header } from "@/components/layout/header"

interface EditRecipePageProps {
    params: Promise<{ id: string }>
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
    const { id } = await params

    const [recipe, categories, families, ingredients, units] = await Promise.all([
        getRecipeById(id),
        getRecipeCategories(),
        getRecipeFamilies(),
        getIngredientsForSelect(),
        getMeasureUnits(),
    ])

    if (!recipe) {
        notFound()
    }

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="gastrolab.recipes.edit"
                backHref="/gastrolab/recipes"
            />

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <RecipeForm
                        initialData={recipe}
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
