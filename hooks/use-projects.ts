"use client"

import { useQuery } from "@tanstack/react-query"
import type { FirebaseProject, FirebaseConfig } from "@/types/project"

interface ProjectsResponse {
  projects: FirebaseProject[]
}

interface ConfigResponse {
  config: FirebaseConfig
  warning?: string
}

export function useProjects() {
  return useQuery<ProjectsResponse>({
    queryKey: ["firebase-projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects")
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      return response.json()
    },
  })
}

export function useProjectConfig(projectId: string | undefined) {
  return useQuery<ConfigResponse>({
    queryKey: ["firebase-config", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/config`)
      if (!response.ok) {
        throw new Error("Failed to fetch config")
      }
      return response.json()
    },
    enabled: !!projectId,
  })
}
