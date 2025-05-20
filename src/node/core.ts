import type {
  FileAttr,
  IFS,
  ListState,
  MoveOptions,
  OverwriteOptions,
  PathType,
  ReadableStreamOptions,
  ReadStreamEvent,
} from '../types'

import EventEmitter from 'node:events'
import { readFileSync } from 'node:fs'
import fsp from 'node:fs/promises'

import { basename, dirname, extname, join, relative } from 'pathe'

import { FsErrorCode, toFsError } from '../error'
import * as _e from './error'
import { handleRestError } from './error'
import * as _ from './utils'

export class NodeFS implements IFS<string> {
  public constructor(
    /**
     * Absolute path to the root directory
     */
    public readonly root: string,
  ) { }

  private parsePath(p: string): string {
    return join(this.root!, p).replace(/\/$/, '')
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    try {
      path = this.parsePath(path)
      const stat = await fsp.stat(path)
      if (stat.isDirectory()) {
        return undefined
      }
      const ext = extname(path)
      return {
        dir: relative(this.root, dirname(path)),
        name: basename(path, ext),
        ext,
        size: stat.size,
        modifiedTime: stat.mtime,
      }
    } catch (error) {
      if (_e.isNotExistsError(error)) {
        return undefined
      }
      throw handleRestError(error, 'fileAttr', path)
    }
  }

  public async* list(path: string): AsyncIterable<ListState> {
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

  public readStream(
    path: string,
    options: ReadableStreamOptions = {},
  ): ReadStreamEvent {
    const ee = new EventEmitter<any>()
    _.readFileIntoStream(ee, this.parsePath(path), options)
    return ee
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

  public async appendFile(path: string, data: string | Uint8Array): Promise<void> {
    await fsp.appendFile(this.parsePath(path), data)
  }

  public async writeFile(path: string, data: string | Uint8Array, options: OverwriteOptions = {}): Promise<void> {
    path = this.parsePath(path)

    if (!options.overwrite && await _.exists(path)) {
      throw toFsError(
        FsErrorCode.AlreadyExists,
        'writeFile',
        `${path} already exists, cannot overwrite`,
        path,
      )
    }

    try {
      await fsp.writeFile(path, data)
    } catch (err) {
      if (_e.isNotExistsError(err)) {
        await fsp.mkdir(dirname(path), { recursive: true })
        await fsp.writeFile(path, data)
      } else if (_e.isDirError(err)) {
        throw toFsError(FsErrorCode.TypeMisMatch, 'writeFile', `${path} is a directory, cannot write`, path)
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
