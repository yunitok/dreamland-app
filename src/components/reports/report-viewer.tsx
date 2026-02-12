'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/modules/shared/ui/dialog'
import { Button } from '@/modules/shared/ui/button'
import { ScrollArea } from '@/modules/shared/ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Printer, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface Report {
  title: string
  content: string
}

interface ReportViewerProps {
  report: Report | null
  onClose: () => void
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [copied, setCopied] = useState(false)

  if (!report) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(report.content)
    setCopied(true)
    toast.success('Reporte copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => {
    // Simple print implementation: open new window with formatted content
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${report.title}</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
              h1, h2, h3 { color: #111; }
              ul { padding-left: 1.2rem; }
              li { margin-bottom: 0.5rem; }
              hr { border: 0; border-top: 1px solid #ccc; margin: 2rem 0; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            ${document.getElementById('report-markdown-content')?.innerHTML || report.content}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  return (
    <Dialog open={!!report} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{report.title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden border rounded-md bg-white dark:bg-zinc-950 p-6">
          <ScrollArea className="h-full pr-4">
            <div id="report-markdown-content" className="prose dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report.content}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copiado' : 'Copiar Markdown'}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir / PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
