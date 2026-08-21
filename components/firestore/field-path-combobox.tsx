"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, CornerDownLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Props {
  value: string
  options: string[]
  onChange: (value: string) => void
  className?: string
}

export function FieldPathCombobox({
  value,
  options,
  onChange,
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredOptions = useMemo(
    () =>
      normalizedSearch
        ? options.filter((option) =>
            option.toLocaleLowerCase().includes(normalizedSearch)
          )
        : options,
    [normalizedSearch, options]
  )
  const hasExactMatch = options.some(
    (option) => option.toLocaleLowerCase() === normalizedSearch
  )

  const choose = (next: string) => {
    onChange(next)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) setSearch("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label="Choose field path"
          aria-expanded={open}
          className={cn(
            "h-8 justify-between px-3 font-mono text-xs font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{value || "field.path"}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search or type a field path..."
          />
          <CommandList>
            {filteredOptions.length === 0 && !search.trim() && (
              <CommandEmpty>No fields found in loaded documents.</CommandEmpty>
            )}

            {filteredOptions.length > 0 && (
              <CommandGroup heading="Fields in loaded documents">
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => choose(option)}
                    className="font-mono text-xs"
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5",
                        value === option ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {search.trim() && !hasExactMatch && (
              <CommandGroup heading="Custom field path">
                <CommandItem
                  value={`custom:${search.trim()}`}
                  onSelect={() => choose(search.trim())}
                  className="text-xs"
                >
                  <CornerDownLeft className="h-3.5 w-3.5" />
                  Use
                  <span className="truncate font-mono font-medium">
                    {search.trim()}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
