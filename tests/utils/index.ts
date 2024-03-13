import type { DirectoryManager } from '../../src'
import { testCopy } from './copy'
import { testMkdir } from './mkdir'
import { testMove } from './move'

export function testSuite(manager: DirectoryManager) {
  testMkdir(manager)
  testCopy(manager)
  testMove(manager)
}
