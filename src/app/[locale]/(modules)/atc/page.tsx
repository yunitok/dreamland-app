import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { Link } from "@/i18n/navigation"
import { CalendarDays, MessageSquare, AlertTriangle, Archive, BookOpen, BarChart3 } from "lucide-react"
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

  const categories = [
    {
      label: t("dailyManagement"),
      accent: "border-blue-500",
      items: [
        {
          title: t("reservationsTitle"),
          description: t("reservationsDescription"),
          href: "/atc/reservations",
          icon: CalendarDays,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          show: true,
        },
        {
          title: t("queriesTitle"),
          description: t("queriesDescription"),
          href: "/atc/queries",
          icon: MessageSquare,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
          show: true,
        },
        {
          title: t("operationsTitle"),
          description: t("operationsDescription"),
          href: "/atc/operations",
          icon: AlertTriangle,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          show: true,
        },
      ],
    },
    {
      label: t("administration"),
      accent: "border-purple-500",
      items: [
        {
          title: t("backofficeTitle"),
          description: t("backofficeDescription"),
          href: "/atc/backoffice",
          icon: Archive,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
          show: true,
        },
        {
          title: t("analyticsTitle"),
          description: t("analyticsDescription"),
          href: "/atc/analytics",
          icon: BarChart3,
          color: "text-indigo-500",
          bg: "bg-indigo-500/10",
          show: true,
        },
        {
          title: "Base de Conocimiento",
          description: "Gestión del contenido RAG: espacios, accesibilidad y alérgenos",
          href: "/atc/knowledge-base",
          icon: BookOpen,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
          show: canManage,
        },
      ],
    },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title={t("title")}
        description={t("description")}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col gap-8">
          {categories.map((category) => {
            const visibleItems = category.items.filter(s => s.show)
            if (visibleItems.length === 0) return null
            return (
              <div key={category.label} className="space-y-3">
                <h3 className={`text-sm font-medium text-muted-foreground uppercase tracking-wide border-l-[3px] ${category.accent} pl-2`}>
                  {category.label}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visibleItems.map((section) => (
                    <Link key={section.href} href={section.href}>
                      <Card className="h-full py-4 gap-3 transition-all hover:bg-accent/50 hover:shadow-md cursor-pointer">
                        <CardHeader className="space-y-2.5 px-4 gap-0">
                          <div className={`p-2 rounded-lg ${section.bg} w-fit`}>
                            <section.icon className={`h-4 w-4 ${section.color}`} />
                          </div>
                          <CardTitle className="text-sm font-semibold">{section.title}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 px-4">
                          <CardDescription className="text-xs leading-relaxed">
                            {section.description}
                          </CardDescription>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
