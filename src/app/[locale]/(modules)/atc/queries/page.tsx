import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getQueries, getQueryCategories } from "@/modules/atc/actions/queries"
import { QueriesTable } from "@/modules/atc/ui/queries/queries-table"
import { RagChat } from "@/modules/atc/ui/queries/rag-chat"
import { getSession } from "@/lib/auth"

export default async function AtcQueriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const [queriesResult, categoriesResult, session] = await Promise.all([
    getQueries(),
    getQueryCategories(),
    getSession(),
  ])
  const isAdmin = session?.user?.role === "SUPER_ADMIN"

  if (!queriesResult.success) {
    return <div className="p-8">{t("errorLoading")}</div>
  }

  const categories = categoriesResult.data ?? []

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("queriesTitle")}
        description={t("queriesDescription")}
        backHref="/atc"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full">
        <Tabs defaultValue="chat">
          <TabsList className="mb-6">
            <TabsTrigger value="chat">Chat IA</TabsTrigger>
            <TabsTrigger value="queries">Historial de consultas</TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <RagChat categories={categories} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="queries">
            <Suspense fallback={<Skeleton className="h-100 w-full" />}>
              <QueriesTable
                data={queriesResult.data ?? []}
                categories={categories}
              />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
