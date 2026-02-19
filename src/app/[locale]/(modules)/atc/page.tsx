import { Header } from "@/components/layout/header"
import { Card, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { Link } from "@/i18n/navigation"
import { CalendarDays, MessageSquare, AlertTriangle, Archive, BookOpen } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"

export default async function AtcDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("atc")
  const session = await getSession()
  const canManage = hasPermission(session?.user as any, "manage", "atc")

  const sections = [
    {
      title: t("reservationsTitle"),
      description: t("reservationsDescription"),
      href: "/atc/reservations",
      icon: CalendarDays,
      show: true,
    },
    {
      title: t("queriesTitle"),
      description: t("queriesDescription"),
      href: "/atc/queries",
      icon: MessageSquare,
      show: true,
    },
    {
      title: t("operationsTitle"),
      description: t("operationsDescription"),
      href: "/atc/operations",
      icon: AlertTriangle,
      show: true,
    },
    {
      title: t("backofficeTitle"),
      description: t("backofficeDescription"),
      href: "/atc/backoffice",
      icon: Archive,
      show: true,
    },
    {
      title: "Base de Conocimiento",
      description: "Gestión del contenido RAG: espacios, accesibilidad y alérgenos",
      href: "/atc/knowledge-base",
      icon: BookOpen,
      show: canManage,
    },
  ].filter(s => s.show)

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
