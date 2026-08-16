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

interface AccessResponse {
  accessible: boolean
  project?: FirebaseProject
}

interface UseProjectAccessOptions {
  refetchInterval?: number
}

export function useProjects() {
  return useQuery<ProjectsResponse>({
    queryKey: ["firebase-projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects", { cache: "no-store" })
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      return response.json()
    },
  })
}

export function useProjectAccess(
  projectId: string | undefined,
  options: UseProjectAccessOptions = {}
) {
  return useQuery<AccessResponse>({
    queryKey: ["firebase-project-access", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/access`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Failed to verify project access")
      }
      return response.json()
    },
    enabled: !!projectId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchInterval: options.refetchInterval,
  })
}

export function useProjectConfig(projectId: string | undefined) {
  return useQuery<ConfigResponse>({
    queryKey: ["firebase-config", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/config`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch config")
      }
      return response.json()
    },
    enabled: !!projectId,
  })
}
