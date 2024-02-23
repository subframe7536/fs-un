import { normalize } from 'pathe'
import type { WalkOptions } from '..'

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

export async function mkdir(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    let handle = root
    const pathItems = normalize(path).split('/').filter(Boolean)
    for (const name of pathItems) {
      handle = await handle.getDirectoryHandle(name, { create: true })
    }
    return handle
  } catch (ignore) {
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

export async function renameFileOrMoveToDir(
  from: FileSystemFileHandle,
  targetFileName: string
): Promise<void>
export async function renameFileOrMoveToDir(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle
): Promise<void>
export async function renameFileOrMoveToDir(
  from: FileSystemFileHandle,
  targetDirHandle: FileSystemDirectoryHandle,
  targetFileName: string
): Promise<void>
export async function renameFileOrMoveToDir(from: FileSystemFileHandle, ...args: any) {
  if ('move' in from) {
    await (from.move as any)(...args)
  }
}
