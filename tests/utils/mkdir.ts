import type { IFS } from '../../src'

import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const dirName = 'testEnsureDir'
export function testMkdir(ifs: IFS) {
  describe('test mkdir', () => {
    beforeEach(async () => {
      await ifs.mkdir(dirName)
    })
    afterEach(async () => {
      await ifs.remove(dirName)
    })
    it('target path not exist', async () => {
      const path = join(dirName, 'test', 'deeo', 'deep')
      await ifs.mkdir(path)
      expect(await ifs.exists(path)).toBe('dir')
    })

    it('target path exists dir', async () => {
      const path = join(dirName, 'testExistDir')
      await ifs.mkdir(path)
      await ifs.mkdir(path)
      expect(await ifs.exists(path)).toBe('dir')
    })

    it('target path exists file', async () => {
      const path = join(dirName, 'testExistFile')
      await ifs.writeFile(path, 'test')
      await expect(() => ifs.mkdir(path)).rejects.toThrowError()
    })

    it('parent dir exists file', async () => {
      const path = join(dirName, 'test')
      await ifs.writeFile(path, 'Hello, world!')
      await expect(() => ifs.mkdir(join(path, 'test2'))).rejects.toThrowError()
    })
  })
}
