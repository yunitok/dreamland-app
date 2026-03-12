import { Header } from "@/components/layout/header"
import { InventoryForm } from "../../_components/inventory-form"
import { getIngredients } from "@/modules/gastrolab/actions/ingredients"
import { getInventoryRecord, getLocationsForSelect } from "@/modules/sherlock/actions/inventory"
import { notFound } from "next/navigation"

interface EditInventoryPageProps {
    params: {
        id: string
    }
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
    const [record, ingredients, locations] = await Promise.all([
        getInventoryRecord(params.id),
        getIngredients({}),
        getLocationsForSelect(),
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
                <InventoryForm initialData={record} ingredients={ingredients as any} locations={locations} />
            </div>
        </div>
    )
}
