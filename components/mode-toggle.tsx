"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm border border-border hover:bg-accent transition-colors shadow-sm">
          <Sun className="h-5 w-5 text-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-card/80 backdrop-blur-sm border border-border hover:bg-accent transition-colors shadow-sm"
        aria-label="Toggle theme"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
        <Moon className="h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground absolute" />
      </button>
    </div>
  )
}

