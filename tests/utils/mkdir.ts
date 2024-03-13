import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DirectoryManager } from '../../src'

export function testMkdir(manager: DirectoryManager) {
  describe('test mkdir', () => {
    const dirName = 'testEnsureDir'
    beforeEach(async () => {
      await manager.mkdir(dirName)
    })
    afterEach(async () => {
      await manager.remove(dirName)
    })
    it('target path not exist', async () => {
      const path = join(dirName, 'test', 'deeo', 'deep')
      await manager.mkdir(path)
      expect(await manager.exists(path)).toBe('dir')
    })

    it('target path exists dir', async () => {
      const path = join(dirName, 'test')
      await manager.mkdir(path)
      await manager.mkdir(path)
      expect(await manager.exists(path)).toBe('dir')
    })

    it('target path exists file', async () => {
      const path = join(dirName, 'test')
      await manager.writeFile(path, 'test')
      await manager.mkdir(path)
      expect(await manager.exists(path)).toBe('file')
    })

    it('parent dir exists file', async () => {
      const path = join(dirName, 'test')
      await manager.writeFile(path, 'test')
      expect(() => manager.mkdir(join(path, 'test2'))).rejects.toThrowError()
    })
  })
}
