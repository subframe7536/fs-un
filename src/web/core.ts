import type { FileAttr, IFS, ListState, MoveOptions, OverwriteOptions, PathType, ReadableStreamOptions, ReadStreamEvent, StreamEmitEvents } from '../types'
import { basename, dirname, extname, join, normalize } from 'pathe'
import { type Emitter, mitt } from 'zen-mitt'
import { FsErrorCode, toFsError } from '../error'
import * as _ from './utils'

export class WebFS implements IFS<FileSystemDirectoryHandle> {
  public constructor(
    public readonly root: FileSystemDirectoryHandle,
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
      throw toFsError(FsErrorCode.NotExists, 'list', `${path} does not exist`, path)
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
    options: ReadableStreamOptions = {},
  ): Promise<ReadStreamEvent> {
    const handle = await _.getHandleFromPath(this.root, 'readStream', path, { isFile: true })
    if (!handle) {
      throw toFsError(FsErrorCode.NotExists, 'readStream', `${path} does not exist`, path)
    }
    let emitter: Emitter<StreamEmitEvents> | null = mitt<StreamEmitEvents>()
    const file = await handle.getFile()
    let isAborted: true | undefined
    (async () => {
      try {
        const { length, position, signal } = options
        if (typeof length === 'number' && typeof position === 'number') {
          let buf = new Uint8Array(await file.arrayBuffer())
          if (position) {
            buf = buf.slice(position)
          }
          if (length) {
            buf = buf.slice(0, length)
          }
          emitter.emit('data', buf)
          emitter.emit('end')
        } else {
          for await (const chunk of _.streamRead(file.stream(), signal)) {
            emitter.emit('data', chunk)
          }
        }
      } catch (error) {
        if (error === _.ABORT) {
          isAborted = true
        } else {
          emitter.emit('error', _.toWebFsError(error, 'readStream', path))
        }
      } finally {
        emitter.emit('end', isAborted)
        emitter.off()
        emitter = null
      }
    })()
    return emitter
  }

  public async readText(path: string): Promise<string | undefined> {
    const handle = await _.getHandleFromPath(this.root, 'readText', path, { isFile: true })
    return handle ? await (await handle.getFile()).text() : undefined
  }

  public async mkdir(path: string): Promise<void> {
    const handle = await _.getParentDir(this.root, 'mkdir', path, true)
    try {
      await handle.getDirectoryHandle(basename(path), { create: true })
    } catch (error) {
      throw _.toWebFsError(error as DOMException, 'mkdir', path)
    }
  }

  public async appendFile(path: string, data: string | Uint8Array): Promise<void> {
    const handle = await _.getHandleFromPath(this.root, 'appendFile', path, { isFile: true })
    if (!handle) {
      throw toFsError(FsErrorCode.NotExists, 'appendFile', `${path} does not exist or is not a file`, path)
    }
    await _.writeFile(
      handle,
      typeof data === 'string'
        ? await (await handle.getFile()).text() + data
        : _.mergeUint8Arrays([
          new Uint8Array(await (await handle.getFile()).arrayBuffer()),
          data,
        ]),
    )
  }

  public async writeFile(
    path: string,
    data: string | Uint8Array,
    options: OverwriteOptions = {},
  ): Promise<void> {
    if (!options.overwrite && await _.exists(this.root, path)) {
      throw toFsError(
        FsErrorCode.AlreadyExists,
        'writeFile',
        `${path} already exists, cannot overwrite`,
        path,
      )
    }
    const targetHandle = await _.getHandleFromPath(
      this.root,
      'writeFile',
      path,
      { create: true, isFile: true, parent: true },
    )

    await _.writeFile(targetHandle, data)
  }

  public async move(from: string, to: string, options: MoveOptions = {}): Promise<void> {
    if (options.rename) {
      to = join(dirname(from), to)
    }
    if (normalize(from) === normalize(to)) {
      return
    }
    if (!options.overwrite && await _.exists(this.root, to)) {
      throw toFsError(FsErrorCode.AlreadyExists, 'move', `${to} already exists, cannot overwrite`, to)
    }
    const fromHandle = await _.exists(this.root, from)
    if (!fromHandle) {
      throw toFsError(FsErrorCode.NotExists, 'move', `${from} does not exist`, from)
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
      throw toFsError(FsErrorCode.NotExists, fnName, `${from} does not exist`, from)
    }

    if (!options.overwrite && await _.exists(this.root, to)) {
      throw toFsError(FsErrorCode.AlreadyExists, fnName, `${to} already exists, cannot overwrite`, to)
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
