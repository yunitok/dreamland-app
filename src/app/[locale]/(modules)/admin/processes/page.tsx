import { Header } from "@/components/layout/header"
import { ProcessDashboard } from "@/modules/admin/ui/processes/process-dashboard"
import { getProcessDashboard } from "@/modules/admin/actions/processes"
import { setRequestLocale } from "next-intl/server"

export default async function ProcessesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const data = await getProcessDashboard()

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Procesos Automáticos"
        description="Panel de control de procesos automáticos"
        backHref="/admin"
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <ProcessDashboard initialData={data} />
      </div>
    </div>
  )
}
