export function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean)
}

export function isCollectionPath(path: string): boolean {
  const segments = splitPath(path)
  return segments.length > 0 && segments.length % 2 === 1
}

export function isDocPath(path: string): boolean {
  const segments = splitPath(path)
  return segments.length > 0 && segments.length % 2 === 0
}

export function parentDoc(collectionPath: string): string | undefined {
  const segments = splitPath(collectionPath)
  if (segments.length <= 1) return undefined
  return segments.slice(0, -1).join("/")
}

export function parentCollection(docPath: string): string | undefined {
  const segments = splitPath(docPath)
  if (segments.length < 2) return undefined
  return segments.slice(0, -1).join("/")
}

export function docId(docPath: string): string {
  const segments = splitPath(docPath)
  return segments[segments.length - 1] ?? ""
}

export function collectionId(collectionPath: string): string {
  const segments = splitPath(collectionPath)
  return segments[segments.length - 1] ?? ""
}

export function joinPath(...parts: string[]): string {
  return parts.flatMap(splitPath).join("/")
}

export function encodePath(path: string): string {
  return splitPath(path).map(encodeURIComponent).join("/")
}

export function documentResourceName(
  projectId: string,
  databaseId: string,
  path: string
): string {
  return `projects/${projectId}/databases/${databaseId}/documents${path ? "/" + path : ""}`
}
