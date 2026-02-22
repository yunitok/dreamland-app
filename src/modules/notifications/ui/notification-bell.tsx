"use client"

import { useState, useEffect, useCallback } from "react"
import { Bell, Trash2 } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Badge } from "@/modules/shared/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/shared/ui/popover"
import { ScrollArea } from "@/modules/shared/ui/scroll-area"
import { Separator } from "@/modules/shared/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/shared/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/shared/ui/alert-dialog"
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "@/modules/notifications/actions/notifications"
import { NotificationItem } from "./notification-item"
import { useTranslations } from "next-intl"
import { NotificationType } from "@prisma/client"

interface NotificationData {
  id: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  href?: string | null
  createdAt: Date
}

interface NotificationBellProps {
  userId?: string
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [open, setOpen] = useState(false)
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const t = useTranslations("notifications")

  const fetchNotifications = useCallback(async () => {
    const result = await getNotifications()
    if (result.success) {
      setNotifications(result.data as NotificationData[])
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [userId, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) fetchNotifications()
  }

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    await markAsRead(id)
  }

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    await markAllAsRead()
  }

  const handleDeleteOne = async (id: string) => {
    const previous = notifications
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const result = await deleteNotification(id)
    if (!result.success) setNotifications(previous)
  }

  const handleDeleteAll = async () => {
    setNotifications([])
    setConfirmClearOpen(false)
    await deleteAllNotifications()
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 min-w-0 p-0 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground border-0 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
            <span className="sr-only">{t("title")}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {t("markAllRead")}
                </button>
              )}
              {notifications.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setConfirmClearOpen(true)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded-sm cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("clearAll")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          <Separator />
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">{t("noNotifications")}</p>
            </div>
          ) : (
            <ScrollArea className="max-h-105">
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    {...n}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDeleteOne}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearAllTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("clearAllDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("clearAllConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
