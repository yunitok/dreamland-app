import { Header } from "@/components/layout/header"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"
import { WasteForm } from "../_components/waste-form"

export default async function NewWastePage() {
    const ingredients = await getIngredients({})

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Header
                title="Registrar Merma"
                description="Indica el ingrediente, la cantidad y el motivo del desperdicio."
            />

            <div className="mx-auto">
                <WasteForm ingredients={ingredients as any} />
            </div>
        </div>
    )
}
