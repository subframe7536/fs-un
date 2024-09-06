import { type Dirent, readdir } from 'node:fs'
import type { Promisable } from '@subframe7536/type-utils'
import type { WalkOptions } from '../types'

/**
 * Walk a directory
 * @param root root directory
 * @param options walk options
 */
export async function walk<
  T = string,
  NotNullish extends boolean = true,
  Result = NotNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: string,
  options: WalkOptions<{
    (path: string, isDirectory: true): Promisable<T>
    (path: string, isDirectory: false, data: Dirent): Promisable<T>
  }, NotNullish> = {},
): Promise<Result[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    withRootPath,
    filter,
    includeDirs = false,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  const result: Result[] = []

  const _transform = withRootPath
    ? (path: string, isDir: any, data?: any) => transform(path, isDir, data)
    : (path: string, isDir: any, data?: any) => transform(path.substring(root.length), isDir, data)

  const pushDirectory = includeDirs
    ? filter
      ? async (dirPath: string) => filter(dirPath, true) && await handleResult(dirPath, true)
      : async (dirPath: string) => await handleResult(dirPath, true)
    : () => { }

  const pushFile = filter
    ? async (filePath: string, data: Dirent) => filter(filePath, false) && await handleResult(filePath, false, data)
    : async (filePath: string, data: Dirent) => await handleResult(filePath, false, data)

  async function handleResult(path: string, isDir: boolean, data?: Dirent): Promise<void> {
    const _ = await _transform(path, isDir, data)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      result.push(_ as Result)
    }
  }

  return new Promise((resolve, reject) => {
    let taskCount = 0
    let err: any = null
    const enqueue = (): any => taskCount++
    const dequeue = (): any => --taskCount === 0 && (err == null ? resolve(result) : reject(err))

    function walkDir(directoryPath: string, depth: number): void {
      if (depth < 0 || err != null || signal?.aborted) {
        return
      }

      enqueue()

      // async/await will decrease performance here, resolve is manually controlled by `taskCount`
      readdir(
        directoryPath,
        { withFileTypes: true },
        async (error, entries) => {
          if (error) {
            err = error
            dequeue()
          }

          await pushDirectory(`${directoryPath}/`)
          await Promise.all(
            entries.map(async (entry) => {
              const currentPath = `${directoryPath}/${entry.name}`
              if (entry.isDirectory()) {
                walkDir(currentPath, depth - 1)
              } else {
                await pushFile(currentPath, entry)
              }
            }),
          )
          dequeue()
        },
      )
    }

    walkDir(root, maxDepth)
  })
}
