"use client"

import { useState } from "react"
import { Download, Loader2, Github, CheckCircle2, Upload } from "lucide-react"

export default function Home() {
  const [inputMethod, setInputMethod] = useState<"url" | "file">("url")
  const [repoUrl, setRepoUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [designMemory, setDesignMemory] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<any>(null)

  const handleExtract = async () => {
    if (inputMethod === "url" && !repoUrl.trim()) {
      setError("Please enter a repository URL")
      return
    }

    if (inputMethod === "file" && !selectedFile) {
      setError("Please select a zip file")
      return
    }

    setLoading(true)
    setError("")
    setSuccess(false)
    setDesignMemory(null)
    setMetadata(null)

    try {
      let response: Response
      
      if (inputMethod === "file" && selectedFile) {
        // Upload file
        const formData = new FormData()
        formData.append("file", selectedFile)
        
        response = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        })
      } else {
        // Use URL
        response = await fetch("/api/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ repoUrl: repoUrl.trim() }),
        })
      }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check if it's a zip file
      if (!file.name.endsWith('.zip') && !file.type.includes('zip')) {
        setError("Please select a zip file")
        return
      }
      setSelectedFile(file)
      setError("")
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
              {/* Method Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setInputMethod("url")
                    setError("")
                    setSelectedFile(null)
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMethod === "url"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  <Github className="w-4 h-4 inline mr-2" />
                  GitHub URL
                </button>
                <button
                  onClick={() => {
                    setInputMethod("file")
                    setError("")
                    setRepoUrl("")
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    inputMethod === "file"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  Upload Zip File
                </button>
              </div>

              {/* URL Input */}
              {inputMethod === "url" && (
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
              )}

              {/* File Upload */}
              {inputMethod === "file" && (
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Repository Zip File
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ZIP file only</p>
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".zip,application/zip"
                          onChange={handleFileChange}
                          disabled={loading}
                        />
                      </label>
                      {selectedFile && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Selected: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleExtract}
                      disabled={loading || !selectedFile}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-start"
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
              )}

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
