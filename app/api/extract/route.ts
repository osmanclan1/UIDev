import { NextRequest, NextResponse } from 'next/server'
import { extractDesignSystem } from '@/lib/extractor/extractor'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'
import AdmZip from 'adm-zip'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  let tempDir: string | null = null

  try {
    const { repoUrl } = await request.json()

    if (!repoUrl || typeof repoUrl !== 'string') {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      )
    }

    // Validate GitHub URL and extract owner/repo
    const githubRegex = /^https:\/\/github\.com\/([\w\-\.]+)\/([\w\-\.]+)(?:\.git)?$/
    const match = repoUrl.match(githubRegex)
    
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL. Format: https://github.com/owner/repo' },
        { status: 400 }
      )
    }

    const [, owner, repo] = match

    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `design-extract-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    fs.mkdirSync(tempDir, { recursive: true })
    
    if (!tempDir) {
      throw new Error('Failed to create temporary directory')
    }

    try {
      // Try git clone first (will fail on Vercel, but that's okay)
      try {
        await execAsync(`git clone --depth 1 ${repoUrl} ${tempDir}`, {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024
        })
      } catch (gitError: any) {
        // Fallback: Get default branch from GitHub API, then download zip
        let defaultBranch = 'main'
        
        try {
          // Get repository info to find default branch
          const repoInfoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
            }
          })
          
          if (repoInfoResponse.ok) {
            const repoInfo = await repoInfoResponse.json()
            defaultBranch = repoInfo.default_branch || 'main'
          }
        } catch (apiError) {
          console.warn('Could not fetch default branch, using "main" as fallback')
        }

        // Try downloading zip with correct format (simpler URL)
        const branchesToTry = [defaultBranch, 'main', 'master']
        let downloaded = false
        
        for (const branch of branchesToTry) {
          try {
            // Use simpler URL format: /archive/{branch}.zip (not /refs/heads/)
            const zipUrl = `https://github.com/${owner}/${repo}/archive/${branch}.zip`
            
            const response = await fetch(zipUrl, {
              redirect: 'follow', // Explicitly follow redirects
              headers: {
                'Accept': 'application/zip',
                ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
              }
            })
            
            if (response.ok && response.headers.get('content-type')?.includes('zip')) {
              const arrayBuffer = await response.arrayBuffer()
              const zip = new AdmZip(Buffer.from(arrayBuffer))
              zip.extractAllTo(tempDir, true)
              downloaded = true
              break
            }
          } catch (branchError) {
            console.warn(`Failed to download branch ${branch}:`, branchError)
            continue
          }
        }
        
        if (!downloaded) {
          throw new Error(`Failed to download repository. Tried branches: ${branchesToTry.join(', ')}`)
        }
        
        // Move contents from subdirectory to tempDir root
        const currentTempDir = tempDir
        if (!currentTempDir) throw new Error('Temp directory not created')
        
        const extractedDir = fs.readdirSync(currentTempDir).find(item => {
          const fullPath = path.join(currentTempDir, item)
          return fs.statSync(fullPath).isDirectory() && item.includes(repo)
        })
        
        if (extractedDir) {
          const extractedPath = path.join(currentTempDir, extractedDir)
          const files = fs.readdirSync(extractedPath)
          files.forEach(file => {
            fs.renameSync(
              path.join(extractedPath, file),
              path.join(currentTempDir, file)
            )
          })
          fs.rmSync(extractedPath, { recursive: true, force: true })
        }
      }

      // Extract design system
      const designMemory = await extractDesignSystem(tempDir)

      // Generate design memory file content
      const fileContent = generateDesignMemoryFileContent(designMemory)

      // Clean up temp directory
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }

      return NextResponse.json({
        success: true,
        designMemory: fileContent,
        metadata: {
          components: designMemory.components.length,
          colorTokens: Object.keys(designMemory.designTokens.colors.light).length,
          patterns: Object.keys(designMemory.patterns).length
        }
      })
    } catch (error: any) {
      // Clean up on error
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
      throw error
    }
  } catch (error: any) {
    console.error('Extraction error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to extract design system' },
      { status: 500 }
    )
  }
}

function generateDesignMemoryFileContent(memory: any): string {
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

