import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FirebaseConfig, FirebaseProject } from "@/types/project"

interface ProjectState {
  selectedProject: FirebaseProject | null
  firebaseConfig: FirebaseConfig | null
  setSelectedProject: (project: FirebaseProject | null) => void
  setFirebaseConfig: (config: FirebaseConfig | null) => void
  disconnect: () => void
}

type PersistedProjectState = Pick<ProjectState, "selectedProject" | "firebaseConfig">

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      firebaseConfig: null,
      setSelectedProject: (project) => set({ selectedProject: project }),
      setFirebaseConfig: (config) => set({ firebaseConfig: config }),
      disconnect: () =>
        set({
          selectedProject: null,
          firebaseConfig: null,
        }),
    }),
    {
      name: "fluxfire-project",
      // v1 dropped the emulator settings; persist only the project selection.
      version: 1,
      partialize: (state): PersistedProjectState => ({
        selectedProject: state.selectedProject,
        firebaseConfig: state.firebaseConfig,
      }),
      migrate: (persisted): PersistedProjectState => {
        const state = persisted as Partial<PersistedProjectState> | undefined
        return {
          selectedProject: state?.selectedProject ?? null,
          firebaseConfig: state?.firebaseConfig ?? null,
        }
      },
    }
  )
)
