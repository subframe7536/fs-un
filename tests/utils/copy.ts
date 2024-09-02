import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IFS } from '../../src'

const dirName = 'copyFileTest'
export function testCopy(ifs: IFS) {
  describe('test copy file', () => {
    beforeEach(async () => {
      await ifs.mkdir(dirName)
    })
    afterEach(async () => {
      await ifs.remove(dirName)
    })
    it('basic', async () => {
      const sourcePath = join(dirName, 'tempFilenon-exist.txt')
      const targetPath = join(dirName, 'non-exist', 'tempFileCopy.txt')

      await ifs.writeFile(sourcePath, 'Hello, world!')
      await ifs.copy(sourcePath, targetPath)

      expect(await ifs.exists(targetPath)).toBe('file')
      expect(await ifs.readText(targetPath)).toBe('Hello, world!')
    })
    it('source file not exist', async () => {
      const sourcePath = join(dirName, 'tempFilenon-noexist.txt')
      const targetPath = join(dirName, 'non-exist', 'tempFileCopy.txt')

      expect(ifs.copy(sourcePath, targetPath)).rejects.toThrowError()
    })
    it('target file path have already exists a file', async () => {
      const sourcePath = join(dirName, 'tempSameFile')
      const targetPath = join(dirName, 'tempSameFileCopy')

      await ifs.writeFile(sourcePath, 'Hello, world!')
      await ifs.writeFile(targetPath, '111')

      await ifs.copy(sourcePath, targetPath, { overwrite: true })

      expect(await ifs.exists(targetPath)).toBe('file')
      expect(await ifs.readText(targetPath)).toBe('Hello, world!')

      // overwrite: false
      const targetPath2 = join(dirName, 'tempSameFile2')

      await ifs.writeFile(targetPath2, 'Hello, world!')
      expect(ifs.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
    })
    it('target file path have already exists a dir', async () => {
      const sourcePath = join(dirName, 'tempSameDir')
      const targetPath = join(dirName, 'tempSameDirCopy')

      await ifs.writeFile(sourcePath, 'Hello, world!')
      await ifs.mkdir(targetPath)

      await ifs.copy(sourcePath, targetPath, { overwrite: true })

      expect(await ifs.exists(targetPath)).toBe('file')
      expect(await ifs.readText(targetPath)).toBe('Hello, world!')

      // overwrite: false
      const targetPath2 = join(dirName, 'tempDir2')

      await ifs.mkdir(targetPath2)
      expect(ifs.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
    })
  })

  describe('test copy dir', () => {
    const dirName1 = 'copyDirTest'
    const dirName2 = 'copyDirTest1'
    beforeEach(async () => {
      await ifs.mkdir(dirName1)
      await ifs.mkdir(dirName2)
    })
    afterEach(async () => {
      await ifs.remove(dirName1)
      await ifs.remove(dirName2)
    })
    it('basic', async () => {
      const sourcePath = join(dirName1, 'tempDir')
      const targetPath = join(dirName1, 'non-exist', 'tempDir1')

      await ifs.mkdir(sourcePath)
      await ifs.mkdir(join(sourcePath, 'temp'))
      await ifs.writeFile(join(sourcePath, 'temp.txt'), 'Hello, world!')
      await ifs.copy(sourcePath, targetPath)

      expect(await ifs.exists(targetPath)).toBe('dir')
      expect(await ifs.exists(join(targetPath, 'temp'))).toBe('dir')
      expect(await ifs.exists(join(targetPath, 'temp.txt'))).toBe('file')
      expect(await ifs.readText(join(targetPath, 'temp.txt'))).toBe('Hello, world!')
    })
    it('source file not exist', async () => {
      const sourcePath = join(dirName1, 'tempFilenon-noexist')
      const targetPath = join(dirName1, 'non-exist', 'tempFileCopy')

      expect(ifs.copy(sourcePath, targetPath)).rejects.toThrowError()
    })
    it('target dir path have already exists a dir', async () => {
      const dirPath1 = join(dirName1, 'tempSameDir')
      const dirPath2 = join(dirName2, 'tempSameDir')

      await ifs.mkdir(dirPath1)
      await ifs.mkdir(dirPath2)

      await ifs.copy(dirPath1, dirPath2, { overwrite: true })

      expect(await ifs.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameDir1')

      await ifs.mkdir(dirPath3)
      expect(ifs.copy(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })

    it('target dir path have already exists a file', async () => {
      const dirPath1 = join(dirName1, 'tempSameFile')
      const dirPath2 = join(dirName2, 'tempSameFile')

      await ifs.mkdir(dirPath1)
      await ifs.writeFile(dirPath2, '111')

      await ifs.copy(dirPath1, dirPath2, { overwrite: true })

      expect(await ifs.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameFile1')
      await ifs.writeFile(dirPath3, '111')
      expect(ifs.copy(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
  })
}
