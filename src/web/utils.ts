import type { DirectoryRelationType, StreamEmitEvents } from '../types'
import { basename, dirname } from 'pathe'
import { type Emitter, mitt } from 'zen-mitt'
import { type FsError, FsErrorCode, toFsError } from '../error'
import { HIGH_WATER_MARK } from '../utils'

export interface RootHandleOption {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

export function isSupportUserRoot(): boolean {
  return typeof globalThis.showDirectoryPicker === 'function'
}

export async function getUserRoot(options?: RootHandleOption): Promise<FileSystemDirectoryHandle> {
  return await globalThis.showDirectoryPicker(options)
}

export function isSupportOpfsRoot(): boolean {
  return typeof navigator.storage?.getDirectory === 'function'
}

export async function getOpfsRoot(): Promise<FileSystemDirectoryHandle> {
  return await navigator.storage.getDirectory()
}

export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file'
}

export function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

/**
 * Get the parent directory handle or throw error
 */
export async function getParentDir(
  root: FileSystemDirectoryHandle,
  fnName: string,
  path: string,
  create: boolean,
): Promise<FileSystemDirectoryHandle> {
  let hasPermissions
  try {
    hasPermissions = await root.queryPermission() === 'granted'
    if (!hasPermissions) {
      hasPermissions = await root.requestPermission() === 'granted'
    }
  } catch { }

  // if (!hasPermissions) {
  //   throw toFsError(FsErrorCode.NoPermission, fnName, 'cannot get root directory', path)
  // }

  let handle = root
  const pathItems = dirname(path).split('/').filter(p => p && p !== '.')
  for (let i = 0; i < pathItems.length; i++) {
    const name = pathItems[i]
    try {
      handle = await handle.getDirectoryHandle(name, { create })
    } catch (err) {
      const dir = pathItems.slice(0, i + 1).join('/')
      throw toWebFsError(err, fnName, dir, path)
    }
  }
  return handle
}
type GetHandleFromPathOptionsBasic<T extends boolean | undefined | 1> = {
  /**
   * whether to create parent directory
   */
  parent?: boolean
  /**
   * whether to create file, will not effect when `isFile` is `undefined`
   *
   * if the value is `1`, it will handle `TypeMismatchError` to make sure the file type,
   * and create if `isFile` is `undefined`
   */
  create?: T
}

export function toWebFsError(err: unknown, fnName: string, dir: string, originalPath?: string): FsError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotFoundError':
        return toFsError(FsErrorCode.NotExists, fnName, `${dir} does not exist`, dir)
      case 'TypeMismatchError':
        return toFsError(
          FsErrorCode.TypeMisMatch,
          fnName,
          `${dir} exists a file, cannot get parent directory`,
          dir,
        )
    }
  }
  return toFsError(FsErrorCode.Unknown, fnName, `Unknown error, ${JSON.stringify(err)}`, originalPath || dir)
}

/**
 * try to get directory handle from path first, then try to get file handle
 *
 * `options.create` is no effect when value is `boolean`, but when is set to `1`, it will create
 */
export async function getHandleFromPath<T extends boolean | undefined | 1 = undefined>(
  root: FileSystemDirectoryHandle,
  fn: string,
  path: string,
  options?: GetHandleFromPathOptionsBasic<T>,
): Promise<T extends (true | 1) ? FileSystemHandle : FileSystemHandle | undefined>
/**
 * try to get file handle from path
 *
 * when `options.create` is set to `1`, it will handle `TypeMismatchError`
 */
export async function getHandleFromPath<T extends boolean | undefined | 1 = undefined>(
  root: FileSystemDirectoryHandle,
  fn: string,
  path: string,
  options?: GetHandleFromPathOptionsBasic<T> & { isFile: true },
): Promise<T extends (true | 1) ? FileSystemFileHandle : FileSystemFileHandle | undefined>
/**
 * try to get directory handle from path
 *
 * when `options.create` is set to `1`, it will handle `TypeMismatchError`
 */
