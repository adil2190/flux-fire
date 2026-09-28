"use client"

import { Plus, Play, RotateCcw, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { useId, useState } from "react"
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
import { FieldPathCombobox } from "./field-path-combobox"
import { isUnaryOp, inequalityFields, MAX_QUERY_LIMIT } from "@/lib/firestore/queries"
import { cn } from "@/lib/utils"
import type { FilterOp, OrderBy, QueryFilter, QueryState } from "@/types/firestore"

interface Props {
  state: QueryState
  onChange: (next: QueryState) => void
  onRun: () => void
  onReset: () => void
  isRunning: boolean
  layout?: "inline" | "stacked"
  fieldPaths?: string[]
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

export function QueryBuilder({
  state,
  onChange,
  onRun,
  onReset,
  isRunning,
  layout = "inline",
  fieldPaths,
}: Props) {
  const [open, setOpen] = useState(true)
  const limitId = useId()
  const inequalities = inequalityFields(state.filters)
  const orderByMismatch =
    inequalities.length > 0 &&
    state.orderBy.length > 0 &&
    state.orderBy[0].field !== inequalities[0]

  return (
    <div className="border-b bg-card">
      <div className="flex items-center justify-between px-3 py-1.5">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs">Query</span>
          </Button>
          <Badge variant="outline" className="font-mono text-2xs">
            {state.allDescendants ? `collectionGroup(${state.collectionId})` : state.collectionId || "(no collection)"}
          </Badge>
          {state.filters.length > 0 && (
            <Badge variant="secondary" className="text-2xs">
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
            disabled={isRunning}
            onClick={onRun}
          >
            <Play className="h-3.5 w-3.5" /> Run
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 border-t px-3 py-2">
          <div>
            <Label className="flex items-center gap-2 text-xs leading-5">
              <Switch
                checked={state.allDescendants}
                onCheckedChange={(v) => onChange({ ...state, allDescendants: v })}
              />
              Search descendants (collectionGroup)
            </Label>
          </div>

          <div className="space-y-1">
            <div className="flex min-h-7 items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Where</p>
                {state.filters.length === 0 && (
                  <span className="text-2xs text-muted-foreground">No filters</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-2xs"
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
                <Plus className="h-3 w-3" /> Add filter
              </Button>
            </div>
            {state.filters.map((f) => (
              <FilterRow
                key={f.id}
                filter={f}
                layout={layout}
                fieldPaths={fieldPaths}
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
          </div>

          <div className="space-y-1">
            <div className="flex min-h-7 items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Order by</p>
                {state.orderBy.length === 0 && (
                  <span className="text-2xs text-muted-foreground">Default document order</span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2 text-2xs"
                onClick={() =>
                  onChange({
                    ...state,
                    orderBy: [...state.orderBy, { field: "", dir: "asc" }],
                  })
                }
              >
                <Plus className="h-3 w-3" /> Add order
              </Button>
            </div>
            {state.orderBy.map((o, idx) => (
              <OrderByRow
                key={idx}
                orderBy={o}
                layout={layout}
                fieldPaths={fieldPaths}
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
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor={limitId} className="text-xs">Limit</Label>
            <Input
              id={limitId}
              type="number"
              min={1}
              max={MAX_QUERY_LIMIT}
              aria-describedby={`${limitId}-hint`}
              className="h-7 w-24 text-xs"
              value={state.limit || ""}
              onChange={(e) =>
                onChange({
                  ...state,
                  limit: Math.min(MAX_QUERY_LIMIT, Math.max(0, Number(e.target.value))),
                })
              }
            />
            <span id={`${limitId}-hint`} className="text-2xs text-muted-foreground">
              Max {MAX_QUERY_LIMIT.toLocaleString("en-US")}
            </span>
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
  layout: "inline" | "stacked"
  fieldPaths?: string[]
}

function FilterRow({
  filter,
  onChange,
  onRemove,
  layout,
  fieldPaths,
}: FilterRowProps) {
  const unary = isUnaryOp(filter.op)
  const stacked = layout === "stacked"

  return (
    <div
      className={cn(
        "gap-2",
        stacked
          ? "grid grid-cols-[minmax(0,1fr)_10rem_2rem] items-start"
          : "flex items-start"
      )}
    >
      {fieldPaths ? (
        <FieldPathCombobox
          value={filter.field}
          options={fieldPaths}
          onChange={(field) => onChange({ ...filter, field })}
          className={stacked ? "col-start-1 row-start-1 w-full" : "w-48"}
        />
      ) : (
        <Input
          aria-label="Filter field path"
          placeholder="field.path"
          className={cn(
            "h-8 font-mono text-xs",
            stacked ? "col-start-1 row-start-1 w-full" : "w-48"
          )}
          value={filter.field}
          onChange={(e) => onChange({ ...filter, field: e.target.value })}
        />
      )}
      <Select
        value={filter.op}
        onValueChange={(v) => onChange({ ...filter, op: v as FilterOp })}
      >
        <SelectTrigger
          aria-label="Filter operator"
          className={cn(
            "h-8 w-40 text-xs",
            stacked && "col-start-2 row-start-1"
          )}
        >
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
      <div
        className={cn(
          "flex-1",
          stacked && "col-span-3 col-start-1 row-start-2"
        )}
      >
        {unary ? (
          <p className="flex h-8 items-center text-xs text-muted-foreground">
            No value needed for this operator
          </p>
        ) : (
          <FieldEditor
            value={filter.value}
            onChange={(v) => onChange({ ...filter, value: v })}
            label="Filter"
            compact
          />
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8",
          stacked && "col-start-3 row-start-1"
        )}
        aria-label={filter.field ? `Remove filter on ${filter.field}` : "Remove filter"}
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
  layout: "inline" | "stacked"
  fieldPaths?: string[]
}

function OrderByRow({
  orderBy,
  onChange,
  onRemove,
  layout,
  fieldPaths,
}: OrderByRowProps) {
  const stacked = layout === "stacked"

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        stacked && "grid grid-cols-[minmax(0,1fr)_7rem_2rem]"
      )}
    >
      {fieldPaths ? (
        <FieldPathCombobox
          value={orderBy.field}
          options={fieldPaths}
          onChange={(field) => onChange({ ...orderBy, field })}
          className={stacked ? "w-full" : "w-48"}
        />
      ) : (
        <Input
          aria-label="Order by field path"
          placeholder="field.path"
          className={cn(
            "h-8 font-mono text-xs",
            stacked ? "w-full" : "w-48"
          )}
          value={orderBy.field}
          onChange={(e) => onChange({ ...orderBy, field: e.target.value })}
        />
      )}
      <Select
        value={orderBy.dir}
        onValueChange={(v) => onChange({ ...orderBy, dir: v as "asc" | "desc" })}
      >
        <SelectTrigger className="h-8 w-28 text-xs" aria-label="Sort direction">
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
        aria-label={orderBy.field ? `Remove ordering by ${orderBy.field}` : "Remove ordering"}
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
