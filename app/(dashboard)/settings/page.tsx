"use client"

import { Zap, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useProjectStore } from "@/stores/project-store"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { useEmulator, emulatorPorts, toggleEmulator, setEmulatorPorts } =
    useProjectStore()

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Fluxfire preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Emulator Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Firebase Emulators
            </CardTitle>
            <CardDescription>
              Connect to local Firebase emulators for development
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emulator-toggle">Use Emulators</Label>
                <p className="text-sm text-muted-foreground">
                  Connect to local emulators instead of production
                </p>
              </div>
              <Switch
                id="emulator-toggle"
                checked={useEmulator}
                onCheckedChange={toggleEmulator}
              />
            </div>

            {useEmulator && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firestore-port">Firestore Port</Label>
                    <Input
                      id="firestore-port"
                      type="number"
                      value={emulatorPorts.firestore}
                      onChange={(e) =>
                        setEmulatorPorts({
                          firestore: parseInt(e.target.value) || 8080,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-port">Auth Port</Label>
                    <Input
                      id="auth-port"
                      type="number"
                      value={emulatorPorts.auth}
                      onChange={(e) =>
                        setEmulatorPorts({
                          auth: parseInt(e.target.value) || 9099,
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how Fluxfire looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="group"
              aria-label="Color theme"
              className="grid gap-2 sm:grid-cols-3"
            >
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ].map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={theme === value ? "default" : "outline"}
                  aria-pressed={theme === value}
                  className="justify-start gap-2"
                  onClick={() => setTheme(value)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              System follows your device appearance and updates automatically.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
