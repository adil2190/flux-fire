"use client"

import { useState } from "react"
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
  const writeDoc = useWriteDocument()

  const submit = async () => {
    const id = autoId ? randomId() : docId.trim()
    if (!id) {
      toast.error("Document ID required")
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
      toast.error(err instanceof FirestoreError ? err.message : "Create failed")
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-id" className="text-xs">Auto-generated ID</Label>
            <Switch id="auto-id" checked={autoId} onCheckedChange={setAutoId} />
          </div>
          {!autoId && (
            <div className="space-y-1">
              <Label htmlFor="doc-id" className="text-xs">Document ID</Label>
              <Input
                id="doc-id"
                className="font-mono text-xs"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                placeholder="abc123"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={writeDoc.isPending}>Create</Button>
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
