import type { FieldValue, FirestoreDocument } from "@/types/firestore"

type WireValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { referenceValue: string }
  | { arrayValue: { values?: WireValue[] } }
  | { mapValue: { fields?: Record<string, WireValue> } }
  | { bytesValue: string }

interface WireDocument {
  name: string
  fields?: Record<string, WireValue>
  createTime?: string
  updateTime?: string
}

export function decodeValue(wire: WireValue): FieldValue {
  if ("stringValue" in wire) return { kind: "string", value: wire.stringValue }
  if ("integerValue" in wire) return { kind: "integer", value: wire.integerValue }
  if ("doubleValue" in wire) return { kind: "double", value: wire.doubleValue }
  if ("booleanValue" in wire) return { kind: "boolean", value: wire.booleanValue }
  if ("nullValue" in wire) return { kind: "null" }
  if ("timestampValue" in wire) return { kind: "timestamp", value: wire.timestampValue }
  if ("geoPointValue" in wire) {
    return {
      kind: "geopoint",
      lat: wire.geoPointValue.latitude ?? 0,
      lng: wire.geoPointValue.longitude ?? 0,
    }
  }
  if ("referenceValue" in wire) {
    return { kind: "reference", path: stripDocumentsPrefix(wire.referenceValue) }
  }
  if ("arrayValue" in wire) {
    const values = wire.arrayValue.values ?? []
    return { kind: "array", value: values.map(decodeValue) }
  }
  if ("mapValue" in wire) {
    const fields = wire.mapValue.fields ?? {}
    const value: Record<string, FieldValue> = {}
    for (const [k, v] of Object.entries(fields)) value[k] = decodeValue(v)
    return { kind: "map", value }
  }
  if ("bytesValue" in wire) return { kind: "bytes", base64: wire.bytesValue }
  return { kind: "null" }
}

export function encodeValue(value: FieldValue): WireValue {
  switch (value.kind) {
    case "string":
      return { stringValue: value.value }
    case "integer":
      return { integerValue: value.value }
    case "double":
      return { doubleValue: value.value }
    case "boolean":
      return { booleanValue: value.value }
    case "null":
      return { nullValue: null }
    case "timestamp":
      return { timestampValue: value.value }
    case "geopoint":
      return { geoPointValue: { latitude: value.lat, longitude: value.lng } }
    case "reference":
      return { referenceValue: value.path }
    case "array":
      return { arrayValue: { values: value.value.map(encodeValue) } }
    case "map": {
      const fields: Record<string, WireValue> = {}
      for (const [k, v] of Object.entries(value.value)) fields[k] = encodeValue(v)
      return { mapValue: { fields } }
    }
    case "bytes":
      return { bytesValue: value.base64 }
  }
}

export function decodeDocument(wire: WireDocument): FirestoreDocument {
  const path = stripDocumentsPrefix(wire.name)
  const segments = path.split("/")
  const fields: Record<string, FieldValue> = {}
  for (const [k, v] of Object.entries(wire.fields ?? {})) fields[k] = decodeValue(v)
  return {
    name: wire.name,
    path,
    id: segments[segments.length - 1] ?? "",
    fields,
    createTime: wire.createTime,
    updateTime: wire.updateTime,
  }
}

export function encodeFields(
  fields: Record<string, FieldValue>
): Record<string, WireValue> {
  const out: Record<string, WireValue> = {}
  for (const [k, v] of Object.entries(fields)) out[k] = encodeValue(v)
  return out
}

export function fieldValueToPlain(v: FieldValue): unknown {
  switch (v.kind) {
    case "string":
    case "boolean":
    case "double":
      return v.value
    case "integer":
      return v.value
    case "null":
      return null
    case "timestamp":
      return v.value
    case "geopoint":
      return { lat: v.lat, lng: v.lng }
    case "reference":
      return v.path
    case "array":
      return v.value.map(fieldValueToPlain)
    case "map": {
      const out: Record<string, unknown> = {}
      for (const [k, child] of Object.entries(v.value)) out[k] = fieldValueToPlain(child)
      return out
    }
    case "bytes":
      return v.base64
  }
}

export function inferFieldValue(input: unknown): FieldValue {
  if (input === null || input === undefined) return { kind: "null" }
  if (typeof input === "string") return { kind: "string", value: input }
  if (typeof input === "boolean") return { kind: "boolean", value: input }
  if (typeof input === "number") {
    return Number.isInteger(input)
      ? { kind: "integer", value: String(input) }
      : { kind: "double", value: input }
  }
  if (Array.isArray(input)) return { kind: "array", value: input.map(inferFieldValue) }
  if (typeof input === "object") {
    const value: Record<string, FieldValue> = {}
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      value[k] = inferFieldValue(v)
    }
    return { kind: "map", value }
  }
  return { kind: "string", value: String(input) }
}

function stripDocumentsPrefix(name: string): string {
  const marker = "/documents/"
  const idx = name.indexOf(marker)
  if (idx === -1) return name
  return name.slice(idx + marker.length)
}
