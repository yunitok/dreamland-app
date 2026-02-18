import { Header } from "@/components/layout/header"
import { Card, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { Link } from "@/i18n/navigation"
import { CalendarDays, MessageSquare, AlertTriangle, Archive } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function AtcDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")

  const sections = [
    {
      title: t("reservationsTitle"),
      description: t("reservationsDescription"),
      href: "/atc/reservations",
      icon: CalendarDays,
    },
    {
      title: t("queriesTitle"),
      description: t("queriesDescription"),
      href: "/atc/queries",
      icon: MessageSquare,
    },
    {
      title: t("operationsTitle"),
      description: t("operationsDescription"),
      href: "/atc/operations",
      icon: AlertTriangle,
    },
    {
      title: t("backofficeTitle"),
      description: t("backofficeDescription"),
      href: "/atc/backoffice",
      icon: Archive,
    },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title={t("title")}
        description={t("description")}
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl">
          {sections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <section.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
