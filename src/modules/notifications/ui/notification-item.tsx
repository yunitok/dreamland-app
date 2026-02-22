"use client"

import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Link } from "@/i18n/navigation"
import { NotificationType } from "@prisma/client"
import {
  AlertTriangle,
  Cloud,
  Mail,
  ArrowUpCircle,
  CheckSquare,
  MessageSquare,
  UserPlus,
  Bell,
  X,
} from "lucide-react"

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  INCIDENT_CREATED: AlertTriangle,
  INCIDENT_SEVERITY_HIGH: AlertTriangle,
  WEATHER_ALERT: Cloud,
  EMAIL_ASSIGNED: Mail,
  QUERY_ESCALATED: ArrowUpCircle,
  TASK_ASSIGNED: CheckSquare,
  TASK_COMMENTED: MessageSquare,
  PROJECT_MEMBER_ADDED: UserPlus,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  INCIDENT_CREATED: "text-orange-500",
  INCIDENT_SEVERITY_HIGH: "text-red-500",
  WEATHER_ALERT: "text-blue-500",
  EMAIL_ASSIGNED: "text-purple-500",
  QUERY_ESCALATED: "text-yellow-500",
  TASK_ASSIGNED: "text-green-500",
  TASK_COMMENTED: "text-cyan-500",
  PROJECT_MEMBER_ADDED: "text-indigo-500",
}

interface NotificationItemProps {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  href?: string | null
  createdAt: Date
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

export function NotificationItem({
  id,
  type,
  title,
  body,
  isRead,
  href,
  createdAt,
  onMarkRead,
  onDelete,
}: NotificationItemProps) {
  const Icon = TYPE_ICONS[type] ?? Bell
  const iconColor = TYPE_COLORS[type] ?? "text-muted-foreground"

  const content = (
    <div
      className={cn(
        "group relative flex items-start gap-3 pl-4 pr-8 py-3 transition-colors hover:bg-muted/50 cursor-pointer",
        !isRead && "bg-muted/30"
      )}
      onClick={() => {
        if (!isRead) onMarkRead(id)
      }}
    >
      <div className={cn("mt-0.5 shrink-0", iconColor)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm leading-snug truncate", !isRead ? "font-semibold" : "font-normal")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!isRead && (
        <div className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-primary" />
      )}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDelete(id)
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded-sm hover:bg-destructive/10 text-muted-foreground hover:text-destructive cursor-pointer"
        aria-label="Eliminar notificación"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )

  if (href) {
    return (
      <Link href={href} onClick={() => { if (!isRead) onMarkRead(id) }}>
        {content}
      </Link>
    )
  }

  return content
}
