"use client"

import { Plus, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FieldKind, FieldValue } from "@/types/firestore"

interface Props {
  value: FieldValue
  onChange: (next: FieldValue) => void
  compact?: boolean
}

const KIND_OPTIONS: { value: FieldKind; label: string }[] = [
  { value: "string", label: "string" },
  { value: "integer", label: "integer" },
  { value: "double", label: "double" },
  { value: "boolean", label: "boolean" },
  { value: "null", label: "null" },
  { value: "timestamp", label: "timestamp" },
  { value: "geopoint", label: "geopoint" },
  { value: "reference", label: "reference" },
  { value: "array", label: "array" },
  { value: "map", label: "map" },
  { value: "bytes", label: "bytes (base64)" },
]

export function FieldEditor({ value, onChange, compact }: Props) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Select
          value={value.kind}
          onValueChange={(kind) => onChange(coerceKind(value, kind as FieldKind))}
        >
          <SelectTrigger className="h-8 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-0 flex-1">
          <ScalarEditor value={value} onChange={onChange} compact={compact} />
        </div>
      </div>
      {(value.kind === "array" || value.kind === "map") && (
        <ContainerEditor value={value} onChange={onChange} />
      )}
    </div>
  )
}

function ScalarEditor({ value, onChange, compact }: Props) {
  switch (value.kind) {
    case "string":
      return compact ? (
        <Input
          className="h-8 text-xs"
          value={value.value}
          onChange={(e) => onChange({ kind: "string", value: e.target.value })}
        />
      ) : (
        <Textarea
          className="min-h-[60px] text-xs"
          value={value.value}
          onChange={(e) => onChange({ kind: "string", value: e.target.value })}
        />
      )
    case "integer":
      return (
        <Input
          className="h-8 text-xs"
          inputMode="numeric"
          value={value.value}
          onChange={(e) => {
            const next = e.target.value
            if (next === "" || /^-?\d+$/.test(next)) {
              onChange({ kind: "integer", value: next })
            }
          }}
        />
      )
    case "double":
      return (
        <Input
          className="h-8 text-xs"
          type="number"
          step="any"
          value={Number.isFinite(value.value) ? value.value : ""}
          onChange={(e) =>
            onChange({ kind: "double", value: Number(e.target.value) })
          }
        />
      )
    case "boolean":
      return (
        <div className="flex h-8 items-center">
          <Switch
            checked={value.value}
            onCheckedChange={(v) => onChange({ kind: "boolean", value: v })}
          />
        </div>
      )
    case "null":
      return <span className="text-xs text-muted-foreground">null</span>
    case "timestamp":
      return (
        <Input
          className="h-8 text-xs"
          type="datetime-local"
          value={toLocalDatetime(value.value)}
          onChange={(e) =>
            onChange({ kind: "timestamp", value: fromLocalDatetime(e.target.value) })
          }
        />
      )
    case "geopoint":
      return (
        <div className="flex gap-1">
          <Input
            className="h-8 text-xs"
            type="number"
            step="any"
            placeholder="lat"
            value={value.lat}
            onChange={(e) =>
              onChange({ ...value, lat: Number(e.target.value) })
            }
          />
          <Input
            className="h-8 text-xs"
            type="number"
            step="any"
            placeholder="lng"
            value={value.lng}
            onChange={(e) =>
              onChange({ ...value, lng: Number(e.target.value) })
            }
          />
        </div>
      )
    case "reference":
      return (
        <Input
          className="h-8 font-mono text-xs"
          placeholder="users/abc"
          value={value.path}
          onChange={(e) => onChange({ kind: "reference", path: e.target.value })}
        />
      )
    case "bytes":
      return (
        <Textarea
          className="min-h-[60px] font-mono text-xs"
          placeholder="base64"
          value={value.base64}
          onChange={(e) => onChange({ kind: "bytes", base64: e.target.value })}
        />
      )
    case "array":
    case "map":
      return (
        <span className="text-xs text-muted-foreground">
          {value.kind === "array"
            ? `${value.value.length} items`
            : `${Object.keys(value.value).length} keys`}
        </span>
      )
  }
}

