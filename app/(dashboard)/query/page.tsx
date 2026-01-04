"use client"

import { Terminal } from "lucide-react"
import { useProjectStore } from "@/stores/project-store"

export default function QueryPage() {
  const { selectedProject } = useProjectStore()

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Query</h1>
        <p className="text-muted-foreground">
          Query your Firestore data using visual builder or JavaScript
        </p>
      </div>

      <div className="flex-1 rounded-lg border bg-card p-6">
        <div className="flex h-full items-center justify-center text-center">
          <div>
            <Terminal className="mx-auto h-16 w-16 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">Query Interface</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {selectedProject
                ? `Query data in ${selectedProject.displayName}`
                : "Select a project to run queries"}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Query interface coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
