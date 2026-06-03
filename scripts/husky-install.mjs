import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')
const gitDir = resolve(projectRoot, '.git')

if (existsSync(gitDir)) {
  execSync('npx husky install', { stdio: 'inherit', cwd: projectRoot })
}
