import fsp from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import type { Readable } from 'node:stream'
import { dirname, join, normalize, parse, relative } from 'pathe'
import type { FileAttr, IFS, ListState, MoveOptions, OverwriteOptions, PathType, ReadStreamEvent, ReadStreamOptions } from '..'
import { FsErrorCode, toFsError } from '../error'
import * as _ from './utils'
import * as _e from './error'
import { handleRestError } from './error'

export class NodeFS implements IFS {
  private parsePath: (p: string) => string
  public constructor(
    /**
     * Absolute path to the root directory
     */
    public root?: string,
  ) {
    this.parsePath = this.root
      ? p => join(this.root!, p).replace(/\/$/, '')
      : p => normalize(p)
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    try {
      path = this.parsePath(path)
      const stat = await fsp.stat(path)
      if (stat.isDirectory()) {
        return undefined
      }
      const { dir, name, ext } = parse(this.root ? relative(this.root, path) : path)
      return { dir, name, ext, size: stat.size, modifiedTime: stat.mtime }
    } catch (error) {
      if (_e.isNotExistsError(error)) {
        return undefined
      }
      throw handleRestError(error, 'fileAttr', path)
    }
  }

  public async *list(path: string): AsyncIterable<ListState> {
    try {
      const data = await fsp.opendir(this.parsePath(path))
      for await (const dir of data) {
        yield {
          name: dir.name,
          isDirectory: dir.isDirectory(),
          isFile: dir.isFile(),
          isSymlink: dir.isSymbolicLink(),
        }
      }
    } catch (error) {
      throw handleRestError(error, 'list', path)
    }
  }

  public async exists(path: string): Promise<PathType> {
    return await _.exists(this.parsePath(path)) as PathType
  }

  public async readByte(path: string): Promise<Uint8Array | undefined> {
    try {
      // sync style is much faster than async
      const buf = readFileSync(this.parsePath(path))
      return buf ? Uint8Array.from(buf) : undefined
    } catch (error) {
      if (_e.isNotExistsError(error) || _e.isDirError(error)) {
        return undefined
      }
      throw handleRestError(error, 'readByte', path)
    }
  }

  public async readStream(
    path: string,
    listener: ReadStreamEvent,
    options: ReadStreamOptions = {},
  ): Promise<void> {
    const { length, position = 0, signal } = options
    let stream: Readable | undefined

    try {
      const fileHandle = await fsp.open(this.parsePath(path), 'r')
      const stream = fileHandle.createReadStream({
        start: position,
        end: length ? position + length - 1 : undefined,
        autoClose: true,
        encoding: null, // force stream to be read as raw bytes
        highWaterMark: 64 * 1024,
      })

      for await (const chunk of stream) {
        if (signal?.aborted) {
          break
        }
        await listener(undefined, chunk)
      }

      await listener(undefined, undefined)
    } catch (error) {
      if (_e.isNotExistsError(error) || _e.isDirError(error)) {
        await listener(undefined, undefined)
      } else {
        await listener(handleRestError(error, 'readStream', path), undefined)
      }
    } finally {
      stream?.destroy()
    }
  }

  public async readText(path: string): Promise<string | undefined> {
    try {
      // sync style is much faster than async
      return readFileSync(this.parsePath(path), 'utf-8')
    } catch (error) {
      if (_e.isNotExistsError(error) || _e.isDirError(error)) {
        return undefined
      }
      throw handleRestError(error, 'readText', path)
    }
  }

  public async mkdir(path: string): Promise<void> {
    await _.mkdir(this.parsePath(path))
  }

  public async writeFile(path: string, data: string | ArrayBuffer | ArrayBufferView, options: OverwriteOptions = {}): Promise<void> {
    if (data instanceof ArrayBuffer) {
      data = Buffer.from(
        ArrayBuffer.isView(data)
          ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
          : data,
      )
    }

    path = this.parsePath(path)

    if (!options.overwrite && await _.exists(path)) {
      throw toFsError(FsErrorCode.AlreadyExists, 'writeFile', `"${path}" already exists, cannot overwrite`, path)
    }

    try {
      await fsp.writeFile(path, data as string | Buffer)
    } catch (err) {
      if (_e.isNotExistsError(err)) {
        await fsp.mkdir(dirname(path), { recursive: true })
        await fsp.writeFile(path, data as string | Buffer)
      } else if (_e.isDirError(err)) {
        throw toFsError(FsErrorCode.TypeMisMatch, 'writeFile', `"${path}" is a directory, cannot write`, path)
      } else {
        throw _e.handleRestError(err, 'writeFile', path)
      }
    }
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
    await _.move(this.parsePath(from), options.rename ? to : this.parsePath(to), options)
  }

  public async copy(from: string, to: string, options?: OverwriteOptions): Promise<void> {
    await _.copy(this.parsePath(from), this.parsePath(to), options)
  }

  public async remove(path: string): Promise<void> {
    return await _.remove(this.parsePath(path))
  }
}
