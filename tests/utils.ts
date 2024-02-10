import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const basePath = dirname(fileURLToPath(import.meta.url))
