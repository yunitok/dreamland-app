import { Header } from "@/components/layout/header"
import { Button } from "@/modules/shared/ui/button"
import { Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getInventoryRecords } from "@/modules/sherlock/actions/inventory"
import { InventoryTable } from "./_components/inventory-table"

export default async function InventoryPage() {
    const records = await getInventoryRecords()

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="sherlock.inventory.title"
                descriptionKey="sherlock.inventory.description"
            >
                <Button size="sm" asChild className="h-8 sm:h-9">
                    <Link href="/sherlock/inventory/new">
                        <Plus className="sm:mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Nuevo Registro</span>
                        <span className="sm:hidden text-xs">Nuevo</span>
                    </Link>
                </Button>
            </Header>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                <InventoryTable data={records as any} />
            </div>
        </div>
    )
}
