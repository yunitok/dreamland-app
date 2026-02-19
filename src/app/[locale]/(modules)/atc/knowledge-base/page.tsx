import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { getKnowledgeBaseEntries } from "@/modules/atc/actions/knowledge-base"
import { getQueryCategories } from "@/modules/atc/actions/queries"
import { KnowledgeBaseTable } from "@/modules/atc/ui/knowledge-base/knowledge-base-table"
import { KnowledgeBaseDialog } from "@/modules/atc/ui/knowledge-base/knowledge-base-dialog"
import { KBImportPanel } from "@/modules/atc/ui/knowledge-base/kb-import-panel"

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requirePermission("atc", "manage")
  const t = await getTranslations("atc")

  const [kbResult, categoriesResult] = await Promise.all([
    getKnowledgeBaseEntries(),
    getQueryCategories(),
  ])

  if (!kbResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  const categories = categoriesResult.data ?? []

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Base de Conocimiento"
        description="Gestión del contenido para el asistente RAG de espacios, accesibilidad y alérgenos"
        backHref="/atc"
      >
        <KBImportPanel categories={categories} />
        <KnowledgeBaseDialog categories={categories} />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <KnowledgeBaseTable
            data={kbResult.data ?? []}
            categories={categories}
          />
        </Suspense>
      </div>
    </div>
  )
}
