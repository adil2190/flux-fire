"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useWriteDocument } from "@/hooks/firestore/use-write-document"
import { joinPath } from "@/lib/firestore/paths"
import { FirestoreError } from "@/lib/firestore/errors"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  collectionPath: string
  onCreated: (path: string) => void
}

export function NewDocumentDialog({ open, onOpenChange, collectionPath, onCreated }: Props) {
  const [docId, setDocId] = useState("")
  const [autoId, setAutoId] = useState(true)
  const [idError, setIdError] = useState<string | null>(null)
  const idInputRef = useRef<HTMLInputElement>(null)
  const writeDoc = useWriteDocument()

  const submit = async () => {
    const id = autoId ? randomId() : docId.trim()
    if (!id) {
      setIdError("Enter a document ID, or turn on Auto-generated ID.")
      idInputRef.current?.focus()
      return
    }
    const path = joinPath(collectionPath, id)
    try {
      await writeDoc.mutateAsync({
        path,
        fields: {},
        mode: "create",
      })
      toast.success(`Created ${path}`)
      onCreated(path)
      onOpenChange(false)
      setDocId("")
    } catch (err) {
      toast.error(
        err instanceof FirestoreError
          ? err.message
          : "Unable to create the document. Try again.",
        { duration: Infinity }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New document</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            in {collectionPath}
          </DialogDescription>
        </DialogHeader>
        <form
          id="new-document-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-id" className="text-xs">Auto-generated ID</Label>
            <Switch
              id="auto-id"
              checked={autoId}
              onCheckedChange={(checked) => {
                setAutoId(checked)
                setIdError(null)
              }}
            />
          </div>
          {!autoId && (
            <div className="space-y-1">
              <Label htmlFor="doc-id" className="text-xs">Document ID</Label>
              <Input
                id="doc-id"
                ref={idInputRef}
                className="font-mono text-xs"
                value={docId}
                aria-invalid={!!idError}
                aria-describedby={idError ? "doc-id-error" : undefined}
                onChange={(e) => {
                  setDocId(e.target.value)
                  setIdError(null)
                }}
                placeholder="abc123"
                autoComplete="off"
              />
              {idError && (
                <p id="doc-id-error" className="text-xs text-destructive">
                  {idError}
                </p>
              )}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="new-document-form" disabled={writeDoc.isPending}>
            Create document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function randomId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let id = ""
  for (let i = 0; i < 20; i++) id += chars.charAt(Math.floor(Math.random() * chars.length))
  return id
}
