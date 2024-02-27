import { basename, dirname, normalize } from 'pathe'

export function isSupportFs() {
  return typeof globalThis.showDirectoryPicker === 'function'
}
export interface RootHandleOption {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}
/**
 * @throws UnsupportedError
 */
export async function getRootHandle(options?: RootHandleOption) {
  return await globalThis.showDirectoryPicker(options)
}

export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file'
}

export function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

export async function getParentDir(root: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    let handle = root
    const pathItems = dirname(path).split('/').filter(Boolean)
    for (const name of pathItems) {
      handle = await handle.getDirectoryHandle(name, { create })
    }
    return handle
  } catch {
    return undefined
  }
}

export async function getHandleFromPath(
  root: FileSystemDirectoryHandle,
  path: string,
  ensureParentDir: boolean = false,
): Promise<FileSystemHandle | undefined> {
  const parentHandle = await getParentDir(root, dirname(path), ensureParentDir)
  if (!parentHandle) {
    return undefined
  }
  const name = basename(path)
  try {
    return await parentHandle.getFileHandle(name)
  } catch {
    try {
      return await parentHandle.getDirectoryHandle(name)
    } catch {
      return undefined
    }
  }
}

export async function mkdir(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    const handle = await getParentDir(root, path, true)
    return handle ? await handle.getDirectoryHandle(basename(path), { create: true }) : undefined
  } catch {
    return undefined
  }
}

export async function _copyFile(
  from: FileSystemFileHandle,
  to: FileSystemFileHandle,
  onCopy?: (copied: number, total: number) => void,
): Promise<void> {
  const file = await from.getFile()
  const writable = await to.createWritable()

  if (!onCopy) {
    await file.stream().pipeTo(writable)
  } else {
    const { size, stream } = file
    const reader = stream().getReader()
    const writable = await to.createWritable()
    let copiedBytes = 0
    let done, value
    // eslint-disable-next-line no-cond-assign
    while (({ done, value } = await reader.read()), !done) {
      await writable.write(value!)
      copiedBytes += value!.length
      onCopy?.(copiedBytes, size)
    }
  }

  await writable.close()
}

export async function copyFile(
  from: FileSystemFileHandle,
  to: FileSystemFileHandle,
): Promise<void> {
  const file = await from.getFile()
  const writable = await to.createWritable()
  await file.stream().pipeTo(writable)
  await writable.close()
}

export async function useBuiltinMove(
  from: FileSystemFileHandle,
  targetFileName: string
): Promise<boolean>
export async function useBuiltinMove(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle
): Promise<boolean>
export async function useBuiltinMove(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle,
  targetFileName: string
): Promise<boolean>
export async function useBuiltinMove(from: FileSystemFileHandle, ...args: any) {
  if ('move' in from) {
    await (from.move as any)(...args)
    return true
  }
  return false
}
