import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { basePath, getPath } from '../utils'
import { NodeDirectoryManager, parseJsonStringWithDate } from '../../src'

const manager = new NodeDirectoryManager(basePath)
describe('test write', () => {
  beforeEach(() => {
    manager.ensureDir('temp')
  })
  afterEach(() => {
    manager.remove('temp')
  })
  it('text', async () => {
    const filePath = getPath('temp', 'tempFile.txt')
    await manager.write(filePath, 'Hello, world!')
    expect(await manager.read(filePath, 'text')).toBe('Hello, world!')
  })
  it('buffer', async () => {
    const filePath = getPath('temp', 'tempBuffer')
    await manager.write(filePath, Buffer.from('Hello, world!'))
    expect(await manager.read(filePath, 'buffer')).toStrictEqual(Buffer.from('Hello, world!'))
  })
  it('json', async () => {
    const filePath = getPath('temp', 'tempFile.json')
    await manager.write(filePath, { hello: 'world' })
    expect(await manager.read(filePath, 'json')).toEqual({ hello: 'world' })
  })
  it('json with date', async () => {
    const filePath = getPath('temp', 'tempFileWithDate.json')
    const obj = { date: new Date() }
    await manager.write(filePath, obj)
    expect(
      await manager.read(filePath, 'json', parseJsonStringWithDate),
    ).toStrictEqual(obj)
  })
})
