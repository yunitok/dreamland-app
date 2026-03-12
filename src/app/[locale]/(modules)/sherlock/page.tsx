import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/actions/rbac";
import { Link } from "@/i18n/navigation";
import {
  Refrigerator,
  Trash2,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Header } from "@/components/layout/header";
import { StockAlertsCard } from "./_components/stock-alerts-card";
import { SherlockSummary } from "./_components/sherlock-summary";

export default async function SherlockDashboard() {
  await requirePermission('sherlock', 'read')

  const t = await getTranslations("sherlock");

  const modules = [
    {
      title: t("inventory.title"),
      description: t("inventory.description"),
      href: "/sherlock/inventory",
      icon: Refrigerator,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: t("waste.title"),
      description: t("waste.description"),
      href: "/sherlock/waste",
      icon: Trash2,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: t("theoreticalVsReal"),
      description: t("theoreticalVsRealDesc"),
      href: "/sherlock/food-cost",
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: t("wasteAnalytics.title"),
      description: t("wasteAnalytics.description"),
      href: "/sherlock/waste-analytics",
      icon: BarChart3,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sherlock.title"
        descriptionKey="sherlock.description"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* KPIs de resumen + banner de fiabilidad de datos */}
          <SherlockSummary />

          {/* Módulos operativos */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide border-l-[3px] border-emerald-500 pl-2">
              {t("costControl")}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((module) => (
                <Link key={module.href} href={module.href}>
                  <Card className="h-full py-4 gap-3 transition-all hover:bg-accent/50 hover:shadow-md cursor-pointer">
                    <CardHeader className="space-y-2.5 px-4 gap-0">
                      <div className={`w-fit p-2 rounded-lg ${module.bg}`}>
                        <module.icon className={`h-4 w-4 ${module.color}`} />
                      </div>
                      <CardTitle className="text-sm font-semibold">{module.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 px-4">
                      <CardDescription className="text-xs leading-relaxed">
                        {module.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Alertas de Stock */}
          <StockAlertsCard
            title={t("stockAlerts")}
            description={t("stockAlertsDesc")}
          />
        </div>
      </div>
    </div>
  );
}
