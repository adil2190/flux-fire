import { encodeValue } from "./encoding"
import type { FieldValue, FilterOp, OrderBy, QueryState } from "@/types/firestore"

type FieldOp =
  | "EQUAL"
  | "NOT_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "ARRAY_CONTAINS"
  | "ARRAY_CONTAINS_ANY"
  | "IN"
  | "NOT_IN"

type UnaryOp = "IS_NAN" | "IS_NULL" | "IS_NOT_NAN" | "IS_NOT_NULL"

const FIELD_OP_MAP: Partial<Record<FilterOp, FieldOp>> = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  "array-contains": "ARRAY_CONTAINS",
  "array-contains-any": "ARRAY_CONTAINS_ANY",
  in: "IN",
  "not-in": "NOT_IN",
}

const UNARY_OP_MAP: Partial<Record<FilterOp, UnaryOp>> = {
  "is-null": "IS_NULL",
  "is-not-null": "IS_NOT_NULL",
  "is-nan": "IS_NAN",
  "is-not-nan": "IS_NOT_NAN",
}

export function isUnaryOp(op: FilterOp): boolean {
  return op in UNARY_OP_MAP
}

interface StructuredQueryFilter {
  fieldFilter?: { field: { fieldPath: string }; op: FieldOp; value: unknown }
  unaryFilter?: { field: { fieldPath: string }; op: UnaryOp }
  compositeFilter?: { op: "AND" | "OR"; filters: StructuredQueryFilter[] }
}

export interface StructuredQueryBody {
  structuredQuery: {
    from: { collectionId: string; allDescendants?: boolean }[]
    where?: StructuredQueryFilter
    orderBy?: { field: { fieldPath: string }; direction: "ASCENDING" | "DESCENDING" }[]
    limit?: number
    startAt?: { values: unknown[]; before?: boolean }
  }
}

export function buildStructuredQuery(state: QueryState): StructuredQueryBody {
  const filters = state.filters.map(filterToWire).filter(Boolean) as StructuredQueryFilter[]

  const where: StructuredQueryFilter | undefined =
    filters.length === 0
      ? undefined
      : filters.length === 1
      ? filters[0]
      : { compositeFilter: { op: "AND", filters } }

  const orderBy = effectiveOrderBy(state.orderBy).map((o) => ({
    field: { fieldPath: o.field },
    direction: o.dir === "asc" ? ("ASCENDING" as const) : ("DESCENDING" as const),
  }))

  const startAt = state.cursor
    ? { values: state.cursor.startAfter.map(encodeValue), before: false }
    : undefined

  return {
    structuredQuery: {
      from: [{ collectionId: state.collectionId, allDescendants: state.allDescendants || undefined }],
      where,
      orderBy,
      limit: state.limit > 0 ? state.limit : undefined,
      startAt,
    },
  }
}

function filterToWire(f: { field: string; op: FilterOp; value: FieldValue }): StructuredQueryFilter | null {
  const unary = UNARY_OP_MAP[f.op]
  if (unary) {
    return { unaryFilter: { field: { fieldPath: f.field }, op: unary } }
  }
  const fieldOp = FIELD_OP_MAP[f.op]
  if (!fieldOp) return null
  return {
    fieldFilter: {
      field: { fieldPath: f.field },
      op: fieldOp,
      value: encodeValue(f.value),
    },
  }
}

export function effectiveOrderBy(orderBy: OrderBy[]): OrderBy[] {
  if (orderBy.length > 0) return orderBy
  return [{ field: "__name__", dir: "asc" }]
}

export function inequalityFields(filters: { op: FilterOp; field: string }[]): string[] {
  const inequalities: FilterOp[] = ["<", "<=", ">", ">=", "!=", "not-in"]
  const set = new Set<string>()
  for (const f of filters) if (inequalities.includes(f.op)) set.add(f.field)
  return Array.from(set)
}
