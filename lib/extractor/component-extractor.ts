import fs from 'fs'
import path from 'path'
import { ComponentSpec } from './types'

export function findComponentFiles(repoPath: string): string[] {
  const componentDirs = [
    path.join(repoPath, 'components'),
    path.join(repoPath, 'app', 'components'),
    path.join(repoPath, 'src', 'components'),
  ]

  const componentFiles: string[] = []

  for (const dir of componentDirs) {
    if (fs.existsSync(dir)) {
      const files = getAllFiles(dir)
      componentFiles.push(...files.filter(f => 
        f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx')
      ))
    }
  }

  return componentFiles
}

function getAllFiles(dir: string): string[] {
  const files: string[] = []
  const items = fs.readdirSync(dir)

  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath))
    } else {
      files.push(fullPath)
    }
  }

  return files
}

export function extractComponentInfo(filePath: string): ComponentSpec | null {
  const content = fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, path.extname(filePath))
  
  // Extract component name
  const componentNameMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+)|export\s+default\s+function\s+(\w+)|const\s+(\w+)\s*=\s*(?:React\.)?forwardRef)/)
  const componentName = componentNameMatch 
    ? (componentNameMatch[1] || componentNameMatch[2] || componentNameMatch[3] || fileName)
    : fileName

  // Check if it's a UI component (usually in ui/ folder or has variants)
  const isUIComponent = filePath.includes('/ui/') || 
                       content.includes('cva(') || 
                       content.includes('variant') ||
                       content.includes('Variants')

  if (!isUIComponent && !filePath.includes('/ui/')) {
    // Still extract if it's a significant component
    if (!content.includes('export') || content.length < 200) {
      return null
    }
  }

  // Extract variants (CVA pattern)
  const variants: Record<string, Record<string, string>> = {}
  const cvaMatch = content.match(/cva\s*\([^)]+\)\s*,\s*\{([^}]+variants[^}]+)\}/)
  if (cvaMatch) {
    const variantsContent = cvaMatch[1]
    const variantMatches = variantsContent.matchAll(/(\w+):\s*\{([^}]+)\}/g)
    for (const match of variantMatches) {
      const variantName = match[1]
      const variantContent = match[2]
      const optionMatches = variantContent.matchAll(/(\w+):\s*"([^"]+)"/g)
      variants[variantName] = {}
      for (const optMatch of optionMatches) {
        variants[variantName][optMatch[1]] = optMatch[2]
      }
    }
  }

  // Extract base classes
  const baseClassesMatch = content.match(/cva\s*\(\s*"([^"]+)"/)
  const baseClasses = baseClassesMatch ? baseClassesMatch[1] : undefined

  // Extract props interface
  const props: Record<string, string> = {}
  const propsMatch = content.match(/interface\s+\w+Props[^{]*\{([^}]+)\}/s)
  if (propsMatch) {
    const propsContent = propsMatch[1]
    const propMatches = propsContent.matchAll(/(\w+)(\??):\s*([^;]+);/g)
    for (const propMatch of propMatches) {
      props[propMatch[1]] = propMatch[3].trim()
    }
  }

  // Determine component type
  let componentType: 'interactive' | 'layout' | 'display' | 'form' = 'display'
  if (content.includes('onClick') || content.includes('Button') || content.includes('button')) {
    componentType = 'interactive'
  } else if (content.includes('Card') || content.includes('Container') || content.includes('div')) {
    componentType = 'layout'
  } else if (content.includes('Input') || content.includes('input') || content.includes('Form')) {
    componentType = 'form'
  }

  // Extract sub-components (for compound components)
  const subComponents: string[] = []
  const subComponentMatches = content.matchAll(/(?:const|export\s+const)\s+(\w+)\s*=/g)
  for (const match of subComponentMatches) {
    const subName = match[1]
    if (subName.includes(componentName) && subName !== componentName) {
      subComponents.push(subName)
    }
  }

  return {
    name: componentName,
    type: componentType,
    filePath: filePath,
    variants: Object.keys(variants).length > 0 ? variants : undefined,
    baseClasses,
    props: Object.keys(props).length > 0 ? props : undefined,
    template: content,
    subComponents: subComponents.length > 0 ? subComponents : undefined
  }
}

export function extractAllComponents(repoPath: string): ComponentSpec[] {
  const componentFiles = findComponentFiles(repoPath)
  const components: ComponentSpec[] = []

  for (const file of componentFiles) {
    try {
      const component = extractComponentInfo(file)
      if (component) {
        components.push(component)
      }
    } catch (error) {
      console.warn(`Failed to extract component from ${file}:`, error)
    }
  }

  return components
}

