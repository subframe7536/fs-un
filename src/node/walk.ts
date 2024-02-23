import { readdir } from 'node:fs'
import { join } from 'pathe'
import type { WalkOptions } from '../types'

/**
 * walk a directory
 * @param root walk root
 * @param options walk options
 */
export async function walk<
  T = string,
  NotNullish extends boolean = true,
  Result = NotNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: string,
  options: WalkOptions<T, NotNullish> = {},
): Promise<Result[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    filter,
    includeDirs = false,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  const result: Result[] = []

  const _transform = async (path: string, isDir: boolean) => {
    const _ = await transform(path, isDir)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      result.push(_ as Result)
    }
  }
  const pushDirectory = includeDirs
    ? filter
      ? async (dirPath: string) => filter(dirPath, true) && await _transform(dirPath, true)
      : async (dirPath: string) => await _transform(dirPath, true)
    : null

  const pushFile = filter
    ? async (filePath: string) => filter(filePath, false) && await _transform(filePath, false)
    : async (filePath: string) => await _transform(filePath, false)

  return new Promise((resolve, reject) => {
    let taskCount = 0
    let err: any = null
    const enqueue = () => taskCount++
    const dequeue = () => --taskCount === 0 && (err == null ? resolve(result) : reject(err))

    function walkDir(directoryPath: string, depth: number) {
      if (depth < 0 || err != null) {
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
          if (signal?.aborted) {
            return
          }

          await pushDirectory?.(directoryPath)

          await Promise.all(
            entries.map(async (entry) => {
              const currentPath = join(directoryPath, entry.name)
              entry.isDirectory()
                ? walkDir(currentPath, depth - 1)
                : await pushFile(currentPath)
            }),
          )

          dequeue()
        },
      )
    }

    walkDir(root, maxDepth)
  })
}
