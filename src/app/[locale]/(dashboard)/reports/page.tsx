import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/actions/rbac'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { FileText, Calendar, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Informes | Dreamland',
  description: 'Historial de informes generados por IA'
}

export default async function ReportsPage() {
  const auth = await requireAuth()
  if (!auth.authenticated) return <div>Acceso denegado</div>

  const reports = await prisma.report.findMany({
    where: { OR: [{ authorId: auth.userId }, { authorId: null }] },
    orderBy: { createdAt: 'desc' },
    include: { project: true }
  })

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Informes</h1>
          <p className="text-muted-foreground mt-2">
            Historial de inteligencia y reportes de estado generados por IA.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg leading-tight line-clamp-2">
                    {report.title}
                  </CardTitle>
                  <CardDescription>
                    {report.project?.title || 'Sin Proyecto Asignado'}
                  </CardDescription>
                </div>
                <div className="bg-primary/10 text-primary p-2 rounded-full">
                  <FileText className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-2 h-4 w-4" />
                {format(new Date(report.createdAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
              </div>
              <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                {report.content.replace(/[#*]/g, '').substring(0, 150)}...
              </p>
            </CardContent>
            <CardFooter className="pt-3 border-t bg-muted/20">
              <Button asChild className="w-full" variant="ghost">
                <Link href={`/reports/${report.id}`}>
                  Ver Reporte Completo <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted/30 rounded-lg border border-dashed">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-medium">No hay informes generados</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mt-2">
              Usa el asistente de voz diciendo "Genera un reporte" para crear tu primer informe de inteligencia.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
