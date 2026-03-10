import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { setRequestLocale } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { getKBEntries } from "@/modules/rag/actions/knowledge-base"
import { KnowledgeBaseTable } from "@/modules/rag/ui/knowledge-base-table"
import { KnowledgeBaseDialog } from "@/modules/rag/ui/knowledge-base-dialog"
import { KBImportPanel } from "@/modules/rag/ui/kb-import-panel"
import "@/modules/rag/domain/register-domains"

const DOMAIN = "gastrolab"

export default async function GastrolabKnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requirePermission("gastrolab", "manage")

  const kbResult = await getKBEntries(DOMAIN)

  if (!kbResult.success) {
    return <div className="p-8">Error al cargar la base de conocimiento</div>
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Base de Conocimiento"
        description="Gestión del contenido RAG para recetas, ingredientes y alérgenos"
        backHref="/gastrolab"
      >
        <KBImportPanel domain={DOMAIN} categories={[]} />
        <KnowledgeBaseDialog domain={DOMAIN} categories={[]} />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <KnowledgeBaseTable
            data={kbResult.data ?? []}
            domain={DOMAIN}
            categories={[]}
          />
        </Suspense>
      </div>
    </div>
  )
}
