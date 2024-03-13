import { basename, dirname, extname, join, normalize } from 'pathe'
import type { AnyFunction } from '@subframe7536/type-utils'
import type { DirectoryManager, FileAttr, ListState, MoveOptions, OverwriteOptions, PathType } from '../types'
import * as _ from './utils'
import { walk } from './walk'

export class BrowserDirectoryManager implements DirectoryManager {
  public constructor(
    private root: FileSystemDirectoryHandle,
  ) {
    console.log(root.name)
  }

  public async exists(path: string | FileSystemHandle): Promise<PathType> {
    const handle = await _.exists(this.root, path)
    if (!handle) {
      return false
    }
    return _.isFileHandle(handle) ? 'file' : 'dir'
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    const handle = await _.getHandleFromPath(this.root, path, { isFile: true })
    if (!handle) {
      return undefined
    }
    const file = await handle.getFile()
    const extName = extname(file.name)

    return {
      ext: extName,
      name: basename(file.name, extName),
      dir: dirname(path),
      modifiedTime: new Date(file.lastModified),
      size: file.size,
    }
  }

  public async *list(path: string): AsyncIterable<ListState> {
    const handle = await _.getHandleFromPath(this.root, path, { isFile: false })
    if (!handle) {
      throw new Error('no such dir')
    }
    for await (const entry of handle.values()) {
      yield {
        name: entry.name,
        isFile: _.isFileHandle(entry),
        isDirectory: _.isDirectoryHandle(entry),
        isSymlink: false,
      }
    }
  }

  public async readByte(path: string): Promise<Uint8Array | undefined> {
    const handle = await _.getHandleFromPath(this.root, path, { isFile: true })
    return handle ? new Uint8Array(await (await handle.getFile()).arrayBuffer()) : undefined
  }

  public async readText(path: string): Promise<string | undefined> {
    const handle = await _.getHandleFromPath(this.root, path, { isFile: true })
    return handle ? await (await handle.getFile()).text() : undefined
  }

  public async mkdir(path: string): Promise<void> {
    const result = await _.getHandleFromPath(this.root, path, { create: 1, parent: true })
    if (!result) {
      throw new Error(`cannot create dir "${path}"`)
    }
  }

  public async writeFile(
    path: string | FileSystemFileHandle,
    data: string | ArrayBuffer | ArrayBufferView,
    options: OverwriteOptions = {},
  ): Promise<void> {
    if (!options.overwrite && await _.exists(this.root, path)) {
      throw new Error(`"${path}" already exists`)
    }
    const targetHandle = typeof path === 'string'
      ? await _.getHandleFromPath(this.root, path, { create: true, isFile: true })
      : path

    if (!targetHandle) {
      throw new Error(`cannot create file "${path}"`)
    }

    const writable = await targetHandle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
    if (options.rename) {
      to = join(dirname(from), to)
    }
    await this.copy(from, to, options)
    await this.remove(from)
  }

  public async copy(from: string, to: string, options: OverwriteOptions = {}): Promise<void> {
    if (normalize(from) === normalize(to)) {
      return
    }
    const fromHandle = await _.exists(this.root, from)
    if (!fromHandle) {
      throw new Error(`"${from}" does not exist`)
    }

    if (!options.overwrite && await _.exists(this.root, to)) {
      throw new Error(`"${to}" already exists`)
    }

    if (_.isFileHandle(fromHandle)) {
      const toHandle = await _.getHandleFromPath(this.root, to, { isFile: true, create: 1, parent: true })
      if (!toHandle) {
        throw new Error(`cannot create file "${to}"`)
      }
      await _.copyFile(fromHandle, toHandle)
    } else if (_.isDirectoryHandle(fromHandle)) {
      const toHandle = await _.getHandleFromPath(this.root, to, { isFile: false, create: 1, parent: true })
      if (!toHandle) {
        throw new Error(`cannot create directory "${to}"`)
      }
      await _.copyDirectory(fromHandle, toHandle)
    }
  }

  public async remove(path: string): Promise<void> {
    const parent = await _.getParentDir(this.root, path, false)
    try {
      await parent?.removeEntry(basename(path), { recursive: true })
    } catch (error) {
      // only handle TypeError, others have no effect
      // see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry#exceptions
      if (error instanceof TypeError) {
        throw error
      }
    }
  }
}
