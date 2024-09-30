import type { IFS } from '../../src'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FsError } from '../../src/error'

const dirName = 'testStream'
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
      ifs.readStream(path, (err, data) => {
        if (err) {
          expect(err).toBeInstanceOf(FsError)
        } else if (data) {
          expect(data).toBeInstanceOf(Uint8Array)
          expect(data.toString()).toBe(content)
        }
      })
    })
    it('read stream with position and length', async () => {
      const path = join(dirName, 'testLength.txt')
      const content = 'Hello, world!'
      await ifs.writeFile(path, content)
      ifs.readStream(path, (err, data) => {
        if (err) {
          expect(err).toBeInstanceOf(FsError)
        } else if (data) {
          expect(data).toBeInstanceOf(Uint8Array)
          expect(data.toString()).toBe(content.slice(1, 6))
        }
      }, { position: 1, length: 5 })
    })
  })
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
      ifs.readStream(path, (err, data) => {
        if (err) {
          expect(err).toBeInstanceOf(FsError)
        } else if (data) {
          expect(data).toBeInstanceOf(Uint8Array)
          expect(data.toString()).toBe(content)
        }
      })
    })
    it('read stream with position and length', async () => {
      const path = join(dirName, 'testLength.txt')
      const content = 'Hello, world!'
      await ifs.writeFile(path, content)
      ifs.readStream(path, (err, data) => {
        if (err) {
          expect(err).toBeInstanceOf(FsError)
        } else if (data) {
          expect(data).toBeInstanceOf(Uint8Array)
          expect(data.toString()).toBe(content.slice(1, 6))
        }
      }, { position: 1, length: 5 })
    })
  })
}
