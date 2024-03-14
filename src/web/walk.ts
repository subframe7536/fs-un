import type { Promisable } from '@subframe7536/type-utils'
import type { WalkOptions } from '..'
import { isDirectoryHandle, isFileHandle } from './utils'

export async function walk<
  T = string,
  NotNullish extends boolean = true,
  Result = NotNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: FileSystemDirectoryHandle,
  options: WalkOptions<{
    (p: string, handle: FileSystemHandle): Promisable<T>
  }, NotNullish> = {},
): Promise<Result[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    filter,
    includeDirs = false,
    withRootPath,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  const queue: [FileSystemFileHandle | FileSystemDirectoryHandle, string, number][] = []
  const result: Result[] = []

  const _transform = async (path: string, handle: FileSystemHandle) => {
    const _ = await transform(path, handle)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      result.push(_ as Result)
    }
  }
  const pushDirectory = includeDirs
    ? filter
      ? async (dirPath: string, handle: FileSystemHandle) => filter(dirPath, true) && await _transform(dirPath, handle)
      : async (dirPath: string, handle: FileSystemHandle) => await _transform(dirPath, handle)
    : null

  const pushFile = filter
    ? async (filePath: string, handle: FileSystemHandle) => filter(filePath, false) && await _transform(filePath, handle)
    : async (filePath: string, handle: FileSystemHandle) => await _transform(filePath, handle)

  async function build(
    handle: FileSystemHandle,
    path: string,
    depth: number,
  ) {
    if (signal?.aborted || depth < 0) {
      return
    }
    const _path = `${path}/${handle.name}`
    if (isDirectoryHandle(handle)) {
      await pushDirectory?.(_path, handle)
      const entries = handle.entries()
      for await (const [name, handle] of entries) {
        if (!filter || filter(name, isDirectoryHandle(handle))) {
          queue.push([handle, _path, depth - 1])
        }
      }
    } else if (isFileHandle(handle)) {
      await pushFile?.(_path, handle)
    }
  }

  const basePath = withRootPath ? root.name : ''
  for await (const [, handle] of root.entries()) {
    queue.push([handle, basePath, maxDepth - 1])
  }
  while (queue.length) {
    await Promise.all(queue.splice(0, 8).map(([handle, path, depth]) => build(handle, path, depth)))
  }

  return result
}
