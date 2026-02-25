"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Mail, Receipt, Gift, Settings } from "lucide-react"
import { GiftVoucherStatus } from "@prisma/client"
import { EmailInboxTab, type EmailRow } from "./email-inbox-tab"
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
  emails:     EmailRow[]
  invoices:   InvoiceRow[]
  vouchers:   VoucherRow[]
  categories: CategoryInfo[]
  canDelete?: boolean
}

const voucherStatusColors: Record<GiftVoucherStatus, string> = {
  ACTIVE:    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  USED:      "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  EXPIRED:   "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function BackofficeView({ emails, invoices, vouchers, categories, canDelete }: BackofficeViewProps) {
  const unreadCount = emails.filter(e => !e.isRead).length

  return (
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
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="gap-2">
            <Gift className="h-4 w-4" />
            Bonos Regalo
          </TabsTrigger>
        </TabsList>

        <Button variant="outline" size="sm" asChild className="gap-2">
          <Link href="/atc/backoffice/categories">
            <Settings className="h-4 w-4" />
            Categorías
          </Link>
        </Button>
      </div>

      {/* Email Inbox */}
      <TabsContent value="inbox" className="mt-4">
        <EmailInboxTab emails={emails} categories={categories} canDelete={canDelete} />
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
