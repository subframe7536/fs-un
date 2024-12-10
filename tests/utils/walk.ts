import type { IFS, walk as Twalk } from '../../src'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const dirName = 'testWalk'
export function testWalk<T>(ifs: IFS<T>, walk: typeof Twalk, getDir: (path: string) => any) {
  describe('test walk', () => {
    beforeEach(async () => {
      await ifs.mkdir(dirName)
    })

    afterEach(async () => {
      await ifs.remove(dirName)
    })

    it('should walk empty directory', async () => {
      const paths: string[] = []
      for await (const path of walk(getDir(dirName))) {
        paths.push(path)
      }
      expect(paths.length).toEqual(0)
    })

    it('should walk files in directory', async () => {
      await ifs.writeFile(join(dirName, 'file1.txt'), 'content1')
      await ifs.writeFile(join(dirName, 'file2.txt'), 'content2')

      const paths: string[] = []
      const d = getDir(dirName)
      for await (const path of walk(d, { withRootPath: true })) {
        paths.push(path)
      }

      expect(paths.sort()).toEqual([
        join(d, 'file1.txt'),
        join(d, 'file2.txt'),
      ].sort())
    })

    it('should walk nested directories', async () => {
      await ifs.mkdir(join(dirName, 'dir1'))
      await ifs.mkdir(join(dirName, 'dir1/dir2'))
      await ifs.writeFile(join(dirName, 'dir1/file1.txt'), 'content1')
      await ifs.writeFile(join(dirName, 'dir1/dir2/file2.txt'), 'content2')

      const paths: string[] = []
      const d = getDir(dirName)
      for await (const path of walk(d, { withRootPath: true })) {
        paths.push(path)
      }

      expect(paths.sort()).toEqual([
        join(d, 'dir1/file1.txt'),
        join(d, 'dir1/dir2/file2.txt'),
      ].sort())
    })

    it('should respect maxDepth option', async () => {
      await ifs.mkdir(join(dirName, 'dir1'))
      await ifs.mkdir(join(dirName, 'dir1/dir2'))
      await ifs.writeFile(join(dirName, 'dir1/file1.txt'), 'content1')
      await ifs.writeFile(join(dirName, 'dir1/dir2/file2.txt'), 'content2')

      const paths: string[] = []
      const d = getDir(dirName)
      for await (const path of walk(d, { withRootPath: true, maxDepth: 1 })) {
        paths.push(path)
      }

      expect(paths).toEqual([join(d, 'dir1/file1.txt')])
    })

    it('should include directories when includeDirs is true', async () => {
      await ifs.mkdir(join(dirName, 'dir1'))
      await ifs.mkdir(join(dirName, 'dir1/dir2'))
      await ifs.writeFile(join(dirName, 'dir1/file1.txt'), 'content1')

      const paths: string[] = []
      const d = getDir(dirName)
      for await (const path of walk(d, { withRootPath: true, includeDirs: true })) {
        paths.push(path)
      }

      expect(paths.sort()).toEqual([
        join(d, 'dir1/'),
        join(d, 'dir1/dir2/'),
        join(d, 'dir1/file1.txt'),
      ].sort())
    })

    it('should respect filter option', async () => {
      await ifs.writeFile(join(dirName, 'file1.txt'), 'content1')
      await ifs.writeFile(join(dirName, 'file2.js'), 'content2')

      const paths: string[] = []
      const d = getDir(dirName)
      for await (const path of walk(d, {
        withRootPath: true,
        filter: path => path.endsWith('.txt'),
      })) {
        paths.push(path)
      }

      expect(paths).toEqual([join(d, 'file1.txt')])
    })

    it('should respect signal for cancellation', async () => {
      for (let i = 0; i < 10; i++) {
        await ifs.writeFile(join(dirName, `file${i}.txt`), `content${i}`)
      }

      const controller = new AbortController()
      const paths: string[] = []

      setTimeout(() => controller.abort(), 100)

      for await (const path of walk(getDir(dirName), {
        transform: async (path) => {
          await new Promise(resolve => setTimeout(resolve, 20))
          return path
        },
        signal: controller.signal,
      })) {
        paths.push(path)
      }

      expect(paths.length).toBeLessThanOrEqual(5)
    })
  })
}
