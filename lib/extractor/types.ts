export interface DesignMemory {
  metadata: {
    projectName: string
    extractedAt: string
    framework: string
    stylingLibrary: string
    sourcePath: string
  }
  
  designTokens: {
    colors: ColorSystem
    typography: TypographySystem
    spacing: SpacingSystem
    borderRadius: BorderRadiusSystem
    shadows?: ShadowSystem
    animations?: AnimationSystem
  }
  
  components: ComponentSpec[]
  
  patterns: {
    glassmorphism?: GlassmorphismPattern
    gradients?: GradientPattern
    animations?: AnimationPattern
    layouts?: LayoutPattern
  }
  
  utilities: {
    cnFunction?: string
    commonHooks?: string[]
  }
  
  instructions: {
    setup: string[]
    usage: string[]
  }
}

export interface ColorSystem {
  system: 'hsl' | 'rgb' | 'hex'
  light: Record<string, string>
  dark: Record<string, string>
  custom?: Record<string, Record<string, string>>
}

export interface TypographySystem {
  fontFamilies: Record<string, string[]>
  scales: Record<string, string>
}

export interface SpacingSystem {
  base: string
  scale: number[]
}

export interface BorderRadiusSystem {
  base: string
  lg: string
  md: string
  sm: string
}

export interface ShadowSystem {
  sm: string
  md: string
  lg: string
}

export interface AnimationSystem {
  durations: Record<string, string>
  easings: Record<string, string>
  keyframes?: Record<string, any>
}

export interface ComponentSpec {
  name: string
  type: 'interactive' | 'layout' | 'display' | 'form'
  filePath: string
  variants?: {
    [key: string]: Record<string, string>
  }
  baseClasses?: string
  props?: Record<string, string>
  template: string
  usageExample?: string
  subComponents?: string[]
}

export interface GlassmorphismPattern {
  description: string
  baseClasses: string
  variations: Record<string, string>
  usage: string
}

export interface GradientPattern {
  description: string
  baseClasses: string
  variations: Record<string, string>
  usage: string
}

export interface AnimationPattern {
  description: string
  implementation: string
  template: string
  examples: string[]
}

export interface LayoutPattern {
  [key: string]: {
    structure: string
    template: string
    description?: string
  }
}

