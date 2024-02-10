import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeDirectoryManager } from '../../src'
import { basePath } from '../utils'

const manager = new NodeDirectoryManager(basePath)

describe('test copy file', () => {
  const dirName = 'copyFileTest'
  beforeEach(async () => {
    await manager.ensureDir(dirName)
  })
  afterEach(async () => {
    await manager.remove(dirName)
  })
  it('basic', async () => {
    const sourcePath = join(dirName, 'tempFilenon-exist.txt')
    const targetPath = join(dirName, 'non-exist', 'tempFileCopy.txt')

    await manager.write(sourcePath, 'Hello, world!')
    await manager.copy(sourcePath, targetPath)

    expect(await manager.exists(targetPath)).toBe('file')
    expect(await manager.read(targetPath, 'text')).toBe('Hello, world!')
  })
  it('target file path have already exists a file', async () => {
    const sourcePath = join(dirName, 'tempSameFile')
    const targetPath = join(dirName, 'tempSameFileCopy')

    await manager.write(sourcePath, 'Hello, world!')
    await manager.write(targetPath, '111')

    await manager.copy(sourcePath, targetPath, { overwrite: true })

    expect(await manager.exists(targetPath)).toBe('file')
    expect(await manager.read(targetPath, 'text')).toBe('Hello, world!')

    // overwrite: false
    const targetPath2 = join(dirName, 'tempSameFile2')

    await manager.write(targetPath2, 'Hello, world!')
    expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
  })

  it('target file path have already exists a dir', async () => {
    const sourcePath = join(dirName, 'tempSameDir')
    const targetPath = join(dirName, 'tempSameDirCopy')

    await manager.write(sourcePath, 'Hello, world!')
    await manager.ensureDir(targetPath)

    await manager.copy(sourcePath, targetPath, { overwrite: true })

    expect(await manager.exists(targetPath)).toBe('file')
    expect(await manager.read(targetPath, 'text')).toBe('Hello, world!')

    // overwrite: false
    const targetPath2 = join(dirName, 'tempDir2')

    await manager.ensureDir(targetPath2)
    expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
  })
})

describe('test copy dir', () => {
  const dirName = 'copyDirTest'
  beforeEach(async () => {
    await manager.ensureDir(dirName)
  })
  afterEach(async () => {
    await manager.remove(dirName)
  })
  it('basic', async () => {
    const sourcePath = join(dirName, 'tempDir')
    const targetPath = join(dirName, 'non-exist', 'tempDir1')

    await manager.ensureDir(sourcePath)
    await manager.ensureDir(join(sourcePath, 'temp'))
    await manager.write(join(sourcePath, 'temp.txt'), 'Hello, world!')
    await manager.copy(sourcePath, targetPath)

    expect(await manager.exists(targetPath)).toBe('dir')
    expect(await manager.exists(join(targetPath, 'temp'))).toBe('dir')
    expect(await manager.exists(join(targetPath, 'temp.txt'))).toBe('file')
    expect(await manager.read(join(targetPath, 'temp.txt'), 'text')).toBe('Hello, world!')
  })
  // it('target file path have already exists a file', async () => {
  //   const sourcePath = join(dirName, 'tempSameFile')
  //   const targetPath = join(dirName, 'tempSameFileCopy')

  //   await manager.write(sourcePath, 'Hello, world!')
  //   await manager.write(targetPath, '111')

  //   await manager.copy(sourcePath, targetPath, { overwrite: true })

  //   expect(await manager.exists(targetPath)).toBe('file')
  //   expect(await manager.read(targetPath, 'text')).toBe('Hello, world!')

  //   // overwrite: false
  //   const targetPath2 = join(dirName, 'tempSameFile2')

  //   await manager.write(targetPath2, 'Hello, world!')
  //   expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
  // })

  // it('target file path have already exists a dir', async () => {
  //   const sourcePath = join(dirName, 'tempSameDir')
  //   const targetPath = join(dirName, 'tempSameDirCopy')

  //   await manager.write(sourcePath, 'Hello, world!')
  //   await manager.ensureDir(targetPath)

  //   await manager.copy(sourcePath, targetPath, { overwrite: true })

  //   expect(await manager.exists(targetPath)).toBe('file')
  //   expect(await manager.read(targetPath, 'text')).toBe('Hello, world!')

  //   // overwrite: false
  //   const targetPath2 = join(dirName, 'tempDir2')

  //   await manager.ensureDir(targetPath2)
  //   expect(manager.copy(targetPath, targetPath2, { overwrite: false })).rejects.toThrowError()
  // })
})