function ContainerEditor({ value, onChange }: Props) {
  if (value.kind === "array") {
    return (
      <div className="ml-4 flex flex-col gap-2 border-l pl-3">
        {value.value.map((child, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className="mt-2 w-6 text-right text-xs text-muted-foreground">
              {idx}
            </span>
            <div className="flex-1">
              <FieldEditor
                value={child}
                onChange={(next) => {
                  const arr = [...value.value]
                  arr[idx] = next
                  onChange({ kind: "array", value: arr })
                }}
                compact
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const arr = value.value.filter((_, i) => i !== idx)
                onChange({ kind: "array", value: arr })
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-fit gap-1 text-xs"
          onClick={() =>
            onChange({
              kind: "array",
              value: [...value.value, { kind: "string", value: "" }],
            })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    )
  }

  if (value.kind === "map") {
    const entries = Object.entries(value.value)
    return (
      <div className="ml-4 flex flex-col gap-2 border-l pl-3">
        {entries.map(([key, child], idx) => (
          <div key={`${key}-${idx}`} className="flex items-start gap-2">
            <Input
              className="mt-0 h-8 w-28 text-xs"
              value={key}
              onChange={(e) => {
                const newKey = e.target.value
                const obj: Record<string, FieldValue> = {}
                for (const [k, v] of entries) {
                  obj[k === key ? newKey : k] = v
                }
                onChange({ kind: "map", value: obj })
              }}
            />
            <div className="flex-1">
              <FieldEditor
                value={child}
                onChange={(next) => {
                  onChange({
                    kind: "map",
                    value: { ...value.value, [key]: next },
                  })
                }}
                compact
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                const obj = { ...value.value }
                delete obj[key]
                onChange({ kind: "map", value: obj })
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-fit gap-1 text-xs"
          onClick={() => {
            const baseKey = "newField"
            let key = baseKey
            let i = 1
            while (key in value.value) key = `${baseKey}${i++}`
            onChange({
              kind: "map",
              value: { ...value.value, [key]: { kind: "string", value: "" } },
            })
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    )
  }
  return null
}

function coerceKind(prev: FieldValue, kind: FieldKind): FieldValue {
  if (prev.kind === kind) return prev
  switch (kind) {
    case "string":
      return { kind: "string", value: scalarToString(prev) }
    case "integer":
      return { kind: "integer", value: scalarToInt(prev) }
    case "double":
      return { kind: "double", value: scalarToDouble(prev) }
    case "boolean":
      return { kind: "boolean", value: false }
    case "null":
      return { kind: "null" }
    case "timestamp":
      return { kind: "timestamp", value: new Date().toISOString() }
    case "geopoint":
      return { kind: "geopoint", lat: 0, lng: 0 }
    case "reference":
      return { kind: "reference", path: "" }
    case "array":
      return { kind: "array", value: [] }
    case "map":
      return { kind: "map", value: {} }
    case "bytes":
      return { kind: "bytes", base64: "" }
  }
}

function scalarToString(v: FieldValue): string {
  switch (v.kind) {
    case "string":
      return v.value
    case "integer":
      return v.value
    case "double":
      return String(v.value)
    case "boolean":
      return String(v.value)
    case "null":
      return ""
    case "timestamp":
      return v.value
    case "reference":
      return v.path
    case "bytes":
      return v.base64
    default:
      return ""
  }
}

function scalarToInt(v: FieldValue): string {
  if (v.kind === "integer") return v.value
  if (v.kind === "double" && Number.isFinite(v.value)) return String(Math.trunc(v.value))
  return "0"
}

function scalarToDouble(v: FieldValue): number {
  if (v.kind === "double") return v.value
  if (v.kind === "integer") return Number(v.value)
  return 0
}

function toLocalDatetime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDatetime(local: string): string {
  if (!local) return new Date(0).toISOString()
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString()
}

export function defaultFieldValue(kind: FieldKind): FieldValue {
  return coerceKind({ kind: "null" }, kind)
}
