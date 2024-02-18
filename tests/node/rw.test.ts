import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { basePath } from '../utils'
import { NodeDirectoryManager, parseJsonStringWithDate } from '../../src'

const manager = await NodeDirectoryManager.init(basePath)

const dirName = 'rwTest'

describe('test read and write', () => {
  beforeEach(async () => {
    await manager.ensureDir(dirName)
  })
  afterEach(async () => {
    await manager.remove(dirName)
  })
  it('text', async () => {
    const filePath = join(dirName, 'tempFile.txt')
    await manager.write(filePath, 'Hello, world!')
    expect(await manager.read(filePath, 'text')).toBe('Hello, world!')
  })
  it('buffer', async () => {
    const filePath = join(dirName, 'tempBuffer')
    await manager.write(filePath, Buffer.from('Hello, world!'))
    expect(await manager.read(filePath, 'buffer')).toStrictEqual(Buffer.from('Hello, world!'))
  })
  it('json', async () => {
    const filePath = join(dirName, 'tempFile.json')
    await manager.write(filePath, { hello: 'world' })
    expect(await manager.read(filePath, 'json')).toEqual({ hello: 'world' })
  })
  it('json with date', async () => {
    const filePath = join(dirName, 'tempFileWithDate.json')
    const obj = { date: new Date() }
    await manager.write(filePath, obj)
    expect(
      await manager.read(filePath, 'json', parseJsonStringWithDate),
    ).toStrictEqual(obj)
  })
})
