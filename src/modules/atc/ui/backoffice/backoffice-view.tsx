"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
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
import { Separator } from "@/modules/shared/ui/separator"
import { Mail, Receipt, Gift, Settings, Trash2 } from "lucide-react"
import { GiftVoucherStatus } from "@prisma/client"
import { EmailInboxTab, type EmailRow } from "./email-inbox-tab"
import { deleteAllEmails } from "@/modules/atc/actions/backoffice"
import { toast } from "sonner"
import Link from "next/link"

type CategoryInfo = {
  id:    string
  name:  string
  color: string
  icon:  string | null
  slug:  string
}

type InvoiceRow = {
  id:          string
  guestName:   string
  guestEmail:  string | null
  total:       number
  status:      string
  generatedAt: Date
}

type VoucherRow = {
  id:             string
  code:           string
  value:          number
  remainingValue: number
  status:         GiftVoucherStatus
  expiresAt:      Date | null
}

interface BackofficeViewProps {
  emails:         EmailRow[]
  invoices:       InvoiceRow[]
  vouchers:       VoucherRow[]
  categories:     CategoryInfo[]
  canDelete?:     boolean
  invoiceEmails:  EmailRow[]
  voucherEmails:  EmailRow[]
}

const voucherStatusColors: Record<GiftVoucherStatus, string> = {
  ACTIVE:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  USED:      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  EXPIRED:   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function BackofficeView({ emails, invoices, vouchers, categories, canDelete, invoiceEmails, voucherEmails }: BackofficeViewProps) {
  const router = useRouter()
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const unreadCount = emails.filter(e => !e.isRead).length

  const handleDeleteAll = () => {
    startTransition(async () => {
      const result = await deleteAllEmails()
      if (result.success) {
        toast.success(`${result.data?.count ?? 0} emails eliminados`)
        router.refresh()
      } else {
        toast.error(result.error ?? "Error al eliminar los emails")
      }
      setShowDeleteAll(false)
    })
  }

  return (
    <>
      <Tabs defaultValue="inbox">
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="inbox" className="gap-2">
              <Mail className="h-4 w-4" />
              Buzón
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-2">
              <Receipt className="h-4 w-4" />
              Facturas
              {invoiceEmails.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {invoiceEmails.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vouchers" className="gap-2">
              <Gift className="h-4 w-4" />
              Bonos Regalo
              {voucherEmails.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {voucherEmails.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAll(true)}
                disabled={isPending || emails.length === 0}
                className="gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Borrar todos los emails
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link href="/atc/backoffice/categories">
                <Settings className="h-4 w-4" />
                Categorías
              </Link>
            </Button>
          </div>
        </div>

        {/* Email Inbox */}
        <TabsContent value="inbox" className="mt-4">
          <EmailInboxTab emails={emails} categories={categories} canDelete={canDelete} />
        </TabsContent>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-4 space-y-6">
          {/* Emails de facturación */}
          {invoiceEmails.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                {invoiceEmails.length} email(s) de facturación
              </div>
              <EmailInboxTab emails={invoiceEmails} categories={categories} canDelete={canDelete} />
              <Separator />
            </div>
          )}

          {/* Facturas generadas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Receipt className="h-4 w-4" />
              Facturas generadas
            </div>
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
          </div>
        </TabsContent>

        {/* Gift Vouchers */}
        <TabsContent value="vouchers" className="mt-4 space-y-6">
          {/* Emails de bonos regalo */}
          {voucherEmails.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                {voucherEmails.length} email(s) de bonos regalo
              </div>
              <EmailInboxTab emails={voucherEmails} categories={categories} canDelete={canDelete} />
              <Separator />
            </div>
          )}

          {/* Bonos regalo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Gift className="h-4 w-4" />
              Bonos regalo
            </div>
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
          </div>
        </TabsContent>
      </Tabs>

      {/* AlertDialog para borrado masivo */}
      <AlertDialog open={showDeleteAll} onOpenChange={setShowDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar TODOS los emails</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente todos los emails sincronizados,
              incluyendo los que aparecen en las pestañas de Facturas y Bonos Regalo.
              Los registros de facturas generadas y bonos regalo NO se verán afectados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminando..." : "Eliminar todos"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
