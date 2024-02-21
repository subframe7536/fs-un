import fs from 'node:fs'
import type { Promisable } from '@subframe7536/type-utils'
import { join } from 'pathe'

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

type PushFn = (path: string) => void

export type ReaddirFn = (path: string) => Promise<{
  name: string
  isDir: boolean
}[]>

export function walk<T = string, N extends boolean = true, Result = N extends true ? Exclude<T, null | undefined> : T>(
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

  const paths: Result[] = []
  let pending = 0
  let err: any = null

  const _transform = (path: string, isDir: boolean) => {
    const _ = transform(path, isDir)
    if (!notNullish || (_ !== null && _ !== undefined)) {
      paths.push(_ as Result)
    }
  }
  let pushDirectory: PushFn
  if (includeDirs) {
    pushDirectory = filters?.length
      ? dirPath => filters!.every(filter => filter(dirPath, true)) && _transform(dirPath, true)
      : dirPath => _transform(dirPath, true)
  }

  const pushFile: PushFn = filters?.length
    ? filePath => filters!.every(filter => filter(filePath, false)) && _transform(filePath, false)
    : filePath => _transform(filePath, false)

  return new Promise((resolve, reject) => {
    function walkDir(directoryPath: string, depth: number) {
      if (depth < 0 || (err != null)) {
        return
      }

      pending++

      readdir(directoryPath)
        .then((entries) => {
          signal?.aborted && resolve(paths)

          pushDirectory?.(directoryPath)

          entries.forEach(({ isDir, name }) => {
            const currentPath = join(directoryPath, name)
            isDir
              ? walkDir(currentPath, depth - 1)
              : pushFile(currentPath)
          })

          --pending === 0 && resolve(paths)
        })
        .catch((error) => {
          err = error
          --pending === 0 ? resolve(paths) : reject(error)
        })
    }

    walkDir(root, maxDepth)
  })
}
