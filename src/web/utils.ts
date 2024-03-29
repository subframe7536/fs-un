import { basename, dirname } from 'pathe'
import { FsErrorCode, toFsError } from '../error'
import { DirectoryRelationType } from '../utils'

export interface RootHandleOption {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

export function isSupportUserRoot() {
  return typeof globalThis.showDirectoryPicker === 'function'
}

export async function getUserRoot(options?: RootHandleOption): Promise<FileSystemDirectoryHandle> {
  return await globalThis.showDirectoryPicker(options)
}

export function isSupportOpfsRoot() {
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

export async function getParentDir(root: FileSystemDirectoryHandle, fn: string, path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  let hasPermissions = await root.queryPermission() === 'granted'

  try {
    if (!hasPermissions) {
      hasPermissions = await root.requestPermission() === 'granted'
    }
  } catch { }

  if (!hasPermissions) {
    throw toFsError(FsErrorCode.NoPermission, fn, 'cannot get root directory', path)
  }

  let handle = root
  const pathItems = dirname(path).split('/').filter(p => p && p !== '.')
  for (let i = 0; i < pathItems.length; i++) {
    const name = pathItems[i]
    try {
      handle = await handle.getDirectoryHandle(name, { create })
    } catch (err) {
      const _path = pathItems.slice(0, i + 1).join('/')
      if (err instanceof DOMException) {
        switch (err.name) {
          case 'NotFoundError':
            throw toFsError(FsErrorCode.NotExists, fn, `"${_path}" does not exist`, _path)
          case 'TypeMismatchError':
            throw toFsError(
              FsErrorCode.TypeMisMatch,
              fn,
              `"${_path}" exists a file, cannot get parent directory`,
              _path,
            )
        }
      }
      throw toFsError(FsErrorCode.Unknown, fn, `unknown error, ${JSON.stringify(err)}`, path)
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
type GetHandleFromPathOptions<T extends boolean | undefined | 1> = GetHandleFromPathOptionsBasic<T> & { isFile?: undefined }
type GetFileHandleFromPathOptions<T extends boolean | undefined | 1> = GetHandleFromPathOptionsBasic<T> & { isFile: true }
type GetDirectoryHandleFromPathOptions<T extends boolean | undefined | 1> = GetHandleFromPathOptionsBasic<T> & { isFile: false }

/**
 * try to get directory handle from path first, then try to get file handle
 *
 * `options.create` is no effect when value is `boolean`, but when is set to `1`, it will create
 */
export async function getHandleFromPath<T extends boolean | undefined | 1 = undefined>(
  root: FileSystemDirectoryHandle,
  fn: string,
  path: string,
  options?: GetHandleFromPathOptions<T>,
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
  options?: GetFileHandleFromPathOptions<T>,
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
  options?: GetDirectoryHandleFromPathOptions<T>,
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
          throw toFsError(FsErrorCode.NotExists, fn, `"${path}" does not exist`, path)
        case 'TypeMismatchError':
          if (create === 1) {
            await parentHandle.removeEntry(name, { recursive: true })
            return await parentHandle[getter](name, { create: true })
          } else {
            throw toFsError(
              FsErrorCode.TypeMisMatch,
              fn,
              `"${path}" already exists a ${isFile ? 'directory' : 'file'}`,
              path,
            )
          }
      }
    }
    throw toFsError(FsErrorCode.Unknown, fn, `unknown error, ${JSON.stringify(err)}`, path)
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
        throw toFsError(FsErrorCode.NotExists, fn, `"${path}" does not exist`, path)
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
export async function builtinMove(from: FileSystemFileHandle, ...args: any) {
  if ('move' in from) {
    await (from.move as any)(...args)
    return true
  }
  return false
}

export async function getDirectoryHandleRelation(
  sourceHandle: FileSystemDirectoryHandle,
  targetHandle: FileSystemDirectoryHandle,
): Promise<typeof DirectoryRelationType[keyof typeof DirectoryRelationType]> {
  if (await sourceHandle.isSameEntry(targetHandle) && sourceHandle.name === targetHandle.name) {
    return DirectoryRelationType.IsSame
  }

  if (await targetHandle.resolve(sourceHandle)) {
    return DirectoryRelationType.IsInsideTargetDirectory
  }

  if (await sourceHandle.resolve(targetHandle)) {
    return DirectoryRelationType.IsParentOfTargetDirectories
  }

  return DirectoryRelationType.IsDifferent
}
