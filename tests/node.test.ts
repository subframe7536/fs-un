import fs from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from 'pathe'
import { exists, move } from '../src/node/utils'

describe('test move', () => {
  beforeEach(async () => {
    await fs.mkdir('./temp1', { recursive: true })
    await fs.mkdir('./temp2', { recursive: true })
  })
  afterEach(async () => {
    await fs.rm('./temp1', { recursive: true, force: true })
    await fs.rm('./temp2', { recursive: true, force: true })
  })
  it('file to file, different dir', async () => {
    const filePath1 = join('./temp1', 'tempFile.txt')
    await fs.writeFile(filePath1, 'Hello, world!')

    const filePath2 = join('./temp2/deep/deep', 'tempFile.txt')
    await move(filePath1, filePath2)

    expect(await exists(filePath1)).toBeFalsy()
    expect(await exists(filePath2)).toBeTruthy()
  })
  it('file to file, same dir', async () => {
    const filePath1 = join('./temp1', 'tempFile.txt')
    await fs.writeFile(filePath1, 'Hello, world!')

    await move(filePath1, filePath1)
    expect(await exists(filePath1)).toBeTruthy()

    const filePath2 = join('./temp1', 'tempFile1.txt')

    await move(filePath1, filePath2)
    expect(await exists(filePath1)).toBeFalsy()
    expect(await exists(filePath2)).toBeTruthy()
  })

  it('no source', async () => {
    const filePath1 = join('./temp1', 'tempFile.txt')

    expect(await exists(filePath1)).toBeFalsy()
    await move(filePath1, filePath1)
  })
})
