import { parseJsonStringWithDate } from '../utils'
import type { CopyOptions, DirectoryManager, FileAttr, FindOptions, MoveOptions, PathType } from '../types'
import { UnsupportedError, buildDirectoryMap, copy, isDirectoryHandle, isFileHandle, isSupportFs, parseFilename } from './utils'
import type { WebFileMap } from './utils'

export async function createBrowserDirectoryManager(
  root: FileSystemDirectoryHandle,
  extensions?: string[] | RegExp,
): Promise<BrowserDirectoryManager> {
  if (!isSupportFs()) {
    throw new UnsupportedError()
  }
  return new BrowserDirectoryManager(root, await buildDirectoryMap(root, extensions))
}

export class BrowserDirectoryManager implements DirectoryManager<Uint8Array> {
  public constructor(
    private root: FileSystemDirectoryHandle,
    public map: WebFileMap,
  ) { }

  // todo))
  public async copy(from: string, to: string, options?: CopyOptions): Promise<void> {
    const stat = await this.exists(from)
    if (!stat) {
      throw new Error(`"${from}" not exists`)
    }
    stat === 'file'
      ? this.copyFile(this.map.get(from) as FileSystemFileHandle, to, options?.overwrite)
      : this.copyDir(from, to, options)
  }

  private async copyFile(from: FileSystemFileHandle, to: string, overwrite?: boolean): Promise<void> {
    if (overwrite && await this.exists(to)) {
      return
    }
    const { handle, name } = await this.getParentDirHandle(to)
    const targetHandle = await handle.getFileHandle(name, { create: true })
    await copy(from, targetHandle)
  }

  private async copyDir(from: string, to: string, options?: CopyOptions): Promise<void> {
    const files = await this.find(from, options?.match ? { match: options.match } : undefined)
    for (const p of files) {
      await this.copyFile(
        await this.getFileHandle(p),
        `${to}/${p.slice(from.length)}`,
        options?.overwrite,
      )
    }
  }

  public async exists(path: string): Promise<PathType> {
    if (!this.map.has(path)) {
      return false
    }
    if (!this.map.has(path)) {
      return false
    }
    const handle = this.map.get(path)!
    if (isFileHandle(handle)) {
      return 'file'
    } else if (isDirectoryHandle(handle)) {
      return 'dir'
    }
    return false
  }

  private async getFileHandle(path: string): Promise<FileSystemFileHandle> {
    if ((await this.exists(path)) !== 'file') {
      throw new Error(`"${path}" is not exist or is not a file`)
    }
    return this.map.get(path) as FileSystemFileHandle
  }

  private async checkDir(path: string): Promise<void> {
    if ((await this.exists(path)) !== 'dir') {
      throw new Error(`"${path}" not exists or is not a dir`)
    }
  }

  private parsePath(path: string) {
    const match = /\/([^/]+)\/?$/.exec(path)
    const dirPath = match ? path.slice(0, match.index) : path
    return {
      name: match?.[1] || path,
      dirPath,
    }
  }

  private async getParentDirHandle(path: string) {
    const sourceType = await this.exists(path)
    const { dirPath, name } = this.parsePath(path)
    let handle = this.map.get(dirPath)
    if (!handle) {
      await this.ensureDir(dirPath)
      handle = this.map.get(dirPath)
    }
    return {
      handle: handle as FileSystemDirectoryHandle,
      name,
      sourceType,
    }
  }

  public async find(path: string, options?: FindOptions): Promise<string[]> {
    await this.checkDir(path)
    const { match, recursive } = options || {}
    if (recursive) {
      return await Promise.all(Object.keys(this.map).filter(async p =>
        p.startsWith(path) && match?.(p, await this.exists(p) === 'file'),
      ))
    } else {
      const list: string[] = []
      const entries = (this.map.get(path) as FileSystemDirectoryHandle).entries()
      for await (const [p] of entries) {
        if (p.startsWith(path) && (!match || match(p, await this.exists(p) === 'file'))) {
          list.push(`${path}/${p}`)
        }
      }
      return list
    }
  }

