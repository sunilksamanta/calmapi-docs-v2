import { cpSync, existsSync, readFileSync, statSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Raw markdown of each page (/getting-started.md, /blocks/jobs.md), written to src/generated/md by
// scripts/generate-docs-assets.mjs. It lives outside public/ so generated files never mix with
// committed ones: the dev server serves it, and the build copies it into the root of dist/.
const RAW_MARKDOWN = fileURLToPath(new URL('./src/generated/md', import.meta.url))

function rawMarkdown() {
  return {
    name: 'calm-raw-markdown',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split(/[?#]/)[0]
        if (!path.endsWith('.md')) return next()
        let file
        try {
          file = resolve(RAW_MARKDOWN, `.${decodeURIComponent(path)}`)
        } catch {
          return next()
        }
        if (!file.startsWith(RAW_MARKDOWN + sep) || !existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
        res.end(readFileSync(file))
      })
    },
    writeBundle(options) {
      // Fails instead of overwriting a file from public/ (the generator reports such clashes too).
      if (existsSync(RAW_MARKDOWN)) cpSync(RAW_MARKDOWN, options.dir, { recursive: true, force: false, errorOnExist: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), rawMarkdown()],
})
