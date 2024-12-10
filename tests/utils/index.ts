import type { IFS, walk as Twalk } from '../../src'
import { testCopy } from './copy'
import { testIO } from './io'
import { testMkdir } from './mkdir'
import { testMove } from './move'
import { testWalk } from './walk'

export function testSuite(ifs: IFS, walk: typeof Twalk, getDir: (path: string) => any) {
  testMkdir(ifs)
  testCopy(ifs)
  testMove(ifs)
  testIO(ifs)
  testWalk(ifs, walk, getDir)
}
