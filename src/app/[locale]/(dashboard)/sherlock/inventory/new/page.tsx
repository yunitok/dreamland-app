import { Header } from "@/components/layout/header"
import { InventoryForm } from "../_components/inventory-form"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"

export default async function NewInventoryPage() {
    const ingredients = await getIngredients({})

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="sherlock.inventory.new.title"
                descriptionKey="sherlock.inventory.new.description"
                backHref="/sherlock/inventory"
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                <div className="max-w-4xl mx-auto">
                    <InventoryForm ingredients={ingredients as any} />
                </div>
            </div>
        </div>
    )
}
