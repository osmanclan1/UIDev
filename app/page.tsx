"use client"

import { useState } from "react"
import { Download, Loader2, Github, CheckCircle2 } from "lucide-react"

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [designMemory, setDesignMemory] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)

  const handleExtract = async () => {
    if (!repoUrl.trim()) {
      setError("Please enter a repository URL")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)
    setDesignMemory(null)
    setMetadata(null)

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract design system")
      }

      setDesignMemory(data.designMemory)
      setMetadata(data.metadata)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Design System Extractor
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Extract design systems from any GitHub repository into a reusable design memory file
            </p>
          </div>

          {/* Input Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  GitHub Repository URL
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="repo-url"
                      type="text"
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="https://github.com/username/repo.git"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleExtract}
                    disabled={loading || !repoUrl.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      "Extract"
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {success && metadata && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                      Design system extracted successfully!
                    </p>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 space-y-1">
                    <p>• {metadata.components} components extracted</p>
                    <p>• {metadata.colorTokens} color tokens found</p>
                    <p>• {metadata.patterns} design patterns detected</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download Section */}
          {success && designMemory && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Design Memory File
                </h2>
                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  File ready: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">design-memory.ts</code>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  This file contains all design tokens, components, and patterns extracted from the repository.
                </p>
              </div>
            </div>
          )}

          {/* Info Section */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              This tool extracts design systems from codebases and generates a reusable design memory file
              that can be used to maintain consistent UI across projects.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
