import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { setRequestLocale } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"
import { getAllKBEntries, getKBStats } from "@/modules/rag/actions/knowledge-base"
import { KnowledgeBaseTable } from "@/modules/rag/ui/knowledge-base-table"
import { KnowledgeBaseDialog } from "@/modules/rag/ui/knowledge-base-dialog"
import { KBImportPanel } from "@/modules/rag/ui/kb-import-panel"
import { prisma } from "@/lib/prisma"
// Asegurar registro de dominios
import "@/modules/rag/domain/register-domains"

async function KBStatsCards({ stats }: {
  stats: {
    total: number
    active: number
    inactive: number
    bySource: { source: string; count: number }[]
    byDomain: { domain: string; count: number }[]
  }
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Total entries</p>
        <p className="text-2xl font-bold">{stats.total}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Activas</p>
        <p className="text-2xl font-bold text-green-600">{stats.active}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Inactivas</p>
        <p className="text-2xl font-bold text-amber-600">{stats.inactive}</p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">Dominios</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {stats.byDomain.map(d => (
            <span key={d.domain} className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
              {d.domain} ({d.count})
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function AdminKnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  await requirePermission("knowledge-base", "read")

  const [kbResult, statsResult, categories] = await Promise.all([
    getAllKBEntries(),
    getKBStats(),
    prisma.queryCategory.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!kbResult.success) {
    return <div className="p-8">Error cargando la base de conocimiento</div>
  }

  const stats = statsResult.data

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Base de Conocimiento Global"
        description="Vista centralizada de todos los dominios RAG del sistema"
        backHref="/admin"
      >
        <KBImportPanel domain="atc" categories={categories} />
        <KnowledgeBaseDialog domain="atc" categories={categories} showDomainsSelector />
      </Header>

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-6">
        <KBStatsCards stats={stats} />

        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <KnowledgeBaseTable
            data={kbResult.data ?? []}
            domain="atc"
            categories={categories}
            showDomainColumn
          />
        </Suspense>
      </div>
    </div>
  )
}
