import type { Promisable } from '@subframe7536/type-utils'
import { join } from 'pathe'

export type ItemFilter = (path: string, isDirectory: boolean) => boolean

export type Options<T, R, N> = {
  /**
   * whether to include directories
   */
  includeDirs?: boolean
  /**
   * max directory depth
   */
  maxDepth?: number
  /**
   * filter files or directories, executed before `transform`
   */
  filter?: ItemFilter
  /**
   * abort controller
   */
  signal?: AbortSignal
  /**
   * transform result, `itemData` is undefined if `isDirectory` is `true`
   */
  transform?: (path: string, isDirectory: boolean, itemData?: R) => Promisable<T>
  /**
   * whether to filter `null` and `undefined` result from `transform`
   * @default true
   */
  notNullish?: N
}

type PushFn<R> = (path: string, itemData?: R) => Promise<void | false>

type ReaddirFnReturn<T> = {
  name: string
  isDir: boolean
} & (
  T extends undefined
    ? {}
    : { item: T }
)

export type ReaddirFn<T = undefined> = (path: string) => Promise<ReaddirFnReturn<T>[]>

/**
 * walk a directory
 * @param root walk root
 * @param readdir abstract readdir function
 * @param options walk options
 */
export async function walk<
  R,
  T = string,
  NoNullish extends boolean = true,
  Result = NoNullish extends true ? Exclude<T, null | undefined> : T,
>(
  root: string,
  readdir: ReaddirFn<R>,
  options: Options<T, R, NoNullish> = {},
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
  // task count
  let pending = 0
  let err: any = null

  const _transform = async (path: string, isDir: boolean, itemData?: R) => {
    const _ = await transform(path, isDir, itemData)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      result.push(_ as Result)
    }
  }
  let pushDirectory: PushFn<R>
  if (includeDirs) {
    pushDirectory = filter
      ? async (dirPath, itemData) => filter(dirPath, true) && await _transform(dirPath, true, itemData)
      : async (dirPath, itemData) => await _transform(dirPath, true, itemData)
  }

  const pushFile: PushFn<R> = filter
    ? async (filePath, itemData) => filter(filePath, false) && await _transform(filePath, false, itemData)
    : async (filePath, itemData) => await _transform(filePath, false, itemData)

  return new Promise((resolve, reject) => {
    function walkDir(directoryPath: string, depth: number) {
      if (depth < 0 || (err != null)) {
        return
      }

      pending++

      // async/await will decrease performance here, resolve is manually controlled by `pending`
      readdir(directoryPath)
        .then(async (entries) => {
          signal?.aborted && resolve(result)

          await pushDirectory?.(directoryPath, undefined)

          await Promise.all(
            entries.map(async (data) => {
              const currentPath = join(directoryPath, data.name)
              data.isDir
                ? walkDir(currentPath, depth - 1)
                : await pushFile(currentPath, (data as any).item)
            }),
          )

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
