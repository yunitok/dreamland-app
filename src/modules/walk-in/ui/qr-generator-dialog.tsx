"use client"

import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import QRCode from "qrcode"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/modules/shared/ui/dialog"
import { Button } from "@/modules/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { QrCode, Download, Copy, Check } from "lucide-react"

interface Restaurant {
  id: string
  name: string
  cmSlug: string
  walkInToken: string | null
  city: string
}

interface QrGeneratorDialogProps {
  restaurants: Restaurant[]
}

export function QrGeneratorDialog({ restaurants }: QrGeneratorDialogProps) {
  const t = useTranslations("walkIn")
  const [selectedSlug, setSelectedSlug] = useState<string>("")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [qrSvg, setQrSvg] = useState<string>("")
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const selectedRestaurant = restaurants.find((r) => r.cmSlug === selectedSlug)
  // Use walkInToken for new QRs (opaque, non-enumerable). Fallback to cmSlug for legacy.
  const urlSlug = selectedRestaurant?.walkInToken ?? selectedSlug
  const walkInUrl = selectedSlug ? `${baseUrl}/es/walk-in/${urlSlug}` : ""

  useEffect(() => {
    if (!selectedSlug || !canvasRef.current) return

    const url = `${baseUrl}/es/walk-in/${urlSlug}`

    // Generate canvas QR
    QRCode.toCanvas(canvasRef.current, url, {
      width: 280,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })

    // Generate data URL for PNG download
    QRCode.toDataURL(url, { width: 1024, margin: 2 }).then(setQrDataUrl)

    // Generate SVG for SVG download
    QRCode.toString(url, { type: "svg", margin: 2 }).then(setQrSvg)
  }, [selectedSlug, baseUrl, urlSlug])

  const downloadPng = () => {
    if (!qrDataUrl || !selectedSlug) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `walkin-qr-${selectedSlug}.png`
    a.click()
  }

  const downloadSvg = () => {
    if (!qrSvg || !selectedSlug) return
    const blob = new Blob([qrSvg], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `walkin-qr-${selectedSlug}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyUrl = async () => {
    if (!walkInUrl) return
    await navigator.clipboard.writeText(walkInUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedName = restaurants.find((r) => r.cmSlug === selectedSlug)?.name

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          {t("generateQr")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("qrTitle")}</DialogTitle>
          <DialogDescription>{t("qrDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Restaurant selector */}
          <Select value={selectedSlug} onValueChange={setSelectedSlug}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectRestaurant")} />
            </SelectTrigger>
            <SelectContent>
              {restaurants.map((r) => (
                <SelectItem key={r.id} value={r.cmSlug}>
                  {r.name} — {r.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* QR Preview */}
          {selectedSlug && (
            <>
              <div className="flex flex-col items-center gap-3 rounded-lg border bg-white p-4">
                <canvas ref={canvasRef} />
                <p className="text-center text-xs font-medium text-gray-700">
                  {selectedName}
                </p>
              </div>

              {/* URL display */}
              <div className="rounded-lg border bg-muted/50 px-3 py-2">
                <code className="break-all text-xs">{walkInUrl}</code>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={downloadPng}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadPng")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={downloadSvg}
                >
                  <Download className="h-3.5 w-3.5" />
                  {t("downloadSvg")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={copyUrl}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? t("urlCopied") : t("copyUrl")}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
