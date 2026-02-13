"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Slider } from "@/modules/shared/ui/slider";

interface SentimentZoneSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

export function SentimentZoneSelector({ value, onChange }: SentimentZoneSelectorProps) {

  const getZoneColor = (score: number) => {
    if (score < 40) return "bg-red-500 shadow-red-500/50"
    if (score < 70) return "bg-orange-500 shadow-orange-500/50"
    return "bg-emerald-500 shadow-emerald-500/50"
  }

  const getZoneTextColor = (score: number) => {
    if (score < 40) return "text-red-500"
    if (score < 70) return "text-orange-500"
    return "text-emerald-500"
  }

  const getZoneLabel = (score: number) => {
    if (score < 40) return "Crítico"
    if (score < 70) return "Estable"
    return "Saludable"
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
            <span className={cn("text-2xl font-black tabular-nums tracking-tight", getZoneTextColor(value))}>
                {value}
            </span>
            <span className={cn("text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-muted/50", getZoneTextColor(value))}>
                {getZoneLabel(value)}
            </span>
      </div>

      <div className="relative h-12 flex items-center">
            {/* Custom Track Background */}
            <div className="absolute inset-0 w-full h-4 top-1/2 -translate-y-1/2 rounded-full overflow-hidden bg-secondary">
                 <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 opacity-40" />
            </div>

            <Slider
              value={[value]} 
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              className="cursor-pointer"
            />
      </div>

       <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <span>0</span>
            <span>50</span>
            <span>100</span>
       </div>
    </div>
  );
}
