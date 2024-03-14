import type { IFS } from '../../src'
import { testCopy } from './copy'
import { testMkdir } from './mkdir'
import { testMove } from './move'

export function testSuite(ifs: IFS) {
  testMkdir(ifs)
  testCopy(ifs)
  testMove(ifs)
}
