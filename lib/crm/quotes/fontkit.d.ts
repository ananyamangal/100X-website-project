// Minimal typing for the part of fontkit (pdfkit's font engine) used by lib/crm/quotes/pdf.ts.
declare module "fontkit" {
  export interface Font {
    hasGlyphForCodePoint(codePoint: number): boolean
  }
  export function create(buffer: Buffer, postscriptName?: string): Font
}
