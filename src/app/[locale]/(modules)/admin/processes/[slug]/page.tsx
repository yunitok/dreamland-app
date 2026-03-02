import { Header } from "@/components/layout/header"
import { ProcessDetail } from "@/modules/admin/ui/processes/process-detail"
import { getProcessHistory } from "@/modules/admin/actions/processes"
import { getProcessDefinition } from "@/modules/admin/domain/process-registry"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

export default async function ProcessDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const definition = getProcessDefinition(slug)
  if (!definition) notFound()

  const { runs, total } = await getProcessHistory(slug)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title={definition.name}
        description={definition.description}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <ProcessDetail
          definition={definition}
          runs={runs}
          total={total}
        />
      </div>
    </div>
  )
}
