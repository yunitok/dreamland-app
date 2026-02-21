"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Settings } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/shared/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/modules/shared/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { Input } from "@/modules/shared/ui/input"
import { updateWeatherConfig } from "@/modules/atc/actions/operations"
import { useTranslations } from "next-intl"

const configSchema = z.object({
  rainProbability: z.coerce.number().min(0).max(100),
  rainMm: z.coerce.number().min(0),
  windSpeed: z.coerce.number().min(0),
  windGust: z.coerce.number().min(0),
  temperatureLow: z.coerce.number(),
  temperatureHigh: z.coerce.number(),
  serviceHoursStart: z.coerce.number().int().min(0).max(23),
  serviceHoursEnd: z.coerce.number().int().min(0).max(23),
})

type ConfigFormValues = z.infer<typeof configSchema>

interface WeatherConfigDialogProps {
  config: {
    rainProbability: number
    rainMm: number
    windSpeed: number
    windGust: number
    temperatureLow: number
    temperatureHigh: number
    serviceHoursStart: number
    serviceHoursEnd: number
  }
}

const hours = Array.from({ length: 24 }, (_, i) => i)

export function WeatherConfigDialog({ config }: WeatherConfigDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = useTranslations("atc")

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema) as any,
    defaultValues: config,
  })

  async function onSubmit(data: ConfigFormValues) {
    setLoading(true)
    try {
      const result = await updateWeatherConfig(data)
      if (result.success) {
        toast.success(t("configSaved"))
        setOpen(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 sm:h-9 cursor-pointer">
          <Settings className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("weatherConfig")}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{t("weatherConfig")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Precipitación */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("precipitation")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rainProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rainProbability")} (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" max="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rainMm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("precipitation")} (mm)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Viento */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("wind")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="windSpeed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("windSpeed")} (km/h)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="windGust"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("windGusts")} (km/h)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Temperatura */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("temperature")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="temperatureLow"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("temperatureLow")} (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="temperatureHigh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("temperatureHigh")} (°C)</FormLabel>
                      <FormControl>
                        <Input type="number" step="1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Horario de servicio */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t("serviceHours")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="serviceHoursStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("serviceHoursStart")}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hours.map(h => (
                            <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceHoursEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("serviceHoursEnd")}</FormLabel>
                      <Select onValueChange={(v) => field.onChange(parseInt(v, 10))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger className="cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {hours.map(h => (
                            <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer">
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={loading} className="cursor-pointer">
                {loading ? "Guardando..." : t("save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
