"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Clock, 
  Download,
  ArrowLeft,
  FileCode,
  GitBranch,
  Github,
  Package,
  Sparkles
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"

interface ProcessStep {
  step: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  message: string
  timestamp: number
}

function ProcessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([])
  const [designMemory, setDesignMemory] = useState<string | null>(null)
  const [designMemoryData, setDesignMemoryData] = useState<any>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceInfo, setSourceInfo] = useState<{ type: 'url' | 'file', value: string } | null>(null)

  useEffect(() => {
    const storageKey = searchParams.get('key')
    console.log('Process page loaded with key:', storageKey)

    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey)
        console.log('Stored data found:', !!stored)
        
        if (stored) {
          const data = JSON.parse(stored)
          console.log('Parsed data:', {
            steps: data.processSteps?.length,
            hasMemory: !!data.designMemory,
            metadata: data.metadata
          })
          
          setProcessSteps(data.processSteps || [])
          setDesignMemory(data.designMemory || null)
          setMetadata(data.metadata || null)
          
          // Use parsed design memory data if available, otherwise try to parse from string
          if (data.designMemoryData) {
            console.log('Using designMemoryData from API:', data.designMemoryData)
            setDesignMemoryData(data.designMemoryData)
          } else if (data.designMemory) {
            try {
              // Extract the JSON from the design memory string
              const jsonMatch = data.designMemory.match(/export const DesignMemory = (.+?) as const/s)
              if (jsonMatch) {
                const memoryData = JSON.parse(jsonMatch[1])
                setDesignMemoryData(memoryData)
                console.log('Parsed design memory from string:', memoryData)
              } else {
                console.warn('Could not extract JSON from design memory string')
                // Try alternative pattern
                const altMatch = data.designMemory.match(/DesignMemory = (.+?);/s)
                if (altMatch) {
                  const memoryData = JSON.parse(altMatch[1])
                  setDesignMemoryData(memoryData)
                  console.log('Parsed design memory with alternative pattern')
                }
              }
            } catch (e) {
              console.error('Failed to parse design memory:', e)
            }
          } else {
            console.warn('No design memory data available')
          }
          
          // Extract source info from process steps
          const urlStep = data.processSteps?.find((s: ProcessStep) => s.step === 'url_validation')
          const fileStep = data.processSteps?.find((s: ProcessStep) => s.step === 'file_upload')
          if (urlStep) {
            const match = urlStep.message.match(/Repository URL validated: (.+)/)
            if (match) {
              setSourceInfo({ type: 'url', value: match[1] })
            }
          } else if (fileStep) {
            const match = fileStep.message.match(/File received: (.+)/)
            if (match) {
              setSourceInfo({ type: 'file', value: match[1] })
            }
          }
          // Don't remove immediately - let user see it
        } else {
          setError('No extraction data found. Please run an extraction first.')
          console.error('No data found in sessionStorage for key:', storageKey)
        }
      } catch (e) {
        console.error('Failed to parse stored data:', e)
        setError('Failed to load extraction data. Please try again.')
      }
    } else {
      setError('No extraction key provided. Please run an extraction first.')
    }
    setLoading(false)
  }, [searchParams, router])

  const getStepIcon = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStepColor = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50 dark:bg-green-950/20'
      case 'failed':
        return 'border-red-500 bg-red-50 dark:bg-red-950/20'
      case 'in_progress':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
      default:
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900'
    }
  }

  const getStepName = (step: string) => {
    const stepNames: Record<string, string> = {
      'file_upload': 'File Upload',
      'url_validation': 'URL Validation',
      'temp_directory': 'Create Temp Directory',
      'git_clone': 'Git Clone',
      'fetch_branch': 'Fetch Branch Info',
      'download_repo': 'Download Repository',
      'extract_zip': 'Extract Zip File',
      'extract_design': 'Extract Design System',
      'generate_file': 'Generate Memory File',
      'cleanup': 'Cleanup',
      'error': 'Error'
    }
    return stepNames[step] || step.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleDownload = () => {
    if (!designMemory) return

    const blob = new Blob([designMemory], { type: "text/typescript" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "design-memory.ts"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading extraction data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-card border border-destructive/20 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium transition-all hover:bg-primary/90"
            >
              Go Back Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ModeToggle />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/70 to-primary">
              Extraction Process
            </h1>
          </div>
          <p className="text-muted-foreground">
            Detailed breakdown of the design system extraction process
          </p>
        </div>

        {/* Deep Analysis Summary */}
        {(sourceInfo || metadata || designMemoryData) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-lg p-6 mb-8 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Deep Analysis Report
            </h2>
            {!designMemoryData && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ Detailed analysis data not available. Showing basic information.
                </p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Source Information */}
              {sourceInfo && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Source Analyzed</h3>
                  <div className="bg-muted/30 rounded-lg p-3">
                    {sourceInfo.type === 'url' ? (
                      <div className="flex items-center gap-2">
                        <Github className="w-4 h-4 text-primary" />
                        <code className="bg-background px-2 py-1 rounded text-sm font-mono">{sourceInfo.value}</code>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-primary" />
                        <span className="text-sm font-mono">{sourceInfo.value}</span>
                      </div>
                    )}
                    {designMemoryData?.metadata && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-1">
                        <p>Framework: <span className="font-semibold text-foreground">{designMemoryData.metadata.framework}</span></p>
                        <p>Styling Library: <span className="font-semibold text-foreground">{designMemoryData.metadata.stylingLibrary}</span></p>
                        <p>Project: <span className="font-semibold text-foreground">{designMemoryData.metadata.projectName}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* What Was Searched */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">What Was Searched</h3>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground mb-1">📁 File Types Analyzed:</p>
                      <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>Component files (.tsx, .jsx, .vue)</li>
                        <li>CSS/SCSS files (.css, .scss, globals.css)</li>
                        <li>Configuration files (tailwind.config.*, package.json)</li>
                        <li>Utility files (lib/utils.ts, helpers)</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-foreground mb-1">🔍 Extraction Targets:</p>
                      <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
                        <li>React/Vue component definitions</li>
                        <li>CSS custom properties & variables</li>
                        <li>Tailwind theme configuration</li>
                        <li>Design patterns in code</li>
                        <li>Animation keyframes & transitions</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* What Was Found - Detailed */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">What Was Found (Detailed)</h3>
                
                {/* Components */}
                {designMemoryData?.components && designMemoryData.components.length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileCode className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Components ({designMemoryData.components.length})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {designMemoryData.components.slice(0, 10).map((comp: any, idx: number) => (
                        <div key={idx} className="bg-background/50 rounded p-2 text-xs">
                          <p className="font-medium text-foreground">{comp.name}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {comp.type} • {comp.filePath?.split('/').pop() || 'Unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                    {designMemoryData.components.length > 10 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        +{designMemoryData.components.length - 10} more components
                      </p>
                    )}
                  </div>
                ) : metadata?.components > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileCode className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Components ({metadata.components})</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Component details not available. Run extraction again to see full details.
                    </p>
                  </div>
                )}

                {/* Design Tokens */}
                {designMemoryData?.designTokens ? (
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Design Tokens</span>
                    </div>
                    <div className="space-y-3">
                      {/* Colors */}
                      {designMemoryData.designTokens.colors && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">
                            Colors ({Object.keys(designMemoryData.designTokens.colors.light || {}).length} tokens)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(designMemoryData.designTokens.colors.light || {}).slice(0, 12).map(([key, value]: [string, any]) => (
                              <div key={key} className="flex items-center gap-1.5 bg-background/50 rounded px-2 py-1">
                                <div 
                                  className="w-3 h-3 rounded border border-border"
                                  style={{ backgroundColor: typeof value === 'string' ? value : `hsl(${value})` }}
                                />
                                <span className="text-xs font-mono text-foreground">{key}</span>
                              </div>
                            ))}
                            {Object.keys(designMemoryData.designTokens.colors.light || {}).length > 12 && (
                              <span className="text-xs text-muted-foreground self-center">
                                +{Object.keys(designMemoryData.designTokens.colors.light || {}).length - 12} more
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Color System: <span className="font-semibold">{designMemoryData.designTokens.colors.system?.toUpperCase() || 'HSL'}</span>
                          </p>
                        </div>
                      )}

                      {/* Typography */}
                      {designMemoryData.designTokens.typography && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">
                            Typography ({Object.keys(designMemoryData.designTokens.typography.fontFamilies || {}).length} font families)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(designMemoryData.designTokens.typography.fontFamilies || {}).map(([key, value]: [string, any]) => (
                              <div key={key} className="bg-background/50 rounded px-2 py-1">
                                <span className="text-xs font-mono text-foreground">{key}</span>
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({Array.isArray(value) ? value.join(', ') : value})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Border Radius */}
                      {designMemoryData.designTokens.borderRadius && (
                        <div>
                          <p className="text-xs font-medium text-foreground mb-2">Border Radius</p>
                          <div className="flex gap-2">
                            {Object.entries(designMemoryData.designTokens.borderRadius).map(([key, value]: [string, any]) => (
                              <div key={key} className="bg-background/50 rounded px-2 py-1">
                                <span className="text-xs text-foreground">{key}: <span className="font-mono">{value}</span></span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : metadata?.colorTokens > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Design Tokens ({metadata.colorTokens} colors)</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Design token details not available. Run extraction again to see full details.
                    </p>
                  </div>
                )}

                {/* Patterns */}
                {designMemoryData?.patterns && Object.keys(designMemoryData.patterns).length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">
                        Design Patterns ({Object.keys(designMemoryData.patterns).length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(designMemoryData.patterns).map(([key, pattern]: [string, any]) => (
                        <div key={key} className="bg-background/50 rounded p-2">
                          <p className="text-xs font-medium text-foreground capitalize mb-1">{key.replace(/_/g, ' ')}</p>
                          {pattern.description && (
                            <p className="text-xs text-muted-foreground">{pattern.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : metadata?.patterns > 0 && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-foreground">Design Patterns ({metadata.patterns})</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pattern details not available. Run extraction again to see full details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Process Steps */}
        <div className="space-y-4 mb-8">
          <AnimatePresence>
            {processSteps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border-2 rounded-lg p-4 transition-all ${getStepColor(step.status)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {getStepIcon(step.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">
                        {getStepName(step.step)}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.message}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Results */}
        {designMemory && metadata && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border rounded-lg p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Extraction Complete!</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Components</span>
                </div>
                <p className="text-3xl font-bold text-primary">{metadata.components}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Color Tokens</span>
                </div>
                <p className="text-3xl font-bold text-primary">{metadata.colorTokens}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Patterns</span>
                </div>
                <p className="text-3xl font-bold text-primary">{metadata.patterns}</p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Design Memory File
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default function ProcessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <ProcessContent />
    </Suspense>
  )
}

