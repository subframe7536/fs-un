import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { IFS } from '../../src'

const dirName1 = 'moveFileTest1'
const dirName2 = 'moveFileTest2'
export function testMove(ifs: IFS) {
  describe('test move file', () => {
    beforeEach(async () => {
      await ifs.mkdir(dirName1)
      await ifs.mkdir(dirName2)
    })
    afterEach(async () => {
      await ifs.remove(dirName1)
      await ifs.remove(dirName2)
    })
    it('basic', async () => {
      const filePath1 = join(dirName1, 'tempFile.txt')
      await ifs.writeFile(filePath1, 'Hello, world!')

      const deepFilePath = join(dirName2, 'deep', 'deep', 'tempFile.txt')
      await ifs.move(filePath1, deepFilePath)

      expect(await ifs.exists(filePath1)).toBeFalsy()
      expect(await ifs.exists(deepFilePath)).toBe('file')
      expect(await ifs.readText(deepFilePath)).toBe('Hello, world!')
    })
    it('rename', async () => {
      const filePath1 = join(dirName1, 'tempFile.txt')
      await ifs.writeFile(filePath1, 'Hello, world!')
      await ifs.move(filePath1, 'asd', { rename: true })
      expect(await ifs.exists(filePath1)).toBeFalsy()
      expect(await ifs.exists(join(dirName1, 'asd'))).toBe('file')
      expect(await ifs.readText(join(dirName1, 'asd'))).toBe('Hello, world!')

      // not exists
      const filePath2 = join(dirName1, 'tempFile2.txt')
      expect(ifs.move(filePath2, 'asd', { rename: true })).rejects.toThrowError()
    })
    it('target file path have already exists a file', async () => {
      const filePath1 = join(dirName1, 'tempSameFile')
      const filePath2 = join(dirName2, 'tempSameFile')

      await ifs.writeFile(filePath1, 'Hello, world!')
      await ifs.writeFile(filePath2, '111')

      await ifs.move(filePath1, filePath2, { overwrite: true })

      expect(await ifs.exists(filePath2)).toBe('file')
      expect(await ifs.readText(filePath2)).toBe('Hello, world!')

      // overwrite: false
      const filePath3 = join(dirName1, 'tempSameFile1')

      await ifs.writeFile(filePath3, '111')
      expect(ifs.move(filePath2, filePath3, { overwrite: false })).rejects.toThrowError()
    })
    it('target file path have already exists a dir', async () => {
      const filePath1 = join(dirName1, 'tempSameDir')
      const filePath2 = join(dirName2, 'tempSameDir')

      await ifs.writeFile(filePath1, 'Hello, world!')
      await ifs.mkdir(filePath2)

      await ifs.move(filePath1, filePath2, { overwrite: true })

      expect(await ifs.exists(filePath2)).toBe('file')
      expect(await ifs.readText(filePath2)).toBe('Hello, world!')

      // overwrite: false
      const filePath3 = join(dirName1, 'tempSameDir1')

      await ifs.mkdir(filePath3)
      expect(ifs.move(filePath2, filePath3, { overwrite: false })).rejects.toThrowError()
    })
  })

  describe('test move dir', () => {
    const dirName1 = 'moveDirTest1'
    const dirName2 = 'moveDirTest2'
    beforeEach(async () => {
      await ifs.mkdir(dirName1)
      await ifs.mkdir(dirName2)
    })
    afterEach(async () => {
      await ifs.remove(dirName1)
      await ifs.remove(dirName2)
    })
    it('basic', async () => {
      const dirPath1 = join(dirName1, 'tempDir')
      const deepDirPath = join(dirName2, 'deep', 'deep', 'tempDir')

      await ifs.mkdir(dirPath1)
      await ifs.move(dirPath1, deepDirPath)

      expect(await ifs.exists(dirPath1)).toBeFalsy()
      expect(await ifs.exists(deepDirPath)).toBe('dir')
    })
    it('rename', async () => {
      const dirPath1 = join(dirName1, 'tempDir')

      await ifs.mkdir(dirPath1)
      await ifs.move(dirPath1, 'asd', { rename: true })

      expect(await ifs.exists(dirPath1)).toBeFalsy()
      expect(await ifs.exists(join(dirName1, 'asd'))).toBe('dir')

      // not exists
      const dirPath2 = join(dirName1, 'tempDir2')
      expect(ifs.move(dirPath2, 'asd', { rename: true })).rejects.toThrowError()
    })
    it('target dir path have already exists a file', async () => {
      const dirPath1 = join(dirName1, 'tempSameFile')
      const dirPath2 = join(dirName2, 'tempSameFile')

      await ifs.mkdir(dirPath1)
      await ifs.writeFile(dirPath2, '111')

      await ifs.move(dirPath1, dirPath2, { overwrite: true })

      expect(await ifs.exists(dirPath1)).toBeFalsy()
      expect(await ifs.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameFile1')
      await ifs.writeFile(dirPath3, '111')
      expect(ifs.move(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
    it('target dir path have already exists a dir', async () => {
      const dirPath1 = join(dirName1, 'tempSameDir')
      const dirPath2 = join(dirName2, 'tempSameDir')

      await ifs.mkdir(dirPath1)
      await ifs.mkdir(dirPath2)

      await ifs.move(dirPath1, dirPath2, { overwrite: true })

      expect(await ifs.exists(dirPath1)).toBeFalsy()
      expect(await ifs.exists(dirPath2)).toBe('dir')

      // overwrite: false
      const dirPath3 = join(dirName1, 'tempSameDir1')

      await ifs.mkdir(dirPath3)
      expect(ifs.move(dirPath2, dirPath3, { overwrite: false })).rejects.toThrowError()
    })
  })
}
