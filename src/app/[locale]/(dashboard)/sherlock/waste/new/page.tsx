import { Header } from "@/components/layout/header"
import { getIngredients } from "@/modules/sherlock/actions/ingredients"
import { WasteForm } from "../_components/waste-form"

export default async function NewWastePage() {
    const ingredients = await getIngredients({})

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                title="Registrar Merma"
                description="Indica el ingrediente, la cantidad y el motivo del desperdicio."
                backHref="/sherlock/waste"
            />

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                <div className="max-w-4xl mx-auto">
                    <WasteForm ingredients={ingredients as any} />
                </div>
            </div>
        </div>
    )
}
