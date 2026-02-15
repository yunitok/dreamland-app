import { Header } from "@/components/layout/header"
import { InventoryForm } from "../_components/inventory-form"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"

export default async function NewInventoryPage() {
    const ingredients = await getIngredients({})

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Header
                titleKey="sherlock.inventory.new.title"
                descriptionKey="sherlock.inventory.new.description"
            />

            <div className="mx-auto">
                <InventoryForm ingredients={ingredients as any} />
            </div>
        </div>
    )
}
