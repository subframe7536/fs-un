import { basename, dirname } from 'pathe'
import type { PathType } from '../types'

export function isSupportFs() {
  return typeof globalThis.showDirectoryPicker === 'function'
}
export interface RootHandleOption {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

export async function getUserDir(options?: RootHandleOption) {
  return await globalThis.showDirectoryPicker(options)
}

export async function getOpfsDir() {
  return await navigator.storage.getDirectory()
}

export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file'
}

export function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

export async function getParentDir(root: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemDirectoryHandle | undefined> {
  let hasPermissions = await root.queryPermission() === 'granted'

  try {
    if (!hasPermissions) {
      hasPermissions = await root.requestPermission() === 'granted'
    }
  } catch { }

  if (!hasPermissions) {
    throw new Error('no permission')
  }

  try {
    let handle = root
    const pathItems = dirname(path).split('/').filter(p => p && p !== '.')
    for (const name of pathItems) {
      handle = await handle.getDirectoryHandle(name, { create })
    }
    return handle
  } catch {
    return undefined
  }
}
type GetHandleFromPathOptionsBasic = {
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
  create?: boolean | 1
}
type GetHandleFromPathOptions = GetHandleFromPathOptionsBasic & { isFile?: undefined }
type GetFileHandleFromPathOptions = GetHandleFromPathOptionsBasic & { isFile: true }
type GetDirectoryHandleFromPathOptions = GetHandleFromPathOptionsBasic & { isFile: false }

/**
 * try to get directory handle from path first, then try to get file handle
 *
 * `options.create` is no effect when value is `boolean`, but when is set to `1`, it will create
 */
export async function getHandleFromPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options?: GetHandleFromPathOptions,
): Promise<FileSystemHandle | undefined>
/**
 * try to get file handle from path
 *
 * when `options.create` is set to `1`, it will handle `TypeMismatchError`
 */
export async function getHandleFromPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options?: GetFileHandleFromPathOptions,
): Promise<FileSystemFileHandle | undefined>
/**
 * try to get directory handle from path
 *
 * when `options.create` is set to `1`, it will handle `TypeMismatchError`
 */
export async function getHandleFromPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options?: GetDirectoryHandleFromPathOptions,
): Promise<FileSystemDirectoryHandle | undefined>
export async function getHandleFromPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options: GetHandleFromPathOptionsBasic & { isFile?: boolean } = {},
): Promise<any> {
  const { create = false, isFile, parent = false } = options
  const parentHandle = await getParentDir(root, path, parent)
  if (!parentHandle) {
    return undefined
  }
  const name = basename(path)
  const fn = isFile ? 'getFileHandle' : 'getDirectoryHandle'
  try {
    if (typeof isFile === 'boolean') {
      return await parentHandle[fn](name, { create: !!create })
    }
  } catch (err) {
    if ((err as Error).name === 'TypeMismatchError' && create === 1) {
      await parentHandle.removeEntry(name, { recursive: true })
      return await parentHandle[fn](name, { create: true })
    }
    return undefined
  }
  try {
    return await parentHandle.getDirectoryHandle(name, { create: !!create })
  } catch {
    try {
      return await parentHandle.getFileHandle(name, { create: !!create })
    } catch (err) {
      return undefined
    }
  }
}

/**
 * get file handle from path and check exists
 */
export async function exists(root: FileSystemDirectoryHandle, path: string | FileSystemHandle): Promise<FileSystemHandle | undefined> {
  const handle = typeof path === 'string' ? await getHandleFromPath(root, path) : path
  if (!handle) {
    return undefined
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
      _exists && await handle.removeEntry('_CHECK')
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

export async function copyDirectory(source: FileSystemDirectoryHandle, destination: FileSystemDirectoryHandle) {
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
    await Promise.all(task)
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
export async function builtinMove(from: FileSystemFileHandle, ...args: any) {
  if ('move' in from) {
    await (from.move as any)(...args)
    return true
  }
  return false
}
