import fs from 'fs'
import path from 'path'

export interface TailwindConfig {
  theme?: {
    extend?: {
      colors?: Record<string, any>
      fontFamily?: Record<string, string[]>
      borderRadius?: Record<string, string>
      animation?: Record<string, string>
      keyframes?: Record<string, any>
    }
  }
  darkMode?: string | string[]
}

export function extractTailwindConfig(repoPath: string): TailwindConfig | null {
  const configPaths = [
    path.join(repoPath, 'tailwind.config.js'),
    path.join(repoPath, 'tailwind.config.ts'),
    path.join(repoPath, 'tailwind.config.mjs'),
  ]

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        // Read and parse manually (works in serverless environments)
        const content = fs.readFileSync(configPath, 'utf-8')
        return parseTailwindConfig(content)
      } catch (error) {
        console.warn(`Failed to load tailwind config from ${configPath}:`, error)
      }
    }
  }

  return null
}

function parseTailwindConfig(content: string): TailwindConfig {
  // Simple parsing - extract key information
  const config: TailwindConfig = { theme: { extend: {} } }

  // Extract font families
  const fontFamilyMatch = content.match(/fontFamily:\s*\{([^}]+)\}/s)
  if (fontFamilyMatch) {
    config.theme!.extend!.fontFamily = {}
    const fontMatches = fontFamilyMatch[1].matchAll(/(\w+):\s*\[([^\]]+)\]/g)
    for (const match of fontMatches) {
      const fonts = match[2].split(',').map(f => f.trim().replace(/['"]/g, ''))
      config.theme!.extend!.fontFamily![match[1]] = fonts
    }
  }

  // Extract border radius
  const borderRadiusMatch = content.match(/borderRadius:\s*\{([^}]+)\}/s)
  if (borderRadiusMatch) {
    config.theme!.extend!.borderRadius = {}
    const radiusMatches = borderRadiusMatch[1].matchAll(/(\w+):\s*([^,}]+)/g)
    for (const match of radiusMatches) {
      config.theme!.extend!.borderRadius![match[1]] = match[2].trim().replace(/['"]/g, '')
    }
  }

  // Extract animations
  const animationMatch = content.match(/animation:\s*\{([^}]+)\}/s)
  if (animationMatch) {
    config.theme!.extend!.animation = {}
    const animMatches = animationMatch[1].matchAll(/(\w+):\s*([^,}]+)/g)
    for (const match of animMatches) {
      config.theme!.extend!.animation![match[1]] = match[2].trim().replace(/['"]/g, '')
    }
  }

  return config
}

export function extractTypography(config: TailwindConfig | null): {
  fontFamilies: Record<string, string[]>
  scales: Record<string, string>
} {
  const fontFamilies: Record<string, string[]> = {
    sans: ['system-ui', 'sans-serif']
  }

  if (config?.theme?.extend?.fontFamily) {
    Object.assign(fontFamilies, config.theme.extend.fontFamily)
  }

  // Common typography scales
  const scales: Record<string, string> = {
    h1: "text-6xl md:text-8xl font-bold tracking-tight",
    h2: "text-4xl font-bold",
    h3: "text-2xl font-semibold",
    body: "text-base",
    small: "text-sm",
    muted: "text-sm text-muted-foreground"
  }

  return { fontFamilies, scales }
}

export function extractBorderRadius(config: TailwindConfig | null): {
  base: string
  lg: string
  md: string
  sm: string
} {
  const defaultRadius = "0.75rem"
  
  if (config?.theme?.extend?.borderRadius) {
    return {
      base: config.theme.extend.borderRadius.lg || defaultRadius,
      lg: config.theme.extend.borderRadius.lg || `var(--radius)`,
      md: config.theme.extend.borderRadius.md || `calc(var(--radius) - 2px)`,
      sm: config.theme.extend.borderRadius.sm || `calc(var(--radius) - 4px)`
    }
  }

  return {
    base: defaultRadius,
    lg: `var(--radius)`,
    md: `calc(var(--radius) - 2px)`,
    sm: `calc(var(--radius) - 4px)`
  }
}

