import { getTranslations } from "next-intl/server";
import { requirePermission } from "@/lib/actions/rbac";
import { Link } from "@/i18n/navigation";
import {
  Scale,
  ChefHat,
  Settings,
  BookOpen,
  Bot,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card";
import { Header } from "@/components/layout/header";

export default async function GastrolabDashboard() {
  await requirePermission('gastrolab', 'read')

  const t = await getTranslations("gastrolab");

  const categories = [
    {
      label: "Inteligencia Artificial",
      accent: "border-red-500",
      items: [
        {
          title: "Chat IA GastroLab",
          description: "Asistente inteligente basado en la base de conocimiento.",
          href: "/gastrolab/chat",
          icon: Bot,
          color: "text-pink-500",
          bg: "bg-pink-500/10",
          badge: { label: "AI", className: "bg-pink-500/15 text-pink-500" },
        },
        {
          title: "Base de Conocimiento",
          description: "Gestión del contenido RAG para recetas e ingredientes.",
          href: "/gastrolab/knowledge-base",
          icon: BookOpen,
          color: "text-orange-500",
          bg: "bg-orange-500/10",
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
          href: "/gastrolab/ingredients",
          icon: Scale,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
        },
        {
          title: "Recetario & Escandallos",
          description: "Recetas detalladas y costes teóricos.",
          href: "/gastrolab/recipes",
          icon: ChefHat,
          color: "text-emerald-500",
          bg: "bg-emerald-500/10",
        },
      ],
    },
    {
      label: "Herramientas",
      accent: "border-amber-500",
      items: [
        {
          title: "Configuración",
          description: "Unidades, categorías, proveedores y sincronización.",
          href: "/gastrolab/settings",
          icon: Settings,
          color: "text-slate-500",
          bg: "bg-slate-500/10",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        titleKey="gastrolab.title"
        descriptionKey="gastrolab.description"
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
        </div>
      </div>
    </div>
  );
}
