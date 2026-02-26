import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/actions/rbac"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Separator } from "@/modules/shared/ui/separator"
import { Mail, Calendar, CalendarClock, Tag, Zap, Brain } from "lucide-react"

const priorityLabels: Record<number, string> = {
  5: "Urgente",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Mínima",
}

const priorityColors: Record<number, string> = {
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export default async function SharedEmailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const auth = await requireAuth()
  if (!auth.authenticated) notFound()

  // Verificar acceso: notificación para este email O permiso atc:read
  const [hasNotification, hasAtcPermission] = await Promise.all([
    prisma.notification.findFirst({
      where: {
        userId: auth.userId,
        type: "EMAIL_CROSS_DEPARTMENT",
        metadata: { path: ["emailId"], equals: id },
      },
      select: { id: true },
    }),
    auth.roleCode === "SUPER_ADMIN"
      ? Promise.resolve(true)
      : prisma.role.findFirst({
          where: {
            id: auth.roleId,
            permissions: { some: { resource: "atc", action: { in: ["read", "manage"] } } },
          },
          select: { id: true },
        }).then(r => !!r),
  ])

  if (!hasNotification && !hasAtcPermission) notFound()

  // Obtener email
  const email = await prisma.emailInbox.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, color: true, icon: true, slug: true } } },
  })

  if (!email) notFound()

  // Marcar notificación como leída automáticamente
  if (hasNotification) {
    await prisma.notification.updateMany({
      where: {
        userId: auth.userId,
        type: "EMAIL_CROSS_DEPARTMENT",
        metadata: { path: ["emailId"], equals: id },
        isRead: false,
      },
      data: { isRead: true },
    }).catch(() => {}) // fail silently
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header
        title="Email compartido"
        description="Vista de solo lectura"
        backHref="/"
      />

      <div className="flex-1 overflow-y-auto p-8 w-full max-w-3xl mx-auto space-y-6">
        {/* Cabecera del email */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{email.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  {email.fromName
                    ? `${email.fromName} <${email.fromEmail}>`
                    : email.fromEmail
                  }
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(email.receivedAt).toLocaleDateString("es-ES", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clasificación IA */}
        {(email.category || email.aiLabel || email.aiPriority != null) && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4 text-primary" />
                Clasificación IA
              </div>

              <div className="flex flex-wrap gap-2">
                {email.category && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: email.category.color + "22",
                      color: email.category.color,
                      border: `1px solid ${email.category.color}44`,
                    }}
                  >
                    <Tag className="h-3 w-3" />
                    {email.category.name}
                  </span>
                )}

                {email.aiPriority != null && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${priorityColors[email.aiPriority] ?? ""}`}>
                    <Zap className="h-3 w-3" />
                    P{email.aiPriority} — {priorityLabels[email.aiPriority]}
                  </span>
                )}

                {email.aiLabel && email.aiLabel !== email.category?.name && (
                  <Badge variant="secondary" className="text-xs">{email.aiLabel}</Badge>
                )}

                {email.targetDate && (() => {
                  const target = new Date(email.targetDate)
                  const now = new Date()
                  now.setHours(0, 0, 0, 0)
                  const daysUntil = Math.round((target.getTime() - now.getTime()) / 86400000)
                  const colorClass = daysUntil <= 1
                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                    : daysUntil <= 3
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  const label = daysUntil < 0 ? "Pasada" : daysUntil === 0 ? "Hoy" : daysUntil === 1 ? "Mañana" : `En ${daysUntil} días`
                  return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}>
                      <CalendarClock className="h-3 w-3" />
                      {target.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })} ({label})
                    </span>
                  )
                })()}
              </div>

              {email.aiSummary && (
                <p className="text-sm text-muted-foreground italic">&ldquo;{email.aiSummary}&rdquo;</p>
              )}

              {email.aiConfidenceScore != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confianza:</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.round(email.aiConfidenceScore * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(email.aiConfidenceScore * 100)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Contenido del email */}
        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-sm font-medium">Contenido</p>
            <div className="rounded-lg border bg-card p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground">
                {email.body}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
