"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/modules/shared/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/shared/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/ui/popover"
import type { IngredientSelectOption } from "@/modules/sherlock/actions/ingredients"

interface IngredientComboboxProps {
  ingredients: IngredientSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function IngredientCombobox({
  ingredients,
  value,
  onChange,
  placeholder = "Seleccionar...",
}: IngredientComboboxProps) {
  const [open, setOpen] = useState(false)
  const selectedName = ingredients.find((i) => i.id === value)?.name

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-8 px-3 text-sm"
        >
          <span className="truncate">{selectedName || placeholder}</span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar ingrediente..." />
          <CommandList>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {ingredients.map((ing) => (
                <CommandItem
                  key={ing.id}
                  value={ing.name}
                  onSelect={() => {
                    onChange(ing.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-3.5 w-3.5",
                      value === ing.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {ing.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
