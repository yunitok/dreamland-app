import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/actions/rbac'
import { FileText } from 'lucide-react'
import { Header } from "@/components/layout/header"
import { ReportCard } from "@/modules/reports/ui/report-card"
import { setRequestLocale } from "next-intl/server"

export const metadata = {
  title: 'Informes | Dreamland',
  description: 'Historial de informes generados por IA'
}

export default async function ReportsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const auth = await requireAuth()
  if (!auth.authenticated) return <div>Acceso denegado</div>

  const reports = await prisma.report.findMany({
    where: { OR: [{ authorId: auth.userId }, { authorId: null }] },
    orderBy: { createdAt: 'desc' },
    include: { project: true }
  })

  return (
    <div className="flex flex-col ai-glow min-h-full">
      <Header 
        titleKey="reports.title"
        descriptionKey="reports.headerDescription"
      />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}

          {reports.length === 0 && (
            <div className="col-span-full text-center py-20 bg-muted/30 rounded-lg border border-dashed">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
              <h3 className="text-lg font-medium">No hay informes generados</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                Usa el asistente de voz diciendo &quot;Genera un reporte&quot; para crear tu primer informe de inteligencia.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
