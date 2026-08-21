import type { FieldValue, FirestoreDocument } from "@/types/firestore"

export function collectFieldPaths(documents: FirestoreDocument[]): string[] {
  const paths = new Set<string>(["__name__"])

  for (const document of documents) {
    addFieldPaths(document.fields, "", paths)
  }

  return Array.from(paths).sort((a, b) => {
    if (a === "__name__") return -1
    if (b === "__name__") return 1
    return a.localeCompare(b)
  })
}

function addFieldPaths(
  fields: Record<string, FieldValue>,
  parent: string,
  paths: Set<string>
) {
  for (const [name, value] of Object.entries(fields)) {
    const segment = encodeFieldPathSegment(name)
    const path = parent ? `${parent}.${segment}` : segment
    paths.add(path)

    if (value.kind === "map") {
      addFieldPaths(value.value, path, paths)
    }
  }
}

function encodeFieldPathSegment(segment: string): string {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(segment)) return segment
  return `\`${segment.replace(/`/g, "\\`")}\``
}
