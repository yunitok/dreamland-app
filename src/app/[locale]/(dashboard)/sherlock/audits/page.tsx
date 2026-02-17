import { Header } from "@/components/layout/header"
import { getVoiceAudits } from "@/modules/sherlock/actions/audits"
import { AuditTable } from "./_components/audit-table"

export default async function AuditsPage() {
    const audits = await getVoiceAudits()

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <Header
                titleKey="sherlock.audits.title"
                descriptionKey="sherlock.audits.description"
            />
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-6">
                <AuditTable data={audits as any} />
            </div>
        </div>
    )
}
