import { mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

import solidTransformPlugin from "@opentui/solid/bun-plugin"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, "..")

console.log("Building Serious TUI...")

const binDir = join(rootDir, "bin")
mkdirSync(binDir, { recursive: true })

console.log("Transforming Solid JSX, bundling, and compiling to binary...")
const buildResult = await Bun.build({
  entrypoints: [join(rootDir, "src/main.tsx")],
  target: "bun",
  plugins: [solidTransformPlugin],
  minify: false,
  compile: {
    target: "bun-darwin-arm64",
    outfile: join(binDir, "serious-tui"),
  },
})

if (!buildResult.success) {
  console.error("Build failed:")
  for (const log of buildResult.logs) {
    console.error(log)
  }
  process.exit(1)
}

console.log(`Built: ${join(binDir, "serious-tui")}`)
