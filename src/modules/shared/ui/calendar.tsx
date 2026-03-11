"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/modules/shared/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        /* Root & structure */
        root: "relative",
        months: "relative flex flex-col gap-4",
        month: "w-full",

        /* Caption — centered month name */
        month_caption: "flex items-center justify-center h-9 relative",
        caption_label: "text-sm font-medium",

        /* Nav — overlaid on top of caption, buttons at edges */
        nav: "absolute inset-x-0 top-3 z-10 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 transition-opacity"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 transition-opacity"
        ),
        chevron: "h-4 w-4",

        /* Grid */
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground flex-1 text-center font-normal text-xs py-1",
        weeks: "",
        week: "flex w-full",
        day: cn(
          "relative flex-1 p-0.5 text-center text-sm",
          "focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 mx-auto p-0 font-normal aria-selected:opacity-100 transition-colors"
        ),

        /* States */
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground rounded-md font-semibold",
        outside: "text-muted-foreground/40 aria-selected:text-muted-foreground/40",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",

        /* Range */
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",

        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
