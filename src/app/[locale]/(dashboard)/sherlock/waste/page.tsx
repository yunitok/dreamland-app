import { Header } from "@/components/layout/header"
import { Button } from "@/modules/shared/ui/button"
import { Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getWasteRecords } from "@/modules/sherlock/actions/waste"
import { WasteTable } from "./_components/waste-table"

export default async function WastePage() {
    const wasteRecords = await getWasteRecords()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <Header
                    titleKey="sherlock.waste.title"
                    descriptionKey="sherlock.waste.description"
                />
                <Button asChild>
                    <Link href="/sherlock/waste/new">
                        <Plus className="mr-2 h-4 w-4" /> Registrar Merma
                    </Link>
                </Button>
            </div>
            <WasteTable data={wasteRecords as any} />
        </div>
    )
}