  public async ensureDir(path: string): Promise<void> {
    const dirs = path.split('/').filter(Boolean)
    const base = dirs.shift()
    if (!base || base === '.') {
      throw new Error(`"${path}" can not be root`)
    }
    let currentHandle = await this.root.getDirectoryHandle(base)
    for (let i = 0, l = dirs.length; i < l; i++) {
      const handle = await currentHandle.getDirectoryHandle(dirs[i], { create: true })
      this.map.set(dirs.slice(0, i).join('/'), handle)
      currentHandle = handle
    }
  }

  // todo)) https://github.com/microsoft/vscode/blob/c05b49710b0fff24aa4380751e02b53c54e784ce/src/vs/platform/files/browser/htmlFileSystemProvider.ts#L260
  public async move(from: string, to: string, options?: MoveOptions): Promise<void> {
    const { overwrite, renameMode } = options || {}
    await this.copy(from, renameMode ? `${this.parsePath(to).dirPath}/${to}` : to, { overwrite })
    await this.remove(from)
  }

  public async parseDir(path = '/', cb?: (path: string, attr: FileAttr) => (FileAttr | undefined)): Promise<FileAttr[]> {
    await this.checkDir(path)
    const attrs = await Promise.all(Array.from(this.map.keys())
      .filter(p => p.startsWith(path))
      .map(async (p) => {
        const handle = this.map.get(p)!
        if (isFileHandle(handle)) {
          const attr = await this.parseFileAttr([p, handle])
          return cb?.(p, attr) || attr
        }
      }),
    )
    return attrs.filter((x): x is FileAttr => !!x)
  }

  public async parseFileAttr(path: string | [string, FileSystemFileHandle]): Promise<FileAttr> {
    const _path = typeof path === 'string' ? path : path[0]
    const handle = typeof path === 'string' ? await this.getFileHandle(path) : path[1]
    const { lastModified, size, name: basename } = await handle.getFile()

    return {
      ...parseFilename(basename),
      dir: _path.slice(0, basename.length * -1 - 1) || '/',
      modifiedTime: new Date(lastModified),
      size,
    }
  }

  public async read(path: string, type: 'buffer'): Promise<Uint8Array | undefined>
  public async read(path: string, type: 'text'): Promise<string | undefined>
  public async read<K = any>(path: string, type: 'json'): Promise<K | undefined>
  public async read(path: string, type: 'buffer' | 'text' | 'json') {
    const file = await (await this.getFileHandle(path)).getFile()
    switch (type) {
      case 'buffer':
        return new Uint8Array(await file.arrayBuffer())
      case 'text':
        return file.text()
      case 'json':
        return parseJsonStringWithDate(await file.text())
    }
  }

  public async remove(path: string): Promise<void> {
    const stat = await this.exists(path)
    if (!stat) {
      return
    }
    const { name, handle } = await this.getParentDirHandle(path)
    if (!handle) {
      return
    }
    await handle.removeEntry(name, stat === 'dir' ? { recursive: true } : undefined)
    this.map.delete(path)
  }

  public async write(
    path: string,
    data: string | object | ArrayBuffer | Blob,
    writeFn = JSON.stringify,
  ): Promise<void> {
    const { handle, name, sourceType } = await this.getParentDirHandle(path)
    if (sourceType === 'dir') {
      throw new Error(`"${path}" is dir`)
    }

    const targetHandle = await handle.getFileHandle(name, sourceType ? {} : { create: true })
    const writable = await targetHandle.createWritable()
    await writable.write(
      (data instanceof ArrayBuffer || typeof data === 'string')
        ? data
        : writeFn(data),
    )
    await writable.close()
    !sourceType && this.map.set(path, targetHandle)
  }
}
