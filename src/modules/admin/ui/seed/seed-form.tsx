"use client"

import { useState } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"

interface SeedFormState {
  status: "idle" | "loading" | "success" | "error"
  message: string
  counts?: {
    projects: number
    moods: number
  }
}

export function SeedForm() {
  const [jsonInput, setJsonInput] = useState("")
  const [state, setState] = useState<SeedFormState>({ 
    status: "idle", 
    message: "" 
  })
  const t = useTranslations("admin")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setState({ status: "loading", message: "Processing..." })

    try {
      const parsed = JSON.parse(jsonInput)
      
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to seed database")
      }

      setState({
        status: "success",
        message: t("importSuccess"),
        counts: data.counts,
      })
      setJsonInput("")
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Invalid JSON format",
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("importData")}</CardTitle>
        <CardDescription>
          {t("importDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{
  "projects": [
    {
      "title": "Project Name",
      "department": "IT",
      "type": "Problem",
      "priority": "High",
      "description": "Description...",
      "status": "Active",
      "sourceQuote": "Quote from meeting..."
    }
  ],
  "teamMoods": [
    {
      "departmentName": "IT",
      "sentimentScore": 45,
      "dominantEmotion": "Stressed",
      "keyConcerns": "Too many projects..."
    }
  ]
}`}
              className="w-full h-80 p-4 rounded-lg border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              {state.status === "success" && (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{state.message}</span>
                  {state.counts && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({state.counts.projects} projects, {state.counts.moods} moods)
                    </span>
                  )}
                </div>
              )}
              {state.status === "error" && (
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{state.message}</span>
                </div>
              )}
            </div>

            <Button type="submit" disabled={!jsonInput || state.status === "loading"}>
              {state.status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("importing")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("import")}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
