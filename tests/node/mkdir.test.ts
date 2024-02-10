import fs from 'node:fs/promises'
import { join, resolve } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeDirectoryManager } from '../../src'
import { basePath } from '../utils'

const manager = new NodeDirectoryManager(basePath)
describe('test ensureDir', () => {
  const dirName = 'testEnsureDir'
  beforeEach(async () => {
    await manager.ensureDir(dirName)
  })
  afterEach(async () => {
    await manager.remove(dirName)
  })
  it('target path not exist', async () => {
    const path = join(dirName, 'test', 'deeo', 'deep')
    await manager.ensureDir(path)
    expect(await manager.exists(path)).toBe('dir')
  })

  it('target path exists dir', async () => {
    const path = join(dirName, 'test')
    await fs.mkdir(join(basePath, path))
    expect(await manager.ensureDir(path)).toBe(resolve(basePath, path))
    expect(await manager.exists(path)).toBe('dir')
  })

  it('target path exists file', async () => {
    const path = join(dirName, 'test')
    await manager.write(path, 'test')
    expect(await manager.ensureDir(path)).toBeUndefined()
    expect(await manager.exists(path)).toBe('file')
  })
})
