import type { IFS } from '../../src'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const testDir = 'testFileAttrDir'
export function testFileAttr(ifs: IFS) {
  describe('ifs fileAttr', () => {
    beforeEach(async () => {
      await ifs.mkdir(testDir)
    })

    afterEach(async () => {
      await ifs.remove(testDir)
    })

    it('should return file attributes for a given file path', async () => {
      const filePath = join(testDir, 'test.txt')
      const fileContent = 'Hello, World!'

      await ifs.writeFile(filePath, fileContent)

      const fileAttr = await ifs.fileAttr(filePath)

      expect(fileAttr).toBeDefined()
      expect(fileAttr?.name).toBe('test')
      expect(fileAttr?.ext).toBe('.txt')
      expect(fileAttr?.size).toBe(fileContent.length)
      expect(fileAttr?.dir).toBe(testDir)
      expect(fileAttr?.modifiedTime).toBeInstanceOf(Date)
    })

    it('should return undefined for a directory path', async () => {
      const dirPath = join(testDir, 'subDir')
      await ifs.mkdir(dirPath)

      const fileAttr = await ifs.fileAttr(dirPath)
      expect(fileAttr).toBeUndefined()
    })

    it('should return undefined for a non-existing path', async () => {
      const nonExistentPath = join(testDir, 'nonExistent.txt')

      const attr = await ifs.fileAttr(nonExistentPath)
      expect(attr).toBeUndefined()
    })
  })
}
