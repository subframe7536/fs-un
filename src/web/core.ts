import type { FileAttr, IFS, ListState, MoveOptions, OverwriteOptions, PathType, ReadStreamEvent, ReadStreamOptions } from '../types'
import { basename, dirname, extname, join, normalize } from 'pathe'
import { FsErrorCode, toFsError } from '../error'
import * as _ from './utils'

export class WebFS implements IFS {
  public constructor(
    public root: FileSystemDirectoryHandle,
  ) { }

  public async exists(path: string | FileSystemHandle): Promise<PathType> {
    const handle = await _.exists(this.root, path)
    if (!handle) {
      return false
    }
    return _.isFileHandle(handle) ? 'file' : 'dir'
  }

  public async fileAttr(path: string): Promise<FileAttr | undefined> {
    const handle = await _.getHandleFromPath(this.root, 'fileAttr', path, { isFile: true })
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
    const handle = await _.getHandleFromPath(this.root, 'list', path, { isFile: false })
    if (!handle) {
      throw toFsError(FsErrorCode.NotExists, 'list', `"${path}" does not exist`, path)
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
    const handle = await _.getHandleFromPath(this.root, 'readByte', path, { isFile: true })
    return handle ? new Uint8Array(await (await handle.getFile()).arrayBuffer()) : undefined
  }

  public async readStream(
    path: string,
    listener: ReadStreamEvent,
    options: ReadStreamOptions = {},
  ): Promise<void> {
    const handle = await _.getHandleFromPath(this.root, 'readStream', path, { isFile: true })
    if (!handle) {
      await listener.error?.(toFsError(FsErrorCode.NotExists, 'readStream', `"${path}" does not exist`, path))
      return
    }
    (async () => {
      const { length, position = 0, signal } = options
      try {
        const file = await handle.getFile()

        const reader = file.slice(position, length ? position + length - 1 : undefined).stream().getReader()
        let res = await reader.read()

        while (!res.done) {
          if (signal?.aborted) {
            break
          }

          await listener.data?.(res.value)

          if (signal?.aborted) {
            break
          }

          res = await reader.read()
        }
        await listener.end?.()
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        await listener.error?.(toFsError(FsErrorCode.Unknown, 'readStream', msg, path))
      }
    })()
  }

  public async readText(path: string): Promise<string | undefined> {
    const handle = await _.getHandleFromPath(this.root, 'readText', path, { isFile: true })
    return handle ? await (await handle.getFile()).text() : undefined
  }

  public async mkdir(path: string): Promise<void> {
    const handle = await _.getParentDir(this.root, 'mkdir', path, true)
    await handle.getDirectoryHandle(basename(path), { create: true })
  }

  public async writeFile(
    path: string,
    data: string | ArrayBuffer | ArrayBufferView,
    options: OverwriteOptions = {},
  ): Promise<void> {
    if (!options.overwrite && await _.exists(this.root, path)) {
      throw toFsError(
        FsErrorCode.AlreadyExists,
        'writeFile',
        `"${path}" already exists, cannot overwrite`,
        path,
      )
    }
    const targetHandle = await _.getHandleFromPath(
      this.root,
      'writeFile',
      path,
      { create: true, isFile: true, parent: true },
    )

    const writable = await targetHandle.createWritable()
    await writable.write(data)
    await writable.close()
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
    if (options.rename) {
      to = join(dirname(from), to)
    }
    if (normalize(from) === normalize(to)) {
      return
    }
    if (!options.overwrite && await _.exists(this.root, to)) {
      throw toFsError(FsErrorCode.AlreadyExists, 'move', `"${to}" already exists, cannot overwrite`, to)
    }
    const fromHandle = await _.exists(this.root, from)
    if (!fromHandle) {
      throw toFsError(FsErrorCode.NotExists, 'move', `"${from}" does not exist`, from)
    }
    await _.copy(fromHandle, this.root, to, 'move.copy')
    if ('remove' in fromHandle) {
      // @ts-expect-error support remove()
      await fromHandle.remove({ recursive: true })
      return
    }
    await this.remove(from, 'move.remove')
  }

  public async copy(from: string, to: string, options: OverwriteOptions = {}, fnName = 'copy'): Promise<void> {
    if (normalize(from) === normalize(to)) {
      return
    }
    const fromHandle = await _.exists(this.root, from)
    if (!fromHandle) {
      throw toFsError(FsErrorCode.NotExists, fnName, `"${from}" does not exist`, from)
    }

    if (!options.overwrite && await _.exists(this.root, to)) {
      throw toFsError(FsErrorCode.AlreadyExists, fnName, `"${to}" already exists, cannot overwrite`, to)
    }

    await _.copy(fromHandle, this.root, to, fnName)
  }

  public async remove(path: string, fnName = 'remove'): Promise<void> {
    const parent = await _.getParentDir(this.root, fnName, path, false)
    const base = basename(path)
    if ('remove' in parent) {
      const target = await _.getHandleFromPath(parent, fnName, base)
      if (target) {
        // @ts-expect-error support remove()
        await target.remove({ recursive: true })
      }
      return
    }

    try {
      await parent.removeEntry(base, { recursive: true })
    } catch (error) {
      throw toFsError(FsErrorCode.Unknown, fnName, (error as any).toString(), path)
    }
  }
}
// only handle TypeError, others have no effect
// see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle/removeEntry#exceptions
