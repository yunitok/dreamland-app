'use client'

import { Button } from '@/modules/shared/ui/button'
import { Printer } from 'lucide-react'

interface ReportPrintButtonProps {
  title: string
  content: string
}

export function ReportPrintButton({ title, content }: ReportPrintButtonProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Button onClick={handlePrint} variant="outline">
      <Printer className="mr-2 h-4 w-4" />
      Imprimir / PDF
    </Button>
  )
}
