import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { setRequestLocale } from "next-intl/server"
import { getEmailCategories } from "@/modules/atc/actions/backoffice"
import { EmailCategoryManager } from "@/modules/atc/ui/backoffice/email-category-manager"

export default async function EmailCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const result = await getEmailCategories()
  const categories = result.data ?? []

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Categorías de Email"
        description="Gestiona las categorías usadas para clasificar automáticamente los correos entrantes"
        backHref="/atc/backoffice"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <EmailCategoryManager categories={categories} />
        </Suspense>
      </div>
    </div>
  )
}
