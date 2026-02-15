import { Header } from "@/components/layout/header"
import { InventoryForm } from "../../_components/inventory-form"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"
import { getInventoryRecord } from "@/modules/sherlock/actions/inventory"
import { notFound } from "next/navigation"

interface EditInventoryPageProps {
    params: {
        id: string
    }
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
    const [record, ingredients] = await Promise.all([
        getInventoryRecord(params.id),
        getIngredients({})
    ])

    if (!record) {
        notFound()
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Header
                titleKey="sherlock.inventory.edit.title"
                descriptionKey="sherlock.inventory.edit.description"
            />

            <div className="mx-auto">
                <InventoryForm initialData={record} ingredients={ingredients as any} />
            </div>
        </div>
    )
}
