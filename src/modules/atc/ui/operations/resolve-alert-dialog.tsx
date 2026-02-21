"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/modules/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/shared/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/modules/shared/ui/form"
import { Input } from "@/modules/shared/ui/input"
import { Textarea } from "@/modules/shared/ui/textarea"
import { resolveWeatherAlertSchema, ResolveWeatherAlertFormValues } from "@/modules/atc/domain/schemas"
import { resolveWeatherAlert } from "@/modules/atc/actions/operations"
import { useTranslations } from "next-intl"

interface ResolveAlertDialogProps {
  alertId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ResolveAlertDialog({ alertId, open, onOpenChange }: ResolveAlertDialogProps) {
  const [loading, setLoading] = useState(false)
  const t = useTranslations("atc")

  const form = useForm<ResolveWeatherAlertFormValues>({
    resolver: zodResolver(resolveWeatherAlertSchema),
    defaultValues: {
      actionsTaken: "",
      resolvedBy:   "",
    },
  })

  async function onSubmit(data: ResolveWeatherAlertFormValues) {
    setLoading(true)
    try {
      const result = await resolveWeatherAlert(alertId, data)
      if (result.success) {
        toast.success(t("weatherAlertResolved"))
        form.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("resolveAlert")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="actionsTaken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("actionsTaken")} *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("describeActions")}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="resolvedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("resolvedBy")}</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del responsable" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="cursor-pointer">
                {loading ? "Guardando..." : t("resolveAlert")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
