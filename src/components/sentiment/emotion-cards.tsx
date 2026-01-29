import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TeamMood } from "@/generated/prisma/client"
import { 
  Smile, 
  Meh, 
  Frown, 
  AlertCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react"

interface EmotionCardsProps {
  moods: TeamMood[]
}

const getEmotionIcon = (score: number) => {
  if (score < 40) return Frown
  if (score < 60) return AlertCircle
  if (score < 75) return Meh
  return Smile
}

const getEmotionColor = (score: number) => {
  if (score < 40) return "text-red-500"
  if (score < 60) return "text-amber-500"
  if (score < 75) return "text-blue-500"
  return "text-emerald-500"
}

const getEmotionBg = (score: number) => {
  if (score < 40) return "bg-red-500/10"
  if (score < 60) return "bg-amber-500/10"
  if (score < 75) return "bg-blue-500/10"
  return "bg-emerald-500/10"
}

export function EmotionCards({ moods }: EmotionCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {moods.map((mood) => {
        const Icon = getEmotionIcon(mood.sentimentScore)
        const colorClass = getEmotionColor(mood.sentimentScore)
        const bgClass = getEmotionBg(mood.sentimentScore)
        const isStressed = mood.sentimentScore < 50

        return (
          <Card key={mood.id} className={cn("relative overflow-hidden", bgClass)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{mood.departmentName}</CardTitle>
                <div className={cn("p-2 rounded-full", bgClass)}>
                  <Icon className={cn("h-5 w-5", colorClass)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", colorClass)}>
                  {mood.sentimentScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
                {isStressed ? (
                  <TrendingDown className="h-4 w-4 text-red-500 ml-auto" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-emerald-500 ml-auto" />
                )}
              </div>
              
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium">{mood.dominantEmotion}</p>
                {mood.keyConcerns && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {mood.keyConcerns}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 rounded-full bg-background/50 overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", {
                    "bg-red-500": mood.sentimentScore < 40,
                    "bg-amber-500": mood.sentimentScore >= 40 && mood.sentimentScore < 60,
                    "bg-blue-500": mood.sentimentScore >= 60 && mood.sentimentScore < 75,
                    "bg-emerald-500": mood.sentimentScore >= 75,
                  })}
                  style={{ width: `${mood.sentimentScore}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
