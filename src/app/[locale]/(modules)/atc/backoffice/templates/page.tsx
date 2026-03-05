import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { setRequestLocale } from "next-intl/server"
import { getAllEmailTemplates } from "@/modules/atc/actions/email-templates"
import { getEmailCategories } from "@/modules/atc/actions/backoffice"
import { EmailTemplateManager } from "@/modules/atc/ui/backoffice/email-template-manager"

export default async function EmailTemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [templatesResult, categoriesResult] = await Promise.all([
    getAllEmailTemplates(),
    getEmailCategories(),
  ])

  const templates = templatesResult.data ?? []
  const categories = (categoriesResult.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }))

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Plantillas de Email"
        description="Gestiona plantillas de respuesta para agilizar la comunicación con los clientes"
        backHref="/atc/backoffice"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <EmailTemplateManager templates={templates} categories={categories} />
        </Suspense>
      </div>
    </div>
  )
}
