import { Suspense } from "react"
import { Header } from "@/components/layout/header"
import { Skeleton } from "@/modules/shared/ui/skeleton"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getEmailInbox, getInvoices, getGiftVouchers, getEmailCategories, getEmailsByCategory } from "@/modules/atc/actions/backoffice"
import { BackofficeView } from "@/modules/atc/ui/backoffice/backoffice-view"
import { getSession } from "@/lib/auth"

export default async function AtcBackofficePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const [session, inboxResult, invoicesResult, vouchersResult, categoriesResult, invoiceEmailsResult, voucherEmailsResult] = await Promise.all([
    getSession(),
    getEmailInbox(),
    getInvoices(),
    getGiftVouchers(),
    getEmailCategories(),
    getEmailsByCategory(["facturacion"]),
    getEmailsByCategory(["bonos"]),
  ])
  const isSuperAdmin = session?.user.role === "SUPER_ADMIN"

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title={t("backofficeTitle")}
        description={t("backofficeDescription")}
        backHref="/atc"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full space-y-8">
        <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
          <BackofficeView
            emails={inboxResult.data ?? []}
            invoices={invoicesResult.data ?? []}
            vouchers={vouchersResult.data ?? []}
            categories={categoriesResult.data ?? []}
            canDelete={isSuperAdmin}
            invoiceEmails={invoiceEmailsResult.data ?? []}
            voucherEmails={voucherEmailsResult.data ?? []}
          />
        </Suspense>
      </div>
    </div>
  )
}
