import fsp from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { dirname, join, parse, relative } from 'pathe'
import type { FileAttr, IFS, ListState, MoveOptions, OverwriteOptions, PathType } from '..'
import * as _ from './utils'

export class NodeFS implements IFS {
  public constructor(
    private root: string,
  ) { }

  private parsePath(p: string) {
    return join(this.root, p).replace(/\/$/, '')
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    try {
      path = this.parsePath(path)
      const stat = await fsp.stat(path)
      if (stat.isDirectory()) {
        return undefined
      }
      const { dir, name, ext } = parse(relative(this.root, path))
      return { dir, name, ext, size: stat.size, modifiedTime: stat.mtime }
    } catch (error) {
      if (_.isNotExistError(error)) {
        return undefined
      }
      throw error
    }
  }

  public async *list(path: string): AsyncIterable<ListState> {
    const data = await fsp.opendir(this.parsePath(path))
    for await (const dir of data) {
      yield {
        name: dir.name,
        isDirectory: dir.isDirectory(),
        isFile: dir.isFile(),
        isSymlink: dir.isSymbolicLink(),
      }
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
      if (_.isNotExistError(error) || _.isDirError(error)) {
        return undefined
      }
      throw error
    }
  }

  public async readText(path: string): Promise<string | undefined> {
    try {
      // sync style is much faster than async
      return readFileSync(this.parsePath(path), 'utf-8')
    } catch (error) {
      if (_.isNotExistError(error) || _.isDirError(error)) {
        return undefined
      }
      throw error
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

    if (!options.overwrite && await _.exists(path)) {
      throw new Error(`"${path}" already exists`)
    }

    try {
      await fsp.writeFile(this.parsePath(path), data as string | Buffer)
    } catch (err) {
      if (_.isNotExistError(err)) {
        await fsp.mkdir(dirname(path), { recursive: true })
        await fsp.writeFile(path, data as string | Buffer)
      } else if (_.isDirError(err)) {
        throw new Error(`"${path}" exists a directory, cannot write`)
      } else {
        throw err
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
