import type { IFS } from '../../src'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const dirName = 'testStream'
const decoder = new TextDecoder('utf-8')
export function testIO(ifs: IFS) {
  describe('test stream', () => {
    beforeEach(async () => {
      await ifs.mkdir(dirName)
    })
    afterEach(async () => {
      await ifs.remove(dirName)
    })
    it('read stream', async () => {
      const path = join(dirName, 'test.txt')
      const content = 'Hello, world!'
      await ifs.writeFile(path, content)
      const event = await ifs.readStream(path)
      const data = await new Promise<Uint8Array>((resolve, reject) => {
        event.on('data', resolve)
        event.on('error', reject)
      })
      expect(data).toBeInstanceOf(Uint8Array)
      expect(decoder.decode(data)).toBe(content)
    })
    it('read stream with position and length', async () => {
      const path = join(dirName, 'testLength.txt')
      const content = 'Hello, world!'
      await ifs.writeFile(path, content)
      const event = await ifs.readStream(path, { position: 1, length: 5 })
      const data = await new Promise<Uint8Array>((resolve, reject) => {
        event.on('data', resolve)
        event.on('error', reject)
      })
      expect(data).toBeInstanceOf(Uint8Array)
      expect(decoder.decode(data)).toBe(content.slice(1, 6))
    })
  })
}
