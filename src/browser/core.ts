import { basename, dirname, extname, normalize } from 'pathe'
import type { DirectoryManager, FileAttr, ListState, OverwriteOptions, PathType } from '../types'
import * as _ from './utils'

export class BrowserDirectoryManager implements DirectoryManager {
  public constructor(
    private root: FileSystemDirectoryHandle,
  ) { }

  // todo))
  private async getHandle(path: string): Promise<FileSystemHandle | undefined> {
    const pathItems = normalize(path).split('/').filter(Boolean)
    return undefined
  }

  private async getFileHandle(path: string): Promise<FileSystemFileHandle | undefined> {
    const handle = await this.getHandle(path)
    return (handle && _.isFileHandle(handle)) ? handle : undefined
  }

  private async getDirectoryHandle(path: string): Promise<FileSystemDirectoryHandle | undefined> {
    const handle = await this.getHandle(path)
    return (handle && _.isDirectoryHandle(handle)) ? handle : undefined
  }

  private async getParentHandle(path: string): Promise<FileSystemDirectoryHandle | undefined> {
    return await this.getDirectoryHandle(dirname(path))
  }

  public async exists(path: string): Promise<PathType> {
    const handle = await this.getHandle(path)
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

  public async mkdir(path: string): Promise<string | undefined> {
    return (await _.mkdir(this.root, path))?.name
  }

  public async writeFile(path: string, data: string | ArrayBuffer | ArrayBufferView): Promise<void> {
    let handle = await this.getFileHandle(path)
    if (!handle) {
      const parent = await _.mkdir(this.root, dirname(path))
      if (!parent) {
        return
      }
      handle = await parent.getFileHandle(basename(path), { create: true })
    }
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
  }

  public async copy(from: string, to: string, options?: OverwriteOptions): Promise<void> {
  }

  public async remove(path: string): Promise<void> {
    const parent = await this.getParentHandle(path)
    await parent?.removeEntry(basename(path), { recursive: true })
  }
}
