import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/actions/rbac";
import { Link } from "@/i18n/navigation";
import {
  BarChart3,
  ShoppingCart,
  Plug,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Header } from "@/components/layout/header";

export default async function AnalyticsDashboard() {
  await requirePermission('analytics', 'read')

  const t = await getTranslations("analytics");

  const modules = [
    {
      title: t("covers.title"),
      description: t("covers.description"),
      href: "/analytics/covers",
      icon: BarChart3,
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
    },
    {
      title: t("sales.title"),
      description: t("sales.description"),
      href: "/analytics/sales",
      icon: ShoppingCart,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: t("sandbox.title"),
      description: t("sandbox.description"),
      href: "/analytics/sandbox",
      icon: Plug,
      color: "text-teal-500",
      bg: "bg-teal-500/10",
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="analytics.title"
        descriptionKey="analytics.description"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
