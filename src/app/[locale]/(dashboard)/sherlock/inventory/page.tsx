import { Header } from "@/components/layout/header"
import { Button } from "@/modules/shared/ui/button"
import { Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { getInventoryRecords } from "@/modules/sherlock/actions/inventory"
import { InventoryTable } from "./_components/inventory-table"

export default async function InventoryPage() {
    const records = await getInventoryRecords()

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Header
                titleKey="sherlock.inventory.title"
                descriptionKey="sherlock.inventory.description"
            >
                <Button asChild>
                    <Link href="/sherlock/inventory/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Registro
                    </Link>
                </Button>
            </Header>

            <div className="grid gap-4">
                <InventoryTable data={records as any} />
            </div>
        </div>
    )
}
