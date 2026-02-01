"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { SentimentCheckInSheet } from "./sentiment-check-in-sheet"

interface NewCheckInButtonProps {
  departments: string[]
}

export function NewCheckInButton({ departments }: NewCheckInButtonProps) {
  const t = useTranslations("sentiment")
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        <span className="hidden md:inline">{t("newCheckIn")}</span>
        <span className="md:hidden">{t("new")}</span>
      </Button>

      <SentimentCheckInSheet
        mood={null}
        departments={departments}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="create"
      />
    </>
  )
}
