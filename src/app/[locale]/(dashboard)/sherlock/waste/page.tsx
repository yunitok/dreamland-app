import { Header } from "@/components/layout/header"
import { Button } from "@/modules/shared/ui/button"
import { Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getWasteRecords } from "@/modules/sherlock/actions/waste"
import { WasteTable } from "./_components/waste-table"

export default async function WastePage() {
    const wasteRecords = await getWasteRecords()

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="sherlock.waste.title"
                descriptionKey="sherlock.waste.description"
            >
                <Button size="sm" asChild>
                    <Link href="/sherlock/waste/new">
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="hidden md:inline">Registrar Merma</span>
                        <span className="md:hidden">Nuevo</span>
                    </Link>
                </Button>
            </Header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                <WasteTable data={wasteRecords as any} />
            </div>
        </div>
    )
}