export async function getHandleFromPath<T extends boolean | undefined | 1 = undefined>(
  root: FileSystemDirectoryHandle,
  fn: string,
  path: string,
  options?: GetHandleFromPathOptionsBasic<T> & { isFile: false },
): Promise<T extends (true | 1) ? FileSystemDirectoryHandle : FileSystemDirectoryHandle | undefined>
export async function getHandleFromPath<T extends boolean | undefined | 1 = undefined>(
  root: FileSystemDirectoryHandle,
  fn: string,
  path: string,
  options: GetHandleFromPathOptionsBasic<T> & { isFile?: boolean } = {},
): Promise<any> {
  const { create = false, isFile, parent = false } = options

  let parentHandle
  try {
    parentHandle = await getParentDir(root, fn, path, parent)
  } catch (err) {
    if (!create) {
      return undefined
    } else {
      throw err
    }
  }
  const name = basename(path)
  const getter = isFile ? 'getFileHandle' : 'getDirectoryHandle'
  try {
    if (typeof isFile === 'boolean') {
      return await parentHandle[getter](name, { create: !!create })
    }
  } catch (err) {
    if (!create) {
      return undefined
    }
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotFoundError':
          return undefined
        case 'TypeMismatchError':
          if (create === 1) {
            await parentHandle.removeEntry(name, { recursive: true })
            return await parentHandle[getter](name, { create: true })
          } else {
            return undefined
          }
      }
    }
    throw toFsError(FsErrorCode.Unknown, fn, `Unknown error, ${JSON.stringify(err)}`, path)
  }
  try {
    return await parentHandle.getDirectoryHandle(name, { create: !!create })
  } catch {
    try {
      return await parentHandle.getFileHandle(name, { create: !!create })
    } catch (err) {
      if (!create) {
        return undefined
      }
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        throw toFsError(FsErrorCode.NotExists, fn, `${path} does not exist`, path)
      }
      throw toFsError(FsErrorCode.Unknown, fn, `unknown error, ${JSON.stringify(err)}`, path)
    }
  }
}

/**
 * get file handle from path and check exists
 */
export async function exists(root: FileSystemDirectoryHandle, path: string | FileSystemHandle): Promise<FileSystemHandle | undefined> {
  let handle = path as FileSystemHandle
  if (typeof path === 'string') {
    let parent
    try {
      parent = await getParentDir(root, 'exists', path, false)
    } catch {
      return undefined
    }
    const name = basename(path)
    try {
      handle = await parent.getDirectoryHandle(name)
    } catch {
      try {
        handle = await parent.getFileHandle(name)
      } catch {
        return undefined
      }
    }
  }

  if (isFileHandle(handle)) {
    try {
      await handle.getFile()
      return handle
    } catch {
      return undefined
    }
  } else if (isDirectoryHandle(handle)) {
    let _exists = true
    try {
      await handle.getFileHandle('_CHECK', { create: true })
    } catch {
      _exists = false
    } finally {
      if (_exists) {
        await handle.removeEntry('_CHECK')
      }
    }
    return handle
  }
  return undefined
}

type CopyFn = (file: File, writable: FileSystemWritableFileStream) => Promise<void>

/**
 * just copy file content
 */
const defaultCopyFn: CopyFn = async (file, writable) => await file.stream().pipeTo(writable)

/**
 * copy file with progress callback for {@link copyFile}
 */
export function createCallbackCopyFn(onCopy: (copied: number, total: number) => void): CopyFn {
  return async (file, writable) => {
    const reader = file.stream().getReader()
    let copiedBytes = 0
    let done, value
    // eslint-disable-next-line no-cond-assign
    while (({ done, value } = await reader.read()), !done) {
      await writable.write(value!)
      copiedBytes += value!.length
      onCopy(copiedBytes, file.size)
    }
    await writable.close()
  }
}

