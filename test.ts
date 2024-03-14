// import { fdir } from 'fdir'
// import { walk } from './src'

import { mkdir, writeFile } from 'node:fs/promises'

await writeFile('a', 'a')
await mkdir('a/a/a/a', { recursive: true })
