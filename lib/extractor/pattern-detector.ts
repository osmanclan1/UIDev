import fs from 'fs'
import path from 'path'
import { GlassmorphismPattern, GradientPattern, AnimationPattern, LayoutPattern } from './types'

export function detectPatterns(repoPath: string): {
  glassmorphism?: GlassmorphismPattern
  gradients?: GradientPattern
  animations?: AnimationPattern
  layouts?: LayoutPattern
} {
  const patterns: any = {}

  // Find all component files
  const componentDirs = [
    path.join(repoPath, 'components'),
    path.join(repoPath, 'app'),
  ]

  let allContent = ''

  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir)
      for (const file of files) {
        if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx')) {
          try {
            allContent += fs.readFileSync(file, 'utf-8') + '\n'
          } catch (e) {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  // Detect glassmorphism
  if (allContent.includes('backdrop-blur') || allContent.includes('bg-background/')) {
    patterns.glassmorphism = {
      description: "Backdrop blur with semi-transparent backgrounds",
      baseClasses: "bg-background/60 backdrop-blur-xl border border-primary/10",
      variations: {
        light: "bg-background/90 backdrop-blur-xl",
        medium: "bg-background/60 backdrop-blur-xl",
        heavy: "bg-background/40 backdrop-blur-2xl"
      },
      usage: `
<div className="bg-background/60 backdrop-blur-xl border border-primary/10 rounded-lg p-6">
  Content
</div>
      `.trim()
    }
  }

  // Detect gradient text
  if (allContent.includes('bg-clip-text') || allContent.includes('bg-gradient-to-r')) {
    patterns.gradients = {
      description: "Gradient text effects using bg-clip-text",
      baseClasses: "bg-clip-text text-transparent bg-gradient-to-r",
      variations: {
        primary: "from-primary via-primary/70 to-primary",
        subtle: "from-primary/80 to-primary/40",
        rainbow: "from-primary via-accent to-secondary"
      },
      usage: `
<h1 className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary/70 to-primary">
  Gradient Text
</h1>
      `.trim()
    }
  }

  // Detect animations (Framer Motion)
  if (allContent.includes('framer-motion') || allContent.includes('motion.')) {
    const animationExamples: string[] = []
    
    // Extract common animation patterns
    if (allContent.includes('whileInView')) {
      animationExamples.push(`
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ delay: 0.2 }}
>
  Content
</motion.div>
      `.trim())
    }

    if (allContent.includes('animate={{')) {
      animationExamples.push(`
<motion.div
  animate={{ x: [0, 100, 0], scale: [1, 1.2, 1] }}
  transition={{ duration: 2, repeat: Infinity }}
>
  Animated Element
</motion.div>
      `.trim())
    }

    patterns.animations = {
      description: "Framer Motion animations for entrance and interactions",
      implementation: "framer-motion",
      template: `
import { motion } from "framer-motion"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
>
  Content
</motion.div>
      `.trim(),
      examples: animationExamples
    }
  }

  // Detect layout patterns
  patterns.layouts = detectLayoutPatterns(allContent)

  return patterns
}

function detectLayoutPatterns(content: string): LayoutPattern {
  const layouts: LayoutPattern = {}

  // Hero pattern
  if (content.includes('min-h-screen') && content.includes('flex items-center justify-center')) {
    layouts.hero = {
      structure: "full-screen centered with animated background",
      description: "Hero section with full viewport height, centered content, and animated background",
      template: `
<div className="relative min-h-screen flex items-center justify-center overflow-hidden">
  {/* Animated background */}
  <div className="absolute inset-0 overflow-hidden">
    {/* Background elements */}
  </div>
  
  {/* Content */}
  <div className="container relative z-10 px-4">
    {/* Hero content */}
  </div>
  
  {/* Gradient fade */}
  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
</div>
      `.trim()
    }
  }

  // Navbar pattern
  if (content.includes('fixed top') && content.includes('backdrop-blur')) {
    layouts.navbar = {
      structure: "fixed top with glassmorphism",
      description: "Fixed navigation bar with glassmorphic effect",
      template: `
<nav className="fixed top-10 inset-x-0 md:max-w-2xl max-w-sm mx-auto z-50">
  <div className="flex items-center justify-between bg-background/60 backdrop-blur-xl rounded-full border border-primary/10 px-4 py-2">
    {/* Nav content */}
  </div>
</nav>
      `.trim()
    }
  }

  // Grid pattern
  if (content.includes('grid md:grid-cols') || content.includes('grid-cols-')) {
    layouts.featureGrid = {
      structure: "responsive grid with hover effects",
      description: "Responsive grid layout for features or cards",
      template: `
<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
  {items.map((item, index) => (
    <motion.div
      key={index}
      whileHover={{ y: -5 }}
    >
      <Card className="hover:border-primary/20">
        {/* Item content */}
      </Card>
    </motion.div>
  ))}
</div>
      `.trim()
    }
  }

  return layouts
}

function getAllFiles(dir: string): string[] {
  const files: string[] = []
  
  try {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      try {
        const stat = fs.statSync(fullPath)
        if (stat.isDirectory()) {
          files.push(...getAllFiles(fullPath))
        } else {
          files.push(fullPath)
        }
      } catch (e) {
        // Skip files that can't be accessed
      }
    }
  } catch (e) {
    // Skip directories that can't be accessed
  }

  return files
}

