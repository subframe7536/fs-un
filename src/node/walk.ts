import type { Promisable } from '@subframe7536/type-utils'
import type { WalkOptions } from '../types'
import { type Dirent, readdirSync } from 'node:fs'

/**
 * Walk a directory
 * @param root root directory
 * @param options walk options
 */
export async function* walk<
  T = string,
  NotNullish extends boolean = true,
  Result = NotNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: string,
  options: WalkOptions<{
    (path: string, isDirectory: true): Promisable<T>
    (path: string, isDirectory: false, data: Dirent): Promisable<T>
  }, NotNullish> = {},
): AsyncIterable<Result> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    withRootPath,
    filter,
    includeDirs = false,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  const _transform = withRootPath
    ? (path: string, isDir: any, data?: any) => transform(path, isDir, data)
    : (path: string, isDir: any, data?: any) => transform(path.substring(root.length), isDir, data)

  async function* walkDir(directoryPath: string, depth: number): AsyncGenerator<Result> {
    if (depth <= 0 || signal?.aborted) {
      return
    }

    const dirEntries = readdirSync(directoryPath, { withFileTypes: true })
    const dirPath = `${directoryPath}/`

    if (includeDirs && directoryPath !== root && (!filter || filter(dirPath, true))) {
      const result = await _transform(dirPath, true)
      if (!notNullish || result != null) {
        yield result as Result
      }
    }

    for (const dirent of dirEntries) {
      if (signal?.aborted) {
        return
      }

      const currentPath = `${directoryPath}/${dirent.name}`

      if (dirent.isDirectory()) {
        yield * walkDir(currentPath, depth - 1)
      } else if (!filter || filter(currentPath, false)) {
        const result = await _transform(currentPath, false, dirent)
        if (!notNullish || result != null) {
          yield result as Result
        }
      }
    }
  }

  yield * walkDir(root, maxDepth)
}
