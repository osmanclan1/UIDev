#!/usr/bin/env node

import { extractDesignSystem } from './extractor'
import { generateDesignMemoryFile } from './generator'
import path from 'path'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.error('Usage: design-extractor <repo-path> [output-path]')
    process.exit(1)
  }

  const repoPath = args[0]
  const outputPath = args[1] || path.join(process.cwd(), 'design-memory.ts')

  console.log(`🔍 Extracting design system from: ${repoPath}`)
  console.log(`📝 Output will be written to: ${outputPath}`)

  try {
    const designMemory = await extractDesignSystem(repoPath)
    
    console.log(`✅ Extracted:`)
    console.log(`   - ${designMemory.components.length} components`)
    console.log(`   - ${Object.keys(designMemory.designTokens.colors.light).length} color tokens`)
    console.log(`   - ${Object.keys(designMemory.patterns).length} design patterns`)
    
    generateDesignMemoryFile(designMemory, outputPath)
    
    console.log(`\n🎉 Design system extraction complete!`)
  } catch (error) {
    console.error('❌ Error extracting design system:', error)
    process.exit(1)
  }
}

main()

