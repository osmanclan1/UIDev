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
    const contentType = request.headers.get('content-type') || ''
    
    // Check if it's a file upload (multipart/form-data) or JSON
    let repoUrl: string | null = null
    let uploadedFile: File | null = null
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      uploadedFile = formData.get('file') as File | null
      
      if (!uploadedFile) {
        return NextResponse.json(
          { error: 'No file uploaded' },
          { status: 400 }
        )
      }
    } else {
      const body = await request.json()
      repoUrl = body.repoUrl
      
      if (!repoUrl || typeof repoUrl !== 'string') {
        return NextResponse.json(
          { error: 'Repository URL is required' },
          { status: 400 }
        )
      }
    }

    // Create temporary directory
    tempDir = path.join(os.tmpdir(), `design-extract-${Date.now()}-${Math.random().toString(36).substring(7)}`)
    fs.mkdirSync(tempDir, { recursive: true })
    
    if (!tempDir) {
      throw new Error('Failed to create temporary directory')
    }

    try {
      // Handle file upload
      if (uploadedFile) {
        // Save uploaded file to temp directory
        const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer())
        const zipPath = path.join(tempDir, 'uploaded.zip')
        fs.writeFileSync(zipPath, fileBuffer)
        
        // Extract the zip file
        const zip = new AdmZip(zipPath)
        zip.extractAllTo(tempDir, true)
        
        // Remove the zip file
        fs.unlinkSync(zipPath)
        
        // Move contents from subdirectory to tempDir root (GitHub zips have a subdirectory)
        const extractedDirs = fs.readdirSync(tempDir).filter(item => {
          const fullPath = path.join(tempDir, item)
          return fs.statSync(fullPath).isDirectory()
        })
        
        if (extractedDirs.length === 1) {
          const extractedPath = path.join(tempDir, extractedDirs[0])
          const files = fs.readdirSync(extractedPath)
          files.forEach(file => {
            fs.renameSync(
              path.join(extractedPath, file),
              path.join(tempDir, file)
            )
          })
          fs.rmSync(extractedPath, { recursive: true, force: true })
        }
      } else if (repoUrl) {
        // Handle GitHub URL
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

          // Try downloading zip using GitHub API archive endpoint (more reliable)
          // Remove duplicates from branch list
          const branchesToTry = Array.from(new Set([defaultBranch, 'main', 'master']))
          let downloaded = false
          const errors: string[] = []
          
          for (const branch of branchesToTry) {
            // Try multiple URL formats (prioritize direct URLs that work reliably)
            const urlFormats = [
              `https://github.com/${owner}/${repo}/archive/${branch}.zip`, // Direct URL - most reliable for public repos
              `https://api.github.com/repos/${owner}/${repo}/zipball/${branch}`, // GitHub API endpoint (returns 302 redirect)
              `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`, // Alternative direct URL format
            ]
            
            let branchDownloaded = false
            
            for (const zipUrl of urlFormats) {
              try {
                const response = await fetch(zipUrl, {
                  redirect: 'follow', // Explicitly follow redirects
                  headers: {
                    'Accept': 'application/vnd.github.v3+json, application/zip, application/octet-stream, */*',
                    'User-Agent': 'DesignExtractor/1.0',
                    ...(process.env.GITHUB_TOKEN && { 'Authorization': `token ${process.env.GITHUB_TOKEN}` })
                  }
                })
                
                const contentType = response.headers.get('content-type') || ''
                const status = response.status
                const statusText = response.statusText
                
                console.log(`Attempting branch ${branch} with ${zipUrl}: Status ${status} ${statusText}, Content-Type: ${contentType}`)
                
                if (!response.ok) {
                  const errorText = await response.text().catch(() => 'Could not read error response')
                  errors.push(`Branch ${branch} (${zipUrl}): ${status} ${statusText} - ${errorText.substring(0, 200)}`)
                  continue // Try next URL format
                }
              
                // Download the file
                const arrayBuffer = await response.arrayBuffer()
                
                if (arrayBuffer.byteLength === 0) {
                  errors.push(`Branch ${branch} (${zipUrl}): Downloaded file is empty`)
                  continue // Try next URL format
                }
                
                // Check if it's actually a zip file by checking the signature
                const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4))
                const isZipFile = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B // PK (ZIP file signature)
                
                if (!isZipFile) {
                  const preview = Buffer.from(arrayBuffer.slice(0, 500)).toString('utf-8')
                  errors.push(`Branch ${branch} (${zipUrl}): Response is not a zip file. Content-Type: ${contentType}, Preview: ${preview.substring(0, 200)}`)
                  continue // Try next URL format
                }
                
                // Extract the zip
                const zip = new AdmZip(Buffer.from(arrayBuffer))
                zip.extractAllTo(tempDir, true)
                downloaded = true
                branchDownloaded = true
                console.log(`Successfully downloaded and extracted branch ${branch} using ${zipUrl}`)
                break // Success! Exit URL formats loop
              } catch (urlError: any) {
                const errorMsg = urlError.message || String(urlError)
                errors.push(`Branch ${branch} (${zipUrl}): ${errorMsg}`)
                console.warn(`Failed to download from ${zipUrl}:`, urlError)
                continue // Try next URL format
              }
            }
            
            if (branchDownloaded) {
              break // Success! Exit branches loop
            }
          }
          
          if (!downloaded) {
            const errorDetails = errors.join('; ')
            throw new Error(`Failed to download repository. Tried branches: ${branchesToTry.join(', ')}. Details: ${errorDetails}`)
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
        } // Close catch block
      } // Close else if block

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

