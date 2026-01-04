import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FirebaseConfig, FirebaseProject } from "@/types/project"

interface ProjectState {
  selectedProject: FirebaseProject | null
  firebaseConfig: FirebaseConfig | null
  useEmulator: boolean
  emulatorPorts: {
    firestore: number
    auth: number
  }
  setSelectedProject: (project: FirebaseProject | null) => void
  setFirebaseConfig: (config: FirebaseConfig | null) => void
  toggleEmulator: () => void
  setEmulatorPorts: (ports: Partial<{ firestore: number; auth: number }>) => void
  disconnect: () => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      selectedProject: null,
      firebaseConfig: null,
      useEmulator: false,
      emulatorPorts: {
        firestore: 8080,
        auth: 9099,
      },
      setSelectedProject: (project) => set({ selectedProject: project }),
      setFirebaseConfig: (config) => set({ firebaseConfig: config }),
      toggleEmulator: () => set((state) => ({ useEmulator: !state.useEmulator })),
      setEmulatorPorts: (ports) =>
        set((state) => ({
          emulatorPorts: { ...state.emulatorPorts, ...ports },
        })),
      disconnect: () =>
        set({
          selectedProject: null,
          firebaseConfig: null,
        }),
    }),
    {
      name: "fluxfire-project",
    }
  )
)
