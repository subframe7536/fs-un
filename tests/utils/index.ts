import type { IFS } from '../../src'
import { testCopy } from './copy'
import { testMkdir } from './mkdir'
import { testMove } from './move'
import { testIO } from './io'

export function testSuite(ifs: IFS) {
  testMkdir(ifs)
  testCopy(ifs)
  testMove(ifs)
  testIO(ifs)
}
