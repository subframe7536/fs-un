import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeFS } from '../src'
import { testSuite } from './utils'

export const basePath = dirname(fileURLToPath(import.meta.url))
testSuite(new NodeFS(basePath))
