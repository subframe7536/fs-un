import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DirectoryManager } from '../../src'

export function testMove(manager: DirectoryManager) {
  describe('test move file', () => {
    const dirName1 = 'moveFileTest1'
    const dirName2 = 'moveFileTest2'
    beforeEach(async () => {
      await manager.mkdir(dirName1)
      await manager.mkdir(dirName2)
    })
    afterEach(async () => {
      await manager.remove(dirName1)
      await manager.remove(dirName2)
    })
    it('basic', async () => {
      const filePath1 = join(dirName1, 'tempFile.txt')
      await manager.writeFile(filePath1, 'Hello, world!')

      const deepFilePath = join(dirName2, 'deep', 'deep', 'tempFile.txt')
      await manager.move(filePath1, deepFilePath)

      expect(await manager.exists(filePath1)).toBeFalsy()
      expect(await manager.exists(deepFilePath)).toBe('file')
      expect(await manager.readText(deepFilePath)).toBe('Hello, world!')
    })
    it('rename', async () => {
      const filePath1 = join(dirName1, 'tempFile.txt')
      await manager.writeFile(filePath1, 'Hello, world!')
      await manager.move(filePath1, 'asd', { rename: true })
      expect(await manager.exists(filePath1)).toBeFalsy()
      expect(await manager.exists(join(dirName1, 'asd'))).toBe('file')
      expect(await manager.readText(join(dirName1, 'asd'))).toBe('Hello, world!')

      // not exists
      const filePath2 = join(dirName1, 'tempFile2.txt')
      expect(manager.move(filePath2, 'asd', { rename: true })).rejects.toThrowError()
    })
    it('target file path have already exists a file', async () => {
      const filePath1 = join(dirName1, 'tempSameFile')
      const filePath2 = join(dirName2, 'tempSameFile')

      await manager.writeFile(filePath1, 'Hello, world!')
      await manager.writeFile(filePath2, '111')

      await manager.move(filePath1, filePath2, { overwrite: true })

      expect(await manager.exists(filePath2)).toBe('file')
      expect(await manager.readText(filePath2)).toBe('Hello, world!')

      // overwrite: false
      const filePath3 = join(dirName1, 'tempSameFile1')

      await manager.writeFile(filePath3, '111')
      expect(manager.move(filePath2, filePath3, { overwrite: false })).rejects.toThrowError()
    })
    it('target file path have already exists a dir', async () => {
      const filePath1 = join(dirName1, 'tempSameDir')
      const filePath2 = join(dirName2, 'tempSameDir')

      await manager.writeFile(filePath1, 'Hello, world!')
      await manager.mkdir(filePath2)

      await manager.move(filePath1, filePath2, { overwrite: true })

      expect(await manager.exists(filePath2)).toBe('file')
      expect(await manager.readText(filePath2)).toBe('Hello, world!')

      // overwrite: false
      const filePath3 = join(dirName1, 'tempSameDir1')

      await manager.mkdir(filePath3)
      expect(manager.move(filePath2, filePath3, { overwrite: false })).rejects.toThrowError()
    })
  })

  describe('test move dir', () => {
    const dirName1 = 'moveDirTest1'
    const dirName2 = 'moveDirTest2'
    beforeEach(async () => {
      await manager.mkdir(dirName1)
      await manager.mkdir(dirName2)
    })
    afterEach(async () => {
      await manager.remove(dirName1)
      await manager.remove(dirName2)
    })
    it('basic', async () => {
      const dirPath1 = join(dirName1, 'tempDir')
      const deepDirPath = join(dirName2, 'deep', 'deep', 'tempDir')

      await manager.mkdir(dirPath1)
      await manager.move(dirPath1, deepDirPath)

      expect(await manager.exists(dirPath1)).toBeFalsy()
      expect(await manager.exists(deepDirPath)).toBe('dir')
    })
    it('rename', async () => {
      const dirPath1 = join(dirName1, 'tempDir')

      await manager.mkdir(dirPath1)
      await manager.move(dirPath1, 'asd', { rename: true })

      expect(await manager.exists(dirPath1)).toBeFalsy()
      expect(await manager.exists(join(dirName1, 'asd'))).toBe('dir')

      // not exists
      const dirPath2 = join(dirName1, 'tempDir2')
      expect(manager.move(dirPath2, 'asd', { rename: true })).rejects.toThrowError()
    })
    it('target dir path have already exists a file', async () => {
      const dirPath1 = join(dirName1, 'tempSameFile')
      const dirPath2 = join(dirName2, 'tempSameFile')

      await manager.mkdir(dirPath1)
      await manager.writeFile(dirPath2, '111')

      await manager.move(dirPath1, dirPath2, { overwrite: true })

      expect(await manager.exists(dirPath1)).toBeFalsy()
      expect(await manager.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameFile1')
      await manager.writeFile(dirPath3, '111')
      expect(manager.move(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
    it('target dir path have already exists a dir', async () => {
      const dirPath1 = join(dirName1, 'tempSameDir')
      const dirPath2 = join(dirName2, 'tempSameDir')

      await manager.mkdir(dirPath1)
      await manager.mkdir(dirPath2)

      await manager.move(dirPath1, dirPath2, { overwrite: true })

      expect(await manager.exists(dirPath1)).toBeFalsy()
      expect(await manager.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameDir1')

      await manager.mkdir(dirPath3)
      expect(manager.move(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
  })
}