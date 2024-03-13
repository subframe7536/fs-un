import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DirectoryManager } from '../../src'

export function testCopy(manager: DirectoryManager) {
  describe('test copy file', () => {
    const dirName = 'copyFileTest'
    beforeEach(async () => {
      await manager.mkdir(dirName)
    })
    afterEach(async () => {
      await manager.remove(dirName)
    })
    it('basic', async () => {
      const sourcePath = join(dirName, 'tempFilenon-exist.txt')
      const targetPath = join(dirName, 'non-exist', 'tempFileCopy.txt')

      await manager.writeFile(sourcePath, 'Hello, world!')
      await manager.copy(sourcePath, targetPath)

      expect(await manager.exists(targetPath)).toBe('file')
      expect(await manager.readText(targetPath)).toBe('Hello, world!')
    })
    it('source file not exist', async () => {
      const sourcePath = join(dirName, 'tempFilenon-noexist.txt')
      const targetPath = join(dirName, 'non-exist', 'tempFileCopy.txt')

      expect(manager.copy(sourcePath, targetPath)).rejects.toThrowError()
    })
    it('target file path have already exists a file', async () => {
      const sourcePath = join(dirName, 'tempSameFile')
      const targetPath = join(dirName, 'tempSameFileCopy')

      await manager.writeFile(sourcePath, 'Hello, world!')
      await manager.writeFile(targetPath, '111')

      await manager.copy(sourcePath, targetPath, { overwrite: true })

      expect(await manager.exists(targetPath)).toBe('file')
      expect(await manager.readText(targetPath)).toBe('Hello, world!')

      // overwrite: false
      const targetPath2 = join(dirName, 'tempSameFile2')

      await manager.writeFile(targetPath2, 'Hello, world!')
      expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
    })
    it('target file path have already exists a dir', async () => {
      const sourcePath = join(dirName, 'tempSameDir')
      const targetPath = join(dirName, 'tempSameDirCopy')

      await manager.writeFile(sourcePath, 'Hello, world!')
      await manager.mkdir(targetPath)

      await manager.copy(sourcePath, targetPath, { overwrite: true })

      expect(await manager.exists(targetPath)).toBe('file')
      expect(await manager.readText(targetPath)).toBe('Hello, world!')

      // overwrite: false
      const targetPath2 = join(dirName, 'tempDir2')

      await manager.mkdir(targetPath2)
      expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
    })
  })

  describe('test copy dir', () => {
    const dirName1 = 'copyDirTest'
    const dirName2 = 'copyDirTest1'
    beforeEach(async () => {
      await manager.mkdir(dirName1)
      await manager.mkdir(dirName2)
    })
    afterEach(async () => {
      await manager.remove(dirName1)
      await manager.remove(dirName2)
    })
    it('basic', async () => {
      const sourcePath = join(dirName1, 'tempDir')
      const targetPath = join(dirName1, 'non-exist', 'tempDir1')

      await manager.mkdir(sourcePath)
      await manager.mkdir(join(sourcePath, 'temp'))
      await manager.writeFile(join(sourcePath, 'temp.txt'), 'Hello, world!')
      await manager.copy(sourcePath, targetPath)

      expect(await manager.exists(targetPath)).toBe('dir')
      expect(await manager.exists(join(targetPath, 'temp'))).toBe('dir')
      expect(await manager.exists(join(targetPath, 'temp.txt'))).toBe('file')
      expect(await manager.readText(join(targetPath, 'temp.txt'))).toBe('Hello, world!')
    })
    it('source file not exist', async () => {
      const sourcePath = join(dirName1, 'tempFilenon-noexist')
      const targetPath = join(dirName1, 'non-exist', 'tempFileCopy')

      expect(manager.copy(sourcePath, targetPath)).rejects.toThrowError()
    })
    it('target dir path have already exists a dir', async () => {
      const dirPath1 = join(dirName1, 'tempSameDir')
      const dirPath2 = join(dirName2, 'tempSameDir')

      await manager.mkdir(dirPath1)
      await manager.mkdir(dirPath2)

      await manager.copy(dirPath1, dirPath2, { overwrite: true })

      expect(await manager.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameDir1')

      await manager.mkdir(dirPath3)
      expect(manager.copy(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })

    it('target dir path have already exists a file', async () => {
      const dirPath1 = join(dirName1, 'tempSameFile')
      const dirPath2 = join(dirName2, 'tempSameFile')

      await manager.mkdir(dirPath1)
      await manager.writeFile(dirPath2, '111')

      await manager.copy(dirPath1, dirPath2, { overwrite: true })

      expect(await manager.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameFile1')
      await manager.writeFile(dirPath3, '111')
      expect(manager.copy(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
  })
}