/**
 * copy file
 * @param from from file handle
 * @param to to file handle
 * @param copyFn custom copy function, default is {@link defaultCopyFn}, you can use {@link createCallbackCopyFn}
 */
export async function copyFile(
  from: FileSystemFileHandle,
  to: FileSystemFileHandle,
  copyFn: CopyFn = defaultCopyFn,
): Promise<void> {
  const file = await from.getFile()
  const writable = await to.createWritable()
  await copyFn(file, writable)
}

export async function copyDirectory(
  source: FileSystemDirectoryHandle,
  destination: FileSystemDirectoryHandle,
): Promise<void> {
  const stack = [[source, destination]]

  while (stack.length > 0) {
    const [source, destination] = stack.pop()!
    const task = []
    for await (const entry of source.values()) {
      if (isDirectoryHandle(entry)) {
        const newDirectory = await destination.getDirectoryHandle(entry.name, { create: true })
        stack.push([entry, newDirectory])
      } else {
        task.push(copyFile(entry, await destination.getFileHandle(entry.name, { create: true })))
      }
    }
    while (task.length) {
      await Promise.all(task.splice(0, 8))
    }
  }
}

export async function builtinMove(
  from: FileSystemFileHandle,
  targetFileName: string
): Promise<boolean>
export async function builtinMove(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle
): Promise<boolean>
export async function builtinMove(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle,
  targetFileName: string
): Promise<boolean>
export async function builtinMove(from: FileSystemFileHandle, ...args: any): Promise<boolean> {
  if ('move' in from) {
    await (from.move as any)(...args)
    return true
  }
  return false
}

export async function copy(
  fromHandle: FileSystemHandle,
  root: FileSystemDirectoryHandle,
  to: string,
  fn: string,
): Promise<void> {
  if (isFileHandle(fromHandle)) {
    const toHandle = await getHandleFromPath(root, fn, to, { isFile: true, create: 1, parent: true })
    await copyFile(fromHandle, toHandle)
  } else if (isDirectoryHandle(fromHandle)) {
    const toHandle = await getHandleFromPath(root, fn, to, { isFile: false, create: 1, parent: true })
    await copyDirectory(fromHandle, toHandle)
  }
}

export async function getDirectoryHandleRelation(
  sourceHandle: FileSystemDirectoryHandle,
  targetHandle: FileSystemDirectoryHandle,
): Promise<DirectoryRelationType> {
  if (await sourceHandle.isSameEntry(targetHandle) && sourceHandle.name === targetHandle.name) {
    return 'same'
  }

  if (await targetHandle.resolve(sourceHandle)) {
    return 'child'
  }

  if (await sourceHandle.resolve(targetHandle)) {
    return 'parent'
  }

  return 'diff'
}

export async function writeFile(
  handle: FileSystemFileHandle,
  data: string | Uint8Array,
): Promise<void> {
  const writable = await handle.createWritable()
  try {
    await writable.write(data)
  } catch {
  } finally {
    await writable.close()
  }
}

export function mergeUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let totalLength = arrays.reduce((acc, array) => acc + array.length, 0)
  let result = new Uint8Array(totalLength)

  let offset = 0
  for (let array of arrays) {
    result.set(array, offset)
    offset += array.length
  }

  return result
}
export const ABORT = '$abort$'
export async function* streamRead(
  stream: ReadableStream,
  signal?: AbortSignal,
  chunkSize: number = HIGH_WATER_MARK,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader()
  let buffer = new Uint8Array(0)

  try {
    while (true) {
      if (signal?.aborted) {
        throw ABORT
      }
      const { done, value } = await reader.read()

      if (done) {
        if (buffer.length > 0) {
          yield buffer
        }
        break
      }

      buffer = new Uint8Array([...buffer, ...value])

      while (buffer.length >= chunkSize) {
        yield buffer.slice(0, chunkSize)
        buffer = buffer.slice(chunkSize)
      }
    }
  } finally {
    reader.releaseLock()
  }
}
