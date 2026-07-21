import { readdir, readFile } from "node:fs/promises"
import { extname, join, relative } from "node:path"

const roots = ["app", "components"]
const visibleLoadingCopy = /(?:>\s*|["'`])loading(?:\s+[a-z]+){0,4}(?:\.\.\.|…)(?:\s*<|["'`])/gi
const violations = []

async function scan(directory) {
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      await scan(path)
      continue
    }

    if (extname(entry.name) !== ".tsx") continue

    const source = await readFile(path, "utf8")
    for (const match of source.matchAll(visibleLoadingCopy)) {
      const line = source.slice(0, match.index).split("\n").length
      violations.push(`${relative(process.cwd(), path)}:${line}`)
    }
  }
}

await Promise.all(roots.map(scan))

if (violations.length) {
  console.error("Visible loading copy is not allowed. Use LoadingSpinner, LoadingRows, or a feature-specific skeleton:")
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}
