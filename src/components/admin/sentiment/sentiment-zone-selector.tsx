
"use client";

import { cn } from "@/lib/utils";
import * as Slider from "@radix-ui/react-slider";

interface SentimentZoneSelectorProps {
  value: number; // 0-100
  onChange: (value: number) => void;
}

export function SentimentZoneSelector({ value, onChange }: SentimentZoneSelectorProps) {

  const handleValueChange = (val: number[]) => {
    onChange(val[0]);
  };

  const getZoneColor = (val: number) => {
    if (val < 40) return "bg-red-500 shadow-red-500/50";
    if (val < 70) return "bg-orange-500 shadow-orange-500/50";
    return "bg-emerald-500 shadow-emerald-500/50";
  };

  const getZoneLabel = (val: number) => {
    if (val < 40) return "Zona Crítica";
    if (val < 70) return "Zona Resiliente";
    return "Zona Saludable";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
        <span className="text-red-500">Crítica (0-39)</span>
        <span className="text-orange-500">Resiliente (40-69)</span>
        <span className="text-emerald-500">Saludable (70-100)</span>
      </div>

      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-10"
        value={[value]}
        onValueChange={handleValueChange}
        max={100}
        step={1}
      >
        <Slider.Track className="bg-secondary relative grow rounded-full h-4 overflow-hidden">
          {/* Gradients for zones */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 opacity-20" />
          <Slider.Range className="absolute h-full bg-transparent" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            "block w-8 h-8 rounded-full border-4 border-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-lg",
            getZoneColor(value)
          )}
          aria-label="Sentiment Score"
        >
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs font-bold shadow-sm whitespace-nowrap">
            {value} - {getZoneLabel(value)}
          </div>
        </Slider.Thumb>
      </Slider.Root>
      
      <p className="text-xs text-muted-foreground text-center italic">
        Desliza para ajustar la intensidad dentro de la zona.
      </p>
    </div>
  );
}
