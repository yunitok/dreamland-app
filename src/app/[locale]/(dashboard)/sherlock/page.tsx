import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Scale,
  ChefHat,
  Refrigerator,
  Trash2,
  Settings,
  TrendingUp,
  AlertTriangle,
  History
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Header } from "@/components/layout/header";

export default async function SherlockDashboard() {
  const t = await getTranslations("sherlock");

  const modules = [
    {
      title: "Ingredientes & Productos",
      description: "Gestión de fichas técnicas, alérgenos y precios.",
      href: "/sherlock/ingredients",
      icon: Scale,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Recetario & Escandallos",
      description: "Recetas detalladas, sub-recetas y costes teóricos.",
      href: "/sherlock/recipes",
      icon: ChefHat,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Inventario & Stock",
      description: "Control de existencias, lotes y caducidades.",
      href: "/sherlock/inventory",
      icon: Refrigerator,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "Control de Mermas",
      description: "Registro de desperdicios y análisis de causas.",
      href: "/sherlock/waste",
      icon: Trash2,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      title: "Auditoría IA",
      description: "Verificación de procesos por voz y detección de anomalías.",
      href: "/sherlock/audits",
      icon: History,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Configuración",
      description: "Unidades, categorías, proveedores y parámetros globales.",
      href: "/sherlock/settings",
      icon: Settings,
      color: "text-slate-500",
      bg: "bg-slate-500/10",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <Header
        titleKey="sherlock.title"
        descriptionKey="sherlock.description"
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <Link key={module.href} href={module.href}>
                <Card className="h-full transition-all hover:bg-accent/50 hover:shadow-md cursor-pointer border-l-4 border-l-transparent hover:border-l-primary/50">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className={`p-2 rounded-lg ${module.bg}`}>
                      <module.icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <div className="flex flex-col">
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {module.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Rentabilidad Teórica vs Real
                </CardTitle>
                <CardDescription>Comparativa mensual de costes</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                Gráfico de Rentabilidad (Coming Soon)
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertas de Stock
                </CardTitle>
                <CardDescription>Ingredientes bajo mínimo o próximos a caducar</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                Lista de Alertas (Coming Soon)
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
