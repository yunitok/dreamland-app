import { Suspense } from "react"
import { Link } from "@/i18n/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { RecipesTable } from "./_components/recipes-table"
import { getRecipes, getRecipeCategories, getRecipeFamilies } from "@/modules/sherlock/actions/recipes"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Header } from "@/components/layout/header"
import { getTranslations } from "next-intl/server"

export default async function RecipesPage() {
    const t = await getTranslations("sherlock.recipes")
    const [recipes, categories, families] = await Promise.all([
        getRecipes(),
        getRecipeCategories(),
        getRecipeFamilies(),
    ])

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="sherlock.recipes.title"
                descriptionKey="sherlock.recipes.description"
                backHref="/sherlock"
            >
                <div className="flex items-center gap-2">
                    <Button size="sm" asChild className="h-8 sm:h-9">
                        <Link href="/sherlock/recipes/new">
                            <Plus className="sm:mr-2 h-4 w-4" />
                            <span className="hidden sm:inline">{t("new")}</span>
                            <span className="sm:hidden text-xs">Nuevo</span>
                        </Link>
                    </Button>
                </div>
            </Header>

            <div className="flex-1 p-6 overflow-y-auto">
                <div className="flex flex-col gap-6 max-w-7xl mx-auto">

                    <Card>
                        <CardHeader>
                            <CardTitle>Listado de Recetas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Suspense fallback={<div>Cargando recetas...</div>}>
                                <RecipesTable data={recipes} />
                            </Suspense>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
