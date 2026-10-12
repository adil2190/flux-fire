"use client"

import { Copy, Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { exportCsv, exportJson, downloadBlob } from "@/lib/firestore/export"
import type { FirestoreDocument } from "@/types/firestore"

interface Props {
  documents: FirestoreDocument[]
  /** File name prefix, e.g. the collection ID; a timestamp is appended. */
  filenameBase: string
}

/** Copy IDs / Export JSON / Export CSV for the given documents. */
export function ExportActions({ documents, filenameBase }: Props) {
  const disabled = documents.length === 0

  const copyIds = async () => {
    await navigator.clipboard.writeText(documents.map((d) => d.id).join("\n"))
    toast.success(
      `Copied ${documents.length} document ${documents.length === 1 ? "ID" : "IDs"}`
    )
  }

  const download = (format: "json" | "csv") => {
    const filename = `${filenameBase}-${Date.now()}.${format}`
    if (format === "json") {
      downloadBlob(exportJson(documents), filename, "application/json")
    } else {
      downloadBlob(exportCsv(documents), filename, "text/csv")
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={disabled}
        onClick={copyIds}
      >
        <Copy className="h-3.5 w-3.5" /> Copy IDs
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={disabled}
        onClick={() => download("json")}
      >
        <Download className="h-3.5 w-3.5" /> Export JSON
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={disabled}
        onClick={() => download("csv")}
      >
        <Download className="h-3.5 w-3.5" /> Export CSV
      </Button>
    </>
  )
}
