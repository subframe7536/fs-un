import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeDirectoryManager } from '../src'
import { testSuite } from './utils'

export const basePath = dirname(fileURLToPath(import.meta.url))
testSuite(new NodeDirectoryManager(basePath))
