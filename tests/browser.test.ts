import { expect, it } from 'vitest'
import { getOpfsRoot, isSupportOpfsRoot, WebFS } from '../src/web'
import { testSuite } from './utils'

if (isSupportOpfsRoot()) {
  const root = await getOpfsRoot()
  testSuite(new WebFS(root))
} else {
  it('no OPFS support', () => {
    expect('No OPFS support').toBeTruthy()
  })
}
