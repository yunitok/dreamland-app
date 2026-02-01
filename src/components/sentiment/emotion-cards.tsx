import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { TeamMood } from "@prisma/client"
import { 
  Meh, 
  AlertTriangle,
  ThumbsUp,
  Zap
} from "lucide-react"

interface EmotionCardsProps {
  moods: TeamMood[]
}

const getSentimentConfig = (score: number) => {
  if (score < 50) return {
    color: "text-red-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(239,68,68,0.15)_0%,_transparent_50%)]",
    border: "border-red-500/30",
    glow: "shadow-red-500/10",
    icon: AlertTriangle,
    bar: "bg-red-500"
  }
  if (score < 75) return {
    color: "text-blue-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.15)_0%,_transparent_50%)]",
    border: "border-blue-500/30",
    glow: "shadow-blue-500/10",
    icon: Meh,
    bar: "bg-blue-500"
  }
  return {
    color: "text-emerald-400",
    bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.15)_0%,_transparent_50%)]",
    border: "border-emerald-500/30",
    glow: "shadow-emerald-500/10",
    icon: ThumbsUp,
    bar: "bg-emerald-500"
  }
}

export function EmotionCards({ moods }: EmotionCardsProps) {
  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {moods.map((mood) => {
        const config = getSentimentConfig(mood.sentimentScore)

        return (
          <Card 
            key={mood.id} 
            className={cn(
              "group relative overflow-hidden border border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex flex-col h-full",
              config.border
            )}
          >
            {/* Gradient overlay based on sentiment */}
            <div className={cn("absolute inset-0 opacity-40 transition-opacity duration-500 group-hover:opacity-70", config.bg)} />

            <div className="relative p-5 flex flex-col gap-4 flex-1">
              {/* Header: Name + Status Icon */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors flex-1">
                  {mood.departmentName}
                </h3>
                <div className={cn(
                  "p-1.5 rounded-lg border bg-background/50 transition-all duration-300 group-hover:scale-110 shrink-0",
                  config.border
                )}>
                  <config.icon className={cn("h-4 w-4", config.color)} />
                </div>
              </div>

              {/* Metrics Row */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("text-3xl font-black tabular-nums tracking-tight", config.color)}>
                      {mood.sentimentScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Score</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1 w-full rounded-full bg-secondary/30 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-700 ease-out", config.bar)}
                      style={{ width: `${mood.sentimentScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dominant Emotion & Key Concerns */}
              <div className="space-y-2 mt-auto">
                <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/80">
                  <Zap className="h-3 w-3 text-primary" />
                  {mood.dominantEmotion}
                </div>
                {mood.keyConcerns && (
                  <p className="text-xs text-muted-foreground/80 italic border-l-2 border-border/60 pl-3 py-1 line-clamp-2 leading-relaxed">
                    &quot;{mood.keyConcerns}&quot;
                  </p>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
