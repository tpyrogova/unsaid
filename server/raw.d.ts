/** Vite `?raw` imports (used for prompts/*.md, bundled into the Worker by Vite). */
declare module '*.md?raw' {
  const content: string
  export default content
}
