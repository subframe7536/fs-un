import type { Promisable } from '@subframe7536/type-utils'
import type { WalkOptions } from '../types'
import { isDirectoryHandle, isFileHandle } from './utils'

/**
 * Walk a directory handle
 * @param root root handle
 * @param options walk options
 */
export async function* walk<
  T = string,
  NotNullish extends boolean = true,
  Result = NotNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: FileSystemDirectoryHandle,
  options: WalkOptions<(p: string, handle: FileSystemHandle) => Promisable<T>, NotNullish> = {},
): AsyncIterable<Result> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    filter,
    includeDirs = false,
    withRootPath,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  async function* _transform(path: string, handle: FileSystemHandle): AsyncGenerator<T | undefined> {
    const result = await transform(path, handle)
    if (!notNullish || (result !== null && result !== undefined)) {
      return result as Result
    }
    return undefined
  }

  const pushDirectory = includeDirs
    ? filter
      ? async function* (dirPath: string, handle: FileSystemHandle) {
        if (filter(dirPath, true)) {
          const result = await _transform(dirPath, handle)
          if (result !== undefined) {
            yield result as Result
          }
        }
      }
      : async function* (dirPath: string, handle: FileSystemHandle) {
        const result = await _transform(dirPath, handle)
        if (result !== undefined) {
          yield result as Result
        }
      }
    : null

  const pushFile = filter
    ? async function* (filePath: string, handle: FileSystemHandle) {
      if (filter(filePath, false)) {
        const result = await _transform(filePath, handle)
        if (result !== undefined) {
          yield result as Result
        }
      }
    }
    : async function* (filePath: string, handle: FileSystemHandle) {
      const result = await _transform(filePath, handle)
      if (result !== undefined) {
        yield result as Result
      }
    }

  async function* build(
    handle: FileSystemHandle,
    path: string,
    depth: number,
  ): AsyncGenerator<Result> {
    if (signal?.aborted || depth < 0) {
      return
    }
    const _path = `${path}/${handle.name}`
    if (isDirectoryHandle(handle)) {
      if (pushDirectory) {
        yield * pushDirectory(_path, handle)
      }
      const entries = handle.entries()
      for await (const [name, handle] of entries) {
        if (!filter || filter(name, isDirectoryHandle(handle))) {
          yield * build(handle, _path, depth - 1)
        }
      }
    } else if (isFileHandle(handle)) {
      yield * pushFile(_path, handle)
    }
  }

  const basePath = withRootPath ? root.name : ''
  for await (const [, handle] of root.entries()) {
    yield * build(handle, basePath, maxDepth - 1)
  }
}
