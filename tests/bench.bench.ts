/* eslint-disable test/consistent-test-it */
import { readdir } from 'node:fs/promises'
import { bench } from 'vitest'
import { fdir } from 'fdir'
import { walk } from '../src/utils/walk'

const path = 'node_modules'
bench('fs-un', async () => {
  await walk(path, path => readdir(path, { withFileTypes: true })
    .then(dirent => dirent.map(dirent => ({ isDir: dirent.isDirectory(), name: dirent.name }))), { maxDepth: 1000 })
})

bench('fdir', async () => {
  // eslint-disable-next-line new-cap
  await new fdir({ maxDepth: 1000, relativePaths: true, includeBasePath: true }).crawl(path).withPromise()
})
