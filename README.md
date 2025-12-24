# Design System Extractor Web

A web application that extracts design systems from GitHub repositories and generates reusable design memory files.

## Features

- 🔍 Extract design systems from any GitHub repository
- 🎨 Capture design tokens (colors, typography, spacing)
- 🧩 Extract reusable components
- 📐 Detect design patterns (glassmorphism, gradients, animations)
- 📥 Download design memory files for reuse

## How It Works

1. Enter a GitHub repository URL
2. The app clones/downloads the repository
3. Extracts design tokens, components, and patterns
4. Generates a `design-memory.ts` file
5. Download the file for use in other projects

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will automatically detect Next.js and deploy

The app is configured with:
- 60 second timeout for API routes (handles large repositories)
- Automatic git clone or zip download fallback

## API Endpoint

### POST `/api/extract`

Extracts design system from a GitHub repository.

**Request:**
```json
{
  "repoUrl": "https://github.com/owner/repo.git"
}
```

**Response:**
```json
{
  "success": true,
  "designMemory": "// Design Memory File...",
  "metadata": {
    "components": 20,
    "colorTokens": 28,
    "patterns": 4
  }
}
```

## Notes

- The extraction process may take 30-60 seconds for large repositories
- Private repositories require authentication (not currently supported)
- The app uses temporary directories that are cleaned up after extraction
