"use client"

import { Plus, Play, RotateCcw, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { FieldEditor } from "./field-editor"
import { isUnaryOp, inequalityFields } from "@/lib/firestore/queries"
import { cn } from "@/lib/utils"
import type { FilterOp, OrderBy, QueryFilter, QueryState } from "@/types/firestore"

interface Props {
  state: QueryState
  onChange: (next: QueryState) => void
  onRun: () => void
  onReset: () => void
  isRunning: boolean
}

const ALL_OPS: { value: FilterOp; label: string }[] = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: "<", label: "<" },
  { value: "<=", label: "<=" },
  { value: ">", label: ">" },
  { value: ">=", label: ">=" },
  { value: "in", label: "in" },
  { value: "not-in", label: "not-in" },
  { value: "array-contains", label: "array-contains" },
  { value: "array-contains-any", label: "array-contains-any" },
  { value: "is-null", label: "is null" },
  { value: "is-not-null", label: "is not null" },
  { value: "is-nan", label: "is nan" },
  { value: "is-not-nan", label: "is not nan" },
]

export function QueryBuilder({ state, onChange, onRun, onReset, isRunning }: Props) {
  const [open, setOpen] = useState(true)
  const inequalities = inequalityFields(state.filters)
  const orderByMismatch =
    inequalities.length > 0 &&
    state.orderBy.length > 0 &&
    state.orderBy[0].field !== inequalities[0]

  return (
    <div className="border-b bg-card">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs">Query</span>
          </Button>
          <Badge variant="outline" className="font-mono text-[11px]">
            {state.allDescendants ? `collectionGroup(${state.collectionId})` : state.collectionId || "(no collection)"}
          </Badge>
          {state.filters.length > 0 && (
            <Badge variant="secondary" className="text-[11px]">
              {state.filters.length} filter{state.filters.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={onReset}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={isRunning || !state.collectionId}
            onClick={onRun}
          >
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t px-4 py-3">
          <div className="flex items-center gap-3">
            <Label className="flex items-center gap-2 text-xs">
              <Switch
                checked={state.allDescendants}
                onCheckedChange={(v) => onChange({ ...state, allDescendants: v })}
              />
              Search descendants (collectionGroup)
            </Label>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Where</p>
            {state.filters.length === 0 && (
              <p className="text-xs text-muted-foreground">No filters</p>
            )}
            {state.filters.map((f) => (
              <FilterRow
                key={f.id}
                filter={f}
                onChange={(next) =>
                  onChange({
                    ...state,
                    filters: state.filters.map((x) => (x.id === f.id ? next : x)),
                  })
                }
                onRemove={() =>
                  onChange({ ...state, filters: state.filters.filter((x) => x.id !== f.id) })
                }
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() =>
                onChange({
                  ...state,
                  filters: [
                    ...state.filters,
                    {
                      id: cryptoRandomId(),
                      field: "",
                      op: "==",
                      value: { kind: "string", value: "" },
                    },
                  ],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add filter
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Order by</p>
            {state.orderBy.map((o, idx) => (
              <OrderByRow
                key={idx}
                orderBy={o}
                onChange={(next) =>
                  onChange({
                    ...state,
                    orderBy: state.orderBy.map((x, i) => (i === idx ? next : x)),
                  })
                }
                onRemove={() =>
                  onChange({
                    ...state,
                    orderBy: state.orderBy.filter((_, i) => i !== idx),
                  })
                }
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() =>
                onChange({
                  ...state,
                  orderBy: [...state.orderBy, { field: "", dir: "asc" }],
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add order
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs">Limit</Label>
            <Input
              type="number"
              className="h-7 w-24 text-xs"
              value={state.limit}
              onChange={(e) =>
                onChange({ ...state, limit: Math.max(0, Number(e.target.value)) })
              }
            />
          </div>

          {orderByMismatch && (
            <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              Firestore requires the first orderBy field to match the inequality field
              ({inequalities[0]}). Adjust orderBy or remove the inequality.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface FilterRowProps {
  filter: QueryFilter
  onChange: (next: QueryFilter) => void
  onRemove: () => void
}

function FilterRow({ filter, onChange, onRemove }: FilterRowProps) {
  const unary = isUnaryOp(filter.op)

  return (
    <div className="flex items-start gap-2">
      <Input
        placeholder="field.path"
        className="h-8 w-48 font-mono text-xs"
        value={filter.field}
        onChange={(e) => onChange({ ...filter, field: e.target.value })}
      />
      <Select
        value={filter.op}
        onValueChange={(v) => onChange({ ...filter, op: v as FilterOp })}
      >
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALL_OPS.map((op) => (
            <SelectItem key={op.value} value={op.value} className="text-xs">
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className={cn("flex-1", unary && "pointer-events-none opacity-40")}>
        <FieldEditor
          value={filter.value}
          onChange={(v) => onChange({ ...filter, value: v })}
          compact
        />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

interface OrderByRowProps {
  orderBy: OrderBy
  onChange: (next: OrderBy) => void
  onRemove: () => void
}

function OrderByRow({ orderBy, onChange, onRemove }: OrderByRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="field.path"
        className="h-8 w-48 font-mono text-xs"
        value={orderBy.field}
        onChange={(e) => onChange({ ...orderBy, field: e.target.value })}
      />
      <Select
        value={orderBy.dir}
        onValueChange={(v) => onChange({ ...orderBy, dir: v as "asc" | "desc" })}
      >
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="asc" className="text-xs">asc</SelectItem>
          <SelectItem value="desc" className="text-xs">desc</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}
