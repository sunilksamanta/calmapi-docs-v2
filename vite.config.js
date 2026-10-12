import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The raw markdown of each page (/getting-started.md, /blocks/jobs.md) is written to public/ by
// scripts/generate-docs-assets.mjs, so the dev server serves it and the build copies it into dist/.
export default defineConfig({
  plugins: [react()],
})
