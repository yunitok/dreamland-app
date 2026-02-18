"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Mail, MailOpen, Receipt, Gift, MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import { markEmailRead } from "@/modules/atc/actions/backoffice"
import { toast } from "sonner"
import { GiftVoucherStatus } from "@prisma/client"

type EmailRow = {
  id: string
  fromEmail: string
  subject: string
  body: string
  aiLabel: string | null
  aiPriority: number | null
  isRead: boolean
  receivedAt: Date
}

type InvoiceRow = {
  id: string
  guestName: string
  guestEmail: string | null
  total: number
  status: string
  generatedAt: Date
}

type VoucherRow = {
  id: string
  code: string
  value: number
  remainingValue: number
  status: GiftVoucherStatus
  expiresAt: Date | null
}

interface BackofficeViewProps {
  emails: EmailRow[]
  invoices: InvoiceRow[]
  vouchers: VoucherRow[]
}

const voucherStatusColors: Record<GiftVoucherStatus, string> = {
  ACTIVE:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  USED:      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  EXPIRED:   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function BackofficeView({ emails, invoices, vouchers }: BackofficeViewProps) {
  const [localEmails, setLocalEmails] = useState(emails)

  async function handleMarkRead(id: string) {
    const result = await markEmailRead(id)
    if (result.success) {
      setLocalEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))
      toast.success("Email marcado como leído")
    } else {
      toast.error("Error al marcar el email")
    }
  }

  return (
    <Tabs defaultValue="inbox">
      <TabsList>
        <TabsTrigger value="inbox" className="gap-2">
          <Mail className="h-4 w-4" />
          Buzón
          {localEmails.filter(e => !e.isRead).length > 0 && (
            <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {localEmails.filter(e => !e.isRead).length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="invoices" className="gap-2">
          <Receipt className="h-4 w-4" />
          Facturas
        </TabsTrigger>
        <TabsTrigger value="vouchers" className="gap-2">
          <Gift className="h-4 w-4" />
          Bonos Regalo
        </TabsTrigger>
      </TabsList>

      {/* Email Inbox */}
      <TabsContent value="inbox" className="space-y-3 mt-4">
        {localEmails.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay emails pendientes
            </CardContent>
          </Card>
        ) : (
          localEmails.map(email => (
            <Card key={email.id} className={email.isRead ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {email.isRead
                      ? <MailOpen className="h-4 w-4 text-muted-foreground" />
                      : <Mail className="h-4 w-4 text-primary" />
                    }
                    <div>
                      <CardTitle className="text-sm font-medium">{email.subject}</CardTitle>
                      <CardDescription className="text-xs">{email.fromEmail}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {email.aiLabel && (
                      <Badge variant="secondary" className="text-xs">{email.aiLabel}</Badge>
                    )}
                    {email.aiPriority && email.aiPriority > 3 && (
                      <Badge variant="destructive" className="text-xs">Alta prioridad</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!email.isRead && (
                          <DropdownMenuItem onClick={() => handleMarkRead(email.id)}>
                            Marcar como leído
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{email.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </TabsContent>

      {/* Invoices */}
      <TabsContent value="invoices" className="mt-4">
        {invoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay facturas generadas
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {invoices.map(invoice => (
              <Card key={invoice.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{invoice.guestName}</CardTitle>
                      <CardDescription className="text-xs">{invoice.guestEmail}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-semibold">
                        {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(invoice.total)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(invoice.generatedAt).toLocaleDateString("es-ES")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Gift Vouchers */}
      <TabsContent value="vouchers" className="mt-4">
        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay bonos regalo
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {vouchers.map(voucher => (
              <Card key={voucher.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-mono">{voucher.code}</CardTitle>
                      {voucher.expiresAt && (
                        <CardDescription className="text-xs">
                          Caduca: {new Date(voucher.expiresAt).toLocaleDateString("es-ES")}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-semibold">
                          {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(voucher.remainingValue)}
                          <span className="text-muted-foreground text-xs">
                            {" "}/ {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(voucher.value)}
                          </span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${voucherStatusColors[voucher.status]}`}>
                        {voucher.status}
                      </span>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
