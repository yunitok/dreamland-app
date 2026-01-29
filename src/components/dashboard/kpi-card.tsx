import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "warning" | "critical" | "success"
}

const variantStyles = {
  default: "bg-card",
  warning: "bg-amber-500/10 border-amber-500/20",
  critical: "bg-red-500/10 border-red-500/20",
  success: "bg-emerald-500/10 border-emerald-500/20",
}

const variantIconStyles = {
  default: "text-primary",
  warning: "text-amber-500",
  critical: "text-red-500",
  success: "text-emerald-500",
}

export function KPICard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  trend,
  variant = "default" 
}: KPICardProps) {
  return (
    <Card className={cn("relative overflow-hidden", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <Icon className={cn("h-4 w-4", variantIconStyles[variant])} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center text-xs mt-2",
            trend.isPositive ? "text-emerald-500" : "text-red-500"
          )}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  )
}
