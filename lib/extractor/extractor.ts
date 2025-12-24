import fs from 'fs'
import path from 'path'
import { DesignMemory } from './types'
import { extractCSSVariables, detectColorSystem, extractAnimations } from './css-extractor'
import { extractAllComponents } from './component-extractor'
import { detectPatterns } from './pattern-detector'
import { extractTailwindConfig, extractTypography, extractBorderRadius } from './tailwind-extractor'

export async function extractDesignSystem(repoPath: string): Promise<DesignMemory> {
  const absolutePath = path.resolve(repoPath)
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Repository path does not exist: ${absolutePath}`)
  }

  // Detect framework
  const packageJsonPath = path.join(absolutePath, 'package.json')
  let framework = 'unknown'
  let stylingLibrary = 'unknown'
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    if (packageJson.dependencies?.next || packageJson.dependencies?.['next']) {
      framework = 'nextjs'
    } else if (packageJson.dependencies?.react) {
      framework = 'react'
    }
    
    if (packageJson.dependencies?.['tailwindcss'] || packageJson.devDependencies?.['tailwindcss']) {
      stylingLibrary = 'tailwindcss'
    }
  }

  // Extract CSS variables
  const globalsCSSPath = path.join(absolutePath, 'app', 'globals.css')
  const cssVars = extractCSSVariables(globalsCSSPath)
  const colorSystem = detectColorSystem(cssVars)
  const animations = extractAnimations(globalsCSSPath)

  // Extract Tailwind config
  const tailwindConfig = extractTailwindConfig(absolutePath)
  const typography = extractTypography(tailwindConfig)
  const borderRadius = extractBorderRadius(tailwindConfig)

  // Extract components
  const components = extractAllComponents(absolutePath)

  // Detect patterns
  const patterns = detectPatterns(absolutePath)

  // Extract utilities
  const utilsPath = path.join(absolutePath, 'lib', 'utils.ts')
  let cnFunction: string | undefined
  if (fs.existsSync(utilsPath)) {
    const utilsContent = fs.readFileSync(utilsPath, 'utf-8')
    if (utilsContent.includes('function cn')) {
      cnFunction = utilsContent
    }
  }

  // Build design memory
  const designMemory: DesignMemory = {
    metadata: {
      projectName: path.basename(absolutePath),
      extractedAt: new Date().toISOString(),
      framework,
      stylingLibrary,
      sourcePath: absolutePath
    },
    designTokens: {
      colors: {
        system: colorSystem,
        light: cssVars.light,
        dark: cssVars.dark,
        custom: cssVars.custom
      },
      typography,
      spacing: {
        base: '0.25rem',
        scale: [0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8]
      },
      borderRadius,
      animations: animations ? {
        durations: {
          fast: '0.2s',
          normal: '0.3s',
          slow: '0.5s'
        },
        easings: {
          easeInOut: 'ease-in-out',
          easeOut: 'ease-out',
          easeIn: 'ease-in'
        },
        keyframes: animations
      } : undefined
    },
    components: components.slice(0, 20), // Limit to first 20 components for now
    patterns,
    utilities: {
      cnFunction,
      commonHooks: ['useState', 'useEffect', 'useTheme']
    },
    instructions: {
      setup: [
        "1. Copy design tokens to globals.css",
        "2. Install required dependencies (framer-motion, class-variance-authority, tailwind-merge, clsx)",
        "3. Create lib/utils.ts with cn function",
        "4. Generate components from templates",
        "5. Apply patterns using provided examples"
      ],
      usage: [
        "Always use components from this design system",
        "Apply patterns consistently (glassmorphism, gradients, animations)",
        "Use design tokens for colors, spacing, typography",
        "Follow layout templates for common page structures",
        "Maintain the same visual language across all pages"
      ]
    }
  }

  return designMemory
}

