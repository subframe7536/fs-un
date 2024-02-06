export class UnsupportedError extends Error {
  constructor() {
    super('not supported')
  }
}
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
  if (!isSupportFs()) {
    throw new UnsupportedError()
  }
  return await globalThis.showDirectoryPicker(options)
}

// function isFileSystemHandle(handle: unknown): handle is FileSystemHandle {
//   if (typeof handle !== 'object' || handle === null) {
//     return false
//   }
//   return 'kind' in handle && typeof (handle as FileSystemHandle).queryPermission === 'function' && typeof (handle as FileSystemHandle).requestPermission === 'function'
// }

export function isFileHandle(handle: FileSystemHandle): handle is FileSystemFileHandle {
  return handle.kind === 'file'
}

export function isDirectoryHandle(handle: FileSystemHandle): handle is FileSystemDirectoryHandle {
  return handle.kind === 'directory'
}

export function parseFilename(filename: string) {
  const match = /.(\.[^./]+)$/.exec(filename)
  const ext = match ? match[1] : ''
  const name = ext ? filename.slice(0, -ext.length) : filename
  return { name, ext }
}

// export type WebFS = WeakMap<string[], FileSystemDirectoryHandle>
// export async function buildDirectory(
//   root: FileSystemDirectoryHandle,
// ): Promise<WebFS> {
//   const resultMap = new WeakMap<string[], FileSystemDirectoryHandle>()
//   const stack: { dir: FileSystemDirectoryHandle; path: string[] }[] = []

//   stack.push({ dir: root, path: [] })

//   while (stack.length > 0) {
//     const { dir, path } = stack.pop()!
//     for await (const entry of dir.values()) {
//       if (entry.kind === 'directory') {
//         const subPath = path.concat(entry.name)
//         resultMap.set(subPath, entry)
//         stack.push({ dir: entry, path: subPath })
//       }
//     }
//   }

//   return resultMap
// }
export type WebFileMap = Map<string, FileSystemHandle>
export async function buildDirectoryMap(
  root: FileSystemDirectoryHandle,
  extensions?: string[] | RegExp,
) {
  // https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/browser/htmlFileSystemProvider.ts#L416C12-L416C12
  let hasPermission = await root.queryPermission() === 'granted'

  try {
    if (!hasPermission) {
      hasPermission = await root?.requestPermission({ mode: 'read' }) === 'granted'
    }
  } catch (error) {
    // todo))
  }
  const queue: [FileSystemHandle, string][] = []
  const fileMap: WebFileMap = new Map()

  fileMap.set('/', root)
  for await (const [, handle] of root.entries()) {
    await build(handle, '')
  }
  while (queue.length) {
    const batch = queue.splice(0, 8)
    await Promise.all(batch.map(([handle, path]) => build(handle, path)))
  }

  function matchExtension(filename: string): boolean {
    if (!extensions) {
      return true
    }
    return Array.isArray(extensions)
      ? extensions.some(ext => filename.endsWith(`.${ext}`))
      : extensions.test(filename)
  }

  async function build(
    handle: FileSystemHandle,
    path: string,
  ) {
    const _path = `${path}/${handle.name}`

    fileMap.set(_path, handle)
    if (isDirectoryHandle(handle)) {
      const entries = handle.entries()
      for await (const [name, handle] of entries) {
        if (matchExtension(name)) {
          queue.push([handle, _path])
        }
      }
    }
  }

  return fileMap
}

export async function copy(
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
