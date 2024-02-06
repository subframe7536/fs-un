import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { basePath, getPath } from '../utils'
import { NodeDirectoryManager } from '../../src'

const manager = new NodeDirectoryManager(basePath)
describe('test move', () => {
  beforeEach(() => {
    manager.ensureDir('temp1')
    manager.ensureDir('temp2')
  })
  afterEach(() => {
    manager.remove('temp1')
    manager.remove('temp2')
  })
  it('file to file, different dir', async () => {
    const filePath1 = getPath('temp1', 'tempFile.txt')
    await manager.write(filePath1, 'Hello, world!')

    const deepFilePath = getPath('temp2', 'deep', 'deep', 'tempFile.txt')
    await manager.move(filePath1, deepFilePath)

    expect(await manager.exists(filePath1)).toBeFalsy()
    expect(await manager.exists(deepFilePath)).toBeTruthy()
  })
  it('file to file, same dir', async () => {
    const filePath1 = getPath('temp1', 'tempFileSameDir.txt')
    await manager.write(filePath1, 'Hello, world!')

    await manager.move(filePath1, filePath1)
    expect(await manager.exists(filePath1)).toBeTruthy()

    const filePath2 = getPath('temp1', 'tempFileSameDir1.txt')

    await manager.move(filePath1, filePath2)
    expect(await manager.exists(filePath1)).toBeFalsy()
    expect(await manager.exists(filePath2)).toBeTruthy()
  })

  it('no source', async () => {
    const filePath1 = getPath('temp1', 'tempFileNotExist.txt')

    expect(await manager.exists(filePath1)).toBeFalsy()
    await manager.move(filePath1, filePath1)
    expect(await manager.exists(filePath1)).toBeFalsy()
  })
})
