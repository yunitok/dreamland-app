import { Header } from "@/components/layout/header"
import { AgentDashboard } from "@/modules/admin/ui/agents/agent-dashboard"
import { getAgentDashboard } from "@/modules/admin/actions/agents"
import { setRequestLocale } from "next-intl/server"

export default async function AgentsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const data = await getAgentDashboard()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Agentes Autónomos"
        description="Panel de control del ecosistema agéntico"
        backHref="/admin"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <AgentDashboard initialData={data} />
      </div>
    </div>
  )
}
