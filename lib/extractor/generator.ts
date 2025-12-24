import fs from 'fs'
import { DesignMemory } from './types'

export function generateDesignMemoryFile(designMemory: DesignMemory, outputPath: string): void {
  // This is kept for compatibility but we'll generate content directly in API route
  const content = generateTypeScriptFile(designMemory)
  fs.writeFileSync(outputPath, content, 'utf-8')
}

export function generateTypeScriptFile(memory: DesignMemory): string {
  return `// Design Memory File
// Extracted from: ${memory.metadata.sourcePath}
// Generated at: ${memory.metadata.extractedAt}
// Framework: ${memory.metadata.framework}
// Styling: ${memory.metadata.stylingLibrary}

export const DesignMemory = ${JSON.stringify(memory, null, 2)} as const

// Type exports
export type DesignMemoryType = typeof DesignMemory

// Helper function to get component by name
export function getComponent(name: string) {
  return DesignMemory.components.find(c => c.name === name)
}

// Helper function to get pattern
export function getPattern(patternName: keyof typeof DesignMemory.patterns) {
  return DesignMemory.patterns[patternName]
}

// Helper function to get design token
export function getDesignToken(category: keyof typeof DesignMemory.designTokens, key?: string) {
  const tokens = DesignMemory.designTokens[category]
  if (key && typeof tokens === 'object' && key in tokens) {
    return (tokens as any)[key]
  }
  return tokens
}
`
}
