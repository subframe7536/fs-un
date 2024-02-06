import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const basePath = dirname(fileURLToPath(import.meta.url))

export function getPath(...path: string[]) {
  return join(...path)
}
