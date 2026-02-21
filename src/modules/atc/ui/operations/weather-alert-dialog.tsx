"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Plus } from "lucide-react"
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
import { Textarea } from "@/modules/shared/ui/textarea"
import { weatherAlertSchema, WeatherAlertFormValues } from "@/modules/atc/domain/schemas"
import { createWeatherAlert } from "@/modules/atc/actions/operations"
import { useTranslations } from "next-intl"

interface LocationOption {
  city: string
}

interface WeatherAlertDialogProps {
  trigger: string
  locations: LocationOption[]
}

export function WeatherAlertDialog({ trigger, locations }: WeatherAlertDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const t = useTranslations("atc")

  // Ciudades únicas para el selector
  const cities = [...new Set(locations.map(l => l.city))]

  const form = useForm<WeatherAlertFormValues>({
    resolver: zodResolver(weatherAlertSchema) as any,
    defaultValues: {
      alertType:    "RAIN",
      severity:     "MEDIUM",
      description:  "",
      forecastDate: new Date(),
      location:     cities[0] ?? "",
    },
  })

  async function onSubmit(data: WeatherAlertFormValues) {
    setLoading(true)
    try {
      const result = await createWeatherAlert(data)
      if (result.success) {
        toast.success(t("weatherAlertCreated"))
        form.reset()
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
        <Button size="sm" className="h-8 sm:h-9 cursor-pointer">
          <Plus className="sm:mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{trigger}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{t("manualAlert")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="alertType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("alertType")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RAIN">{t("rain")}</SelectItem>
                        <SelectItem value="WIND">{t("wind")}</SelectItem>
                        <SelectItem value="TEMPERATURE_HIGH">{t("temperatureHigh")}</SelectItem>
                        <SelectItem value="TEMPERATURE_LOW">{t("temperatureLow")}</SelectItem>
                        <SelectItem value="STORM">{t("storm")}</SelectItem>
                        <SelectItem value="SNOW">{t("snow")}</SelectItem>
                        <SelectItem value="HAIL">{t("hail")}</SelectItem>
                        <SelectItem value="FOG">{t("fog")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("severity")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">{t("low")}</SelectItem>
                        <SelectItem value="MEDIUM">{t("medium")}</SelectItem>
                        <SelectItem value="HIGH">{t("high")}</SelectItem>
                        <SelectItem value="CRITICAL">{t("critical")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("location")} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="cursor-pointer">
                          <SelectValue placeholder={t("selectLocation")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cities.map(city => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="forecastDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("forecastDate")} *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("describeAlert")}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="precipitationMm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("precipitation")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="windSpeedKmh"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("windSpeed")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="temperatureC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("temperature")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0.0"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
