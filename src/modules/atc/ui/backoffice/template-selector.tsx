"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/modules/shared/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/ui/popover"
import { FileText, Loader2 } from "lucide-react"
import { getEmailTemplates, renderTemplate } from "@/modules/atc/actions/email-templates"
import { toast } from "sonner"

type TemplateInfo = {
  id: string
  name: string
  subject: string
  bodyHtml: string
  category: { id: string; name: string; color: string } | null
}

interface TemplateSelectorProps {
  categoryId?: string | null
  variables?: Record<string, string>
  onSelect: (subject: string, bodyHtml: string) => void
}

export function TemplateSelector({ categoryId, variables, onSelect }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      const result = await getEmailTemplates(categoryId ?? undefined)
      if (result.success && result.data) {
        setTemplates(result.data as TemplateInfo[])
      }
    })
  }, [open, categoryId, startTransition])

  function handleSelect(template: TemplateInfo) {
    if (variables && Object.keys(variables).length > 0) {
      startTransition(async () => {
        const result = await renderTemplate(template.id, variables)
        if (result.success && result.data) {
          onSelect(result.data.subject, result.data.bodyHtml)
        } else {
          onSelect(template.subject, template.bodyHtml)
        }
        setOpen(false)
      })
    } else {
      onSelect(template.subject, template.bodyHtml)
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Plantilla
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <p className="text-sm font-medium">Seleccionar plantilla</p>
          <p className="text-xs text-muted-foreground">Reemplazará el contenido actual</p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {isPending ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              No hay plantillas disponibles
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t)}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors cursor-pointer border-b last:border-b-0"
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                {t.category && (
                  <span
                    className="inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: t.category.color + "22",
                      color: t.category.color,
                    }}
                  >
                    {t.category.name}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
