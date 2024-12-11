import { expect, it } from 'vitest'
import { getOpfsRoot, isSupportOpfsRoot, WebFS } from '../src/web'
import { walk } from '../src/web/walk'
import { testSuite } from './utils'

if (isSupportOpfsRoot()) {
  const root = await getOpfsRoot()
  testSuite(
    new WebFS(root),
    walk as any,
    path => root.getDirectoryHandle(path),
    p => p.name,
  )
} else {
  it('no OPFS support', () => {
    expect('No OPFS support').toBeTruthy()
  })
}
