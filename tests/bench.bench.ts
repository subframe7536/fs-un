/* eslint-disable test/consistent-test-it */
import { bench } from 'vitest'
import { fdir } from 'fdir'
import { walk } from '../src/node'

const path = 'node_modules'
bench('fs-un', async () => {
  await walk(path, { maxDepth: 1000, withRootPath: true })
})

bench('fdir', async () => {
  // eslint-disable-next-line new-cap
  await new fdir({ maxDepth: 1000, relativePaths: true, includeBasePath: true }).crawl(path).withPromise()
})
