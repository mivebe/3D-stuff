// builds each project listed in src/projects.js into public/projects/<id>/
// so the dashboard can embed them as iframes. each project builds with its
// own dependencies and a relative base, fully isolated from the dashboard.
import { execSync } from 'node:child_process'
import { existsSync, rmSync, cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projects } from '../src/projects.js'

const dashboardRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const outRoot = resolve(dashboardRoot, 'public/projects')

const only = process.argv.slice(2)
const selected = only.length ? projects.filter((p) => only.includes(p.id)) : projects

mkdirSync(outRoot, { recursive: true })

for (const project of selected) {
  const source = resolve(dashboardRoot, project.source)
  console.log(`\n=== ${project.id} (${source}) ===`)
  if (!existsSync(source)) {
    console.error(`  skip: source not found`)
    continue
  }

  if (!existsSync(resolve(source, 'node_modules'))) {
    console.log('  installing deps...')
    execSync('npm install', { cwd: source, stdio: 'inherit' })
  }

  // vite: relative base so assets resolve under /projects/<id>/ in the iframe
  const outDir = 'dist'
  execSync('npm run build -- --base=./', { cwd: source, stdio: 'inherit' })

  const dest = resolve(outRoot, project.id)
  rmSync(dest, { recursive: true, force: true })
  cpSync(resolve(source, outDir), dest, { recursive: true })
  console.log(`  -> public/projects/${project.id}`)
}

console.log('\ndone.')
