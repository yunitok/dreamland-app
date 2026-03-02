"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/modules/shared/ui/dialog"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { Play } from "lucide-react"
import type { ProcessDefinition } from "@/modules/admin/domain/process-registry"

interface TriggerDialogProps {
  process: ProcessDefinition
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (options: Record<string, unknown>) => void
}

export function TriggerDialog({ process, open, onOpenChange, onConfirm }: TriggerDialogProps) {
  const [options, setOptions] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {}
    for (const opt of process.options ?? []) {
      if (opt.defaultValue !== undefined) defaults[opt.name] = opt.defaultValue
    }
    return defaults
  })

  const handleChange = (name: string, value: unknown) => {
    setOptions((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ejecutar: {process.name}</DialogTitle>
          <DialogDescription>{process.description}</DialogDescription>
        </DialogHeader>

        {process.options?.length ? (
          <div className="space-y-4 py-2">
            {process.options.map((opt) => (
              <div key={opt.name}>
                {opt.type === "boolean" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!options[opt.name]}
                      onChange={(e) => handleChange(opt.name, e.target.checked)}
                      className="rounded border-input"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-sm">{opt.label}</Label>
                    <Input
                      type={opt.type === "number" ? "number" : opt.type === "date" ? "date" : "text"}
                      value={String(options[opt.name] ?? "")}
                      onChange={(e) => {
                        const v = opt.type === "number" ? Number(e.target.value) : e.target.value
                        handleChange(opt.name, v)
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(options)}>
            <Play className="h-4 w-4 mr-2" />
            Ejecutar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
