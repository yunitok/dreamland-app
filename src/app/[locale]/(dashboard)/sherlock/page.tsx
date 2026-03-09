import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/actions/rbac";
import { Link } from "@/i18n/navigation";
import {
  Scale,
  ChefHat,
  Refrigerator,
  Trash2,
  Settings,
  TrendingUp,
  AlertTriangle,
  History,
  Plug,
  ShieldCheck,
  BookOpen,
  Bot,
  BarChart3,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Header } from "@/components/layout/header";

export default async function SherlockDashboard() {
  await requirePermission('sherlock', 'read')

  const t = await getTranslations("sherlock");

  const categories = [
    {
      label: "Inteligencia Artificial",
      accent: "border-red-500",
      items: [
        {
          title: "Chat IA Sherlock",
          description: "Asistente inteligente basado en la base de conocimiento.",
          href: "/sherlock/chat",
          icon: Bot,
          color: "text-pink-500",
          bg: "bg-pink-500/10",
          badge: { label: "AI", className: "bg-pink-500/15 text-pink-500" },
        },
        {
          title: "Base de Conocimiento",
          description: "Gestión del contenido RAG para recetas e ingredientes.",
          href: "/sherlock/knowledge-base",
          icon: BookOpen,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
        },
        {
          title: "Auditoría IA",
          description: "Verificación por voz y detección de anomalías.",
          href: "/sherlock/audits",
          icon: History,
          color: "text-amber-500",
          bg: "bg-amber-500/10",
          badge: { label: "Nuevo", className: "bg-teal-500/15 text-teal-500" },
        },
      ],
    },
    {
      label: "Gestión de Cocina",
      accent: "border-emerald-500",
      items: [
        {
          title: "Ingredientes & Productos",
          description: "Fichas técnicas, alérgenos y precios.",
          href: "/sherlock/ingredients",
          icon: Scale,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          title: "Recetario & Escandallos",
          description: "Recetas detalladas y costes teóricos.",
          href: "/sherlock/recipes",
          icon: ChefHat,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
        {
          title: "Inventario & Stock",
          description: "Control de existencias y caducidades.",
          href: "/sherlock/inventory",
          icon: Refrigerator,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
        },
        {
          title: "Control de Mermas",
          description: "Registro de desperdicios y análisis.",
          href: "/sherlock/waste",
          icon: Trash2,
          color: "text-red-500",
          bg: "bg-red-500/10",
        },
      ],
    },
    {
      label: "Análisis",
      accent: "border-indigo-500",
      items: [
        {
          title: "Analytics de Comensales",
          description: "Tendencias y patrones de ocupacion.",
          href: "/sherlock/analytics",
          icon: BarChart3,
          color: "text-indigo-500",
          bg: "bg-indigo-500/10",
        },
        {
          title: "Ventas Agora",
          description: "Facturacion, ticket medio, familias y productos del TPV.",
          href: "/sherlock/sales",
          icon: ShoppingCart,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          badge: { label: "Nuevo", className: "bg-teal-500/15 text-teal-500" },
        },
      ],
    },
    {
      label: "Herramientas",
      accent: "border-amber-500",
      items: [
        {
          title: "Configuración",
          description: "Ajustes del sistema.",
          href: "/sherlock/settings",
          icon: Settings,
          color: "text-slate-500",
          bg: "bg-slate-500/10",
        },
        {
          title: "Sandbox de Integraciones",
          description: "Explora y prueba las APIs de Yurest y GStock.",
          href: "/sherlock/sandbox",
          icon: Plug,
          color: "text-teal-500",
          bg: "bg-teal-500/10",
        },
        {
          title: "Calidad de Datos",
          description: "Auditoría de normalización y consistencia.",
          href: "/sherlock/data-quality",
          icon: ShieldCheck,
          color: "text-cyan-500",
          bg: "bg-cyan-500/10",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="sherlock.title"
        descriptionKey="sherlock.description"
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col gap-8">

          {categories.map((category) => (
            <div key={category.label} className="space-y-3">
              <h3 className={`text-sm font-medium text-muted-foreground uppercase tracking-wide border-l-[3px] ${category.accent} pl-2`}>
                {category.label}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.items.map((module) => (
                  <Link key={module.href} href={module.href}>
                    <Card className="h-full py-4 gap-3 transition-all hover:bg-accent/50 hover:shadow-md cursor-pointer">
                      <CardHeader className="space-y-2.5 px-4 gap-0">
                        <div className="flex items-start justify-between">
                          <div className={`p-2 rounded-lg ${module.bg}`}>
                            <module.icon className={`h-4 w-4 ${module.color}`} />
                          </div>
                          {"badge" in module && module.badge && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${module.badge.className}`}>
                              {module.badge.label}
                            </span>
                          )}
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
          ))}

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
