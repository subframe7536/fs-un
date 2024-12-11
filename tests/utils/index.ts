import type { IFS, walk as Twalk } from '../../src'
import { testCopy } from './copy'
import { testIO } from './io'
import { testMkdir } from './mkdir'
import { testMove } from './move'
import { testWalk } from './walk'

export function testSuite<T>(
  ifs: IFS,
  walk: typeof Twalk,
  getWalkRoot: (path: string) => T,
  getDir: (path: Awaited<T>) => string,
) {
  testMkdir(ifs)
  testCopy(ifs)
  testMove(ifs)
  testIO(ifs)
  testWalk(ifs, walk, getWalkRoot, getDir)
}
