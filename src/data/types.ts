export interface MemeTemplate {
  id: string
  name: string
  lines: number
  overlays: number
  styles: string[]
  blank: string
  source?: string
  keywords: string[]
  width: number
  height: number
  assetPath: string
  sha256: string
}
