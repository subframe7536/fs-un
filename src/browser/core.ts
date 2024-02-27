import { basename, dirname, extname, join, normalize } from 'pathe'
import type { AnyFunction } from '@subframe7536/type-utils'
import type { DirectoryManager, FileAttr, ListState, MoveOptions, OverwriteOptions, PathType } from '../types'
import * as _ from './utils'
import { walk } from './walk'

export class BrowserDirectoryManager implements DirectoryManager {
  public constructor(
    private root: FileSystemDirectoryHandle,
  ) { }

  private createError(path: string, msg: string, method: string) {
    return new Error(`Error in ${method}: ${msg}, ${normalize(path)}`)
  }

  private async getFileHandle(path: string): Promise<FileSystemFileHandle | undefined> {
    const handle = await _.getHandleFromPath(this.root, path)
    return (handle && _.isFileHandle(handle)) ? handle : undefined
  }

  private async getDirectoryHandle(path: string, ensureDir?: false): Promise<FileSystemDirectoryHandle | undefined>
  private async getDirectoryHandle(path: string, ensureDir: true): Promise<FileSystemDirectoryHandle>
  private async getDirectoryHandle(path: string, ensureDir = false): Promise<FileSystemDirectoryHandle | undefined> {
    const handle = await _.getHandleFromPath(this.root, path)
    return (handle && _.isDirectoryHandle(handle)) ? handle : ensureDir ? await _.mkdir(this.root, path) : undefined
  }

  private async getParentHandle(path: string): Promise<FileSystemDirectoryHandle | undefined> {
    return await this.getDirectoryHandle(dirname(path))
  }

  public async exists(path: string | FileSystemHandle): Promise<PathType> {
    const handle = typeof path === 'string' ? await _.getHandleFromPath(this.root, path) : path
    if (!handle) {
      return false
    }
    if (_.isFileHandle(handle)) {
      try {
        await handle.getFile()
        return 'file'
      } catch (ignore) {
        return false
      }
    } else if (_.isDirectoryHandle(handle)) {
      let dirResult: boolean | 'dir' = 'dir'
      try {
        await handle.getFileHandle('_CHECK', { create: true })
      } catch (ignore) {
        dirResult = false
      } finally {
        dirResult === 'dir' && await handle.removeEntry('_CHECK')
      }
      return dirResult
    }
    return false
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    const handle = await this.getFileHandle(path)
    if (!handle) {
      return undefined
    }
    const { lastModified, size, name } = await handle.getFile()
    const extName = extname(name)

    return {
      ext: extName,
      name: basename(name, extName),
      dir: dirname(path),
      modifiedTime: new Date(lastModified),
      size,
    }
  }

  public async *list(path: string): AsyncIterable<ListState> {
    const handle = await this.getDirectoryHandle(path)
    if (!handle) {
      return
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

  public async readBytes(path: string): Promise<Uint8Array | undefined> {
    const handle = await this.getFileHandle(path)
    return handle ? new Uint8Array(await (await handle.getFile()).arrayBuffer()) : undefined
  }

  public async readText(path: string): Promise<string | undefined> {
    const handle = await this.getFileHandle(path)
    return handle ? await (await handle.getFile()).text() : undefined
  }

  public async mkdir(path: string): Promise<void> {
    await _.mkdir(this.root, path)
  }

  public async writeFile(path: string | FileSystemFileHandle, data: string | ArrayBuffer | ArrayBufferView, options: OverwriteOptions = {}): Promise<void> {
    let handle = typeof path === 'string' ? await this.getFileHandle(path) : path
    if (handle && !options.overwrite) {
      throw new Error(`"${path}" already exists`)
    } else if (!handle) {
      const parent = await _.mkdir(this.root, dirname(path as string))
      if (!parent) {
        throw new Error(`cannot create directory for "${path}"`)
      }
      handle = await parent.getFileHandle(basename(path as string), { create: true })
      if (!handle) {
        throw new Error(`cannot create file "${path}"`)
      }
    }
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
    const fromHandle = await _.getHandleFromPath(this.root, from)
    if (!fromHandle) {
      return
    }

    if (options.renameMode) {
      to = join(dirname(from), to)
    }

    if (from === to) {
      return
    }

    if (_.isFileHandle(fromHandle)) {
      const toParent = await this.getDirectoryHandle(dirname(to), true)
      const toHandle = await toParent.getFileHandle(basename(to), { create: true })
      await this.writeFile(toHandle, await (await fromHandle.getFile()).arrayBuffer(), options)
      'remove' in fromHandle
        ? await (fromHandle.remove as AnyFunction<Promise<void>>)()
        : await this.remove(from)
    } else if (_.isDirectoryHandle(fromHandle)) {
      await walk<void>(fromHandle, {
        includeDirs: true,
        withRootPath: true,
        transform: async (p, handle) => {
          const toParent = await this.getDirectoryHandle(dirname(p), true)
          if (_.isFileHandle(handle)) {
            const toHandle = await toParent.getFileHandle(basename(p), { create: true })
            await this.writeFile(toHandle, await (await handle.getFile()).arrayBuffer(), options)
          } else if (_.isDirectoryHandle(handle)) {
            await toParent.getDirectoryHandle(handle.name, { create: true })
          }
        },
      })
      'remove' in fromHandle
        ? await (fromHandle.remove as AnyFunction<Promise<void>>)()
        : await this.remove(from)
    }
  }

  public async copy(from: string, to: string, options: OverwriteOptions = {}): Promise<void> {
    const fromHandle = await _.getHandleFromPath(this.root, from)
    if (!fromHandle) {
      return
    }
    const toParent = await _.getParentDir(this.root, to, true)
    if (!toParent) {
      throw new Error(`cannot create directory for "${to}"`)
    }
    const toName = basename(to)
    if (_.isFileHandle(fromHandle)) {
      const toHandle = await toParent.getFileHandle(toName)
      if (!options.overwrite && toHandle) {
        throw new Error(`"${to}" already exists`)
      }
      await _.copyFile(fromHandle, toHandle || await toParent.getFileHandle(toName, { create: true }))
    } else if (_.isDirectoryHandle(fromHandle)) {
      await walk<void>(fromHandle, {
        includeDirs: true,
        withRootPath: true,
        transform: async (p, handle) => {
          if (_.isFileHandle(handle)) {
            const toHandle = await toParent.getFileHandle(basename(p), { create: true })
            await _.copyFile(handle, toHandle)
          } else if (_.isDirectoryHandle(handle)) {
            await toParent.getDirectoryHandle(handle.name, { create: true })
          }
        },
      })
    }
  }

  public async remove(path: string): Promise<void> {
    const parent = await this.getParentHandle(path)
    await parent?.removeEntry(basename(path), { recursive: true })
  }
}
