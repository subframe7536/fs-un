import type { Promisable } from '@subframe7536/type-utils'
import { join, normalize } from 'pathe'

export type Filter = (path: string, isDirectory: boolean) => boolean
export type Options<T, N> = {
  includeDirs?: boolean
  maxDepth?: number
  filters?: Filter[]
  signal?: AbortSignal
  transform?: (path: string, isDirectory: boolean) => Promisable<T>
  /**
   * whether to filter `null` and `undefined`
   * @default true
   */
  notNullish?: N
}

type PushFn = (path: string) => Promise<void | false>

export type ReaddirFn = (path: string) => Promise<{
  name: string
  isDir: boolean
}[]>

export async function walk<T = string, N extends boolean = true, Result = N extends true ? Exclude<T, null | undefined> : T>(
  root: string,
  readdir: ReaddirFn,
  options: Options<T, N> = {},
): Promise<Result[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    filters = [],
    includeDirs = false,
    signal,
    notNullish = true,
    transform = (p: string) => p,
  } = options

  const result: Result[] = []
  let pending = 0
  let err: any = null

  const _transform = async (path: string, isDir: boolean) => {
    const _ = await transform(path, isDir)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      result.push(_ as Result)
    }
  }
  let pushDirectory: PushFn
  if (includeDirs) {
    pushDirectory = filters.length
      ? async dirPath => filters.every(filter => filter(dirPath, true)) && await _transform(dirPath, true)
      : async dirPath => await _transform(dirPath, true)
  }

  const pushFile: PushFn = filters.length
    ? async filePath => filters.every(filter => filter(filePath, false)) && await _transform(filePath, false)
    : async filePath => await _transform(filePath, false)

  return new Promise((resolve, reject) => {
    function walkDir(directoryPath: string, depth: number) {
      if (depth < 0 || (err != null)) {
        return
      }

      pending++

      readdir(directoryPath)
        .then(async (entries) => {
          signal?.aborted && resolve(result)

          await pushDirectory?.(directoryPath)

          await Promise.all(entries.map(async ({ isDir, name }) => {
            const currentPath = join(directoryPath, name)
            isDir
              ? walkDir(currentPath, depth - 1)
              : await pushFile(currentPath)
          }))

          --pending === 0 && resolve(result)
        })
        .catch((error) => {
          err = error
          --pending === 0 ? resolve(result) : reject(error)
        })
    }

    walkDir(root, maxDepth)
  })
}
