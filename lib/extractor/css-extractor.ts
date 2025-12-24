import fs from 'fs'
import path from 'path'

export interface CSSVariables {
  light: Record<string, string>
  dark: Record<string, string>
  custom?: Record<string, Record<string, string>>
}

export function extractCSSVariables(cssPath: string): CSSVariables {
  if (!fs.existsSync(cssPath)) {
    return { light: {}, dark: {}, custom: {} }
  }

  const content = fs.readFileSync(cssPath, 'utf-8')
  const variables: CSSVariables = { light: {}, dark: {}, custom: {} }

  // Extract :root variables (light theme)
  const rootMatch = content.match(/:root\s*\{([^}]+)\}/s)
  if (rootMatch) {
    const rootContent = rootMatch[1]
    const varMatches = rootContent.matchAll(/--([^:]+):\s*([^;]+);/g)
    for (const match of varMatches) {
      const key = match[1].trim()
      const value = match[2].trim()
      variables.light[key] = value
    }
  }

  // Extract .dark variables
  const darkMatch = content.match(/\.dark\s*\{([^}]+)\}/s)
  if (darkMatch) {
    const darkContent = darkMatch[1]
    const varMatches = darkContent.matchAll(/--([^:]+):\s*([^;]+);/g)
    for (const match of varMatches) {
      const key = match[1].trim()
      const value = match[2].trim()
      variables.dark[key] = value
    }
  }

  // Extract custom theme classes (zinc, violet, rose, berry, etc.)
  const customThemeMatches = content.matchAll(/\.(\w+)\s*\{([^}]+)\}/g)
  for (const match of customThemeMatches) {
    const themeName = match[1]
    if (themeName !== 'dark' && themeName !== 'root') {
      if (!variables.custom) variables.custom = {}
      if (!variables.custom[themeName]) variables.custom[themeName] = {}
      
      const themeContent = match[2]
      const varMatches = themeContent.matchAll(/--([^:]+):\s*([^;]+);/g)
      for (const varMatch of varMatches) {
        const key = varMatch[1].trim()
        const value = varMatch[2].trim()
        variables.custom[themeName][key] = value
      }
    }
  }

  return variables
}

export function detectColorSystem(variables: CSSVariables): 'hsl' | 'rgb' | 'hex' {
  // Check if values are HSL format (e.g., "24 0% 95%")
  const sampleValue = Object.values(variables.light)[0] || ''
  if (/^\d+\s+\d+%\s+\d+%$/.test(sampleValue)) {
    return 'hsl'
  }
  if (sampleValue.startsWith('rgb') || sampleValue.startsWith('rgba')) {
    return 'rgb'
  }
  if (sampleValue.startsWith('#')) {
    return 'hex'
  }
  return 'hsl' // default
}

export function extractAnimations(cssPath: string): Record<string, any> {
  if (!fs.existsSync(cssPath)) {
    return {}
  }

  const content = fs.readFileSync(cssPath, 'utf-8')
  const animations: Record<string, any> = {}

  // Extract @keyframes
  const keyframeMatches = content.matchAll(/@keyframes\s+(\w+)\s*\{([^}]+)\}/gs)
  for (const match of keyframeMatches) {
    const name = match[1]
    const keyframeContent = match[2]
    animations[name] = {
      name,
      keyframes: keyframeContent
    }
  }

  return animations
}

