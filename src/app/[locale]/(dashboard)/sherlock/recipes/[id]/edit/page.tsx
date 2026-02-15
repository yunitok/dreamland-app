import { notFound } from "next/navigation"
import { getRecipeById, getRecipeCategories, getRecipeFamilies } from "@/modules/sherlock/actions/recipes"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"
import { getMeasureUnits } from "@/modules/sherlock/actions/settings"
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
        getIngredients({}),
        getMeasureUnits(),
    ])

    if (!recipe) {
        notFound()
    }

    return (
        <div className="flex flex-col h-[calc(100vh-65px)]">
            <Header
                titleKey="sherlock.recipes.edit"
                backHref="/sherlock/recipes"
            />

            <div className="flex-1 p-6 overflow-auto">
                <div className="max-w-5xl mx-auto">
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
