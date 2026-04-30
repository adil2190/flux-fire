export type FieldValue =
  | { kind: "string"; value: string }
  | { kind: "integer"; value: string }
  | { kind: "double"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null" }
  | { kind: "timestamp"; value: string }
  | { kind: "geopoint"; lat: number; lng: number }
  | { kind: "reference"; path: string }
  | { kind: "array"; value: FieldValue[] }
  | { kind: "map"; value: Record<string, FieldValue> }
  | { kind: "bytes"; base64: string }

export type FieldKind = FieldValue["kind"]

export interface FirestoreDocument {
  name: string
  path: string
  id: string
  fields: Record<string, FieldValue>
  createTime?: string
  updateTime?: string
}

export type FilterOp =
  | "=="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "in"
  | "not-in"
  | "array-contains"
  | "array-contains-any"
  | "is-null"
  | "is-not-null"
  | "is-nan"
  | "is-not-nan"

export interface QueryFilter {
  id: string
  field: string
  op: FilterOp
  value: FieldValue
}

export interface OrderBy {
  field: string
  dir: "asc" | "desc"
}

export interface QueryState {
  collectionId: string
  parentDoc?: string
  allDescendants: boolean
  filters: QueryFilter[]
  orderBy: OrderBy[]
  limit: number
  cursor?: { startAfter: FieldValue[] }
}

export interface ListPage {
  documents: FirestoreDocument[]
  nextPageToken?: string
}

export interface FirestoreErrorBody {
  status: string
  code: number
  message: string
  indexUrl?: string
}
