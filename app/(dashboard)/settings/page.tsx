"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Fluxfire preferences
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
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
