export interface FirebaseProject {
  projectId: string
  projectNumber: string
  displayName: string
  name: string
  resources?: {
    hostingSite?: string
    realtimeDatabaseInstance?: string
    storageBucket?: string
    locationId?: string
  }
  state?: "ACTIVE" | "DELETED"
}

export interface FirebaseWebApp {
  name: string
  appId: string
  displayName?: string
  projectId: string
  webId: string
  apiKeyId?: string
}

export interface FirebaseConfig {
  projectId: string
  appId: string
  apiKey: string
  authDomain: string
  storageBucket?: string
  messagingSenderId?: string
  measurementId?: string
}
