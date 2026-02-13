import { Header } from "@/components/layout/header"
import { Card, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { Link } from "@/i18n/navigation"
import { Users, Database, ShieldCheck } from "lucide-react"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { requirePermission } from "@/lib/actions/rbac"

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  
  // Double check permission (layout handles it, but good practice)
  await requirePermission('admin', 'manage')
  const t = await getTranslations("admin")

  const modules = [
    {
      title: t("usersTitle"),
      description: t("usersDescription"),
      href: "/admin/users",
      icon: Users
    },
    {
      title: t("roles"),
      description: t("manageRolesDescription"),
      href: "/admin/roles",
      icon: ShieldCheck
    },
    {
      title: "Database Seed", 
      description: "Initialize or reset database data",
      href: "/admin/seed",
      icon: Database
    }
  ]

  return (
    <div className="flex flex-col h-full">
       <Header 
         title={t("title")} 
         description="System controls and configuration" 
       />
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 p-4 md:p-8">
         {modules.map((module) => (
           <Link key={module.href} href={module.href}>
             <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
               <CardHeader>
                 <div className="flex items-center gap-2 mb-2">
                   <module.icon className="h-5 w-5 text-primary" />
                   <CardTitle className="text-lg">{module.title}</CardTitle>
                 </div>
                 <CardDescription>{module.description}</CardDescription>
               </CardHeader>
             </Card>
           </Link>
         ))}
       </div>
    </div>
  )
}
