import fs from 'node:fs'
import { join } from 'pathe'

export type Filter = (path: string, isDirectory: boolean) => boolean
export type Options<T> = {
  includeDirs?: boolean
  maxDepth?: number
  filters?: Filter[]
  signal?: AbortSignal
  transform?: (path: string, isDirectory: boolean) => T
}

type PushFn = (path: string) => void
export function walk<T = string>(
  root: string,
  readdir: (path: string) => Promise<{ name: string, isDir: boolean }[]>,
  options: Options<T> = {},
): Promise<T[]> {
  const {
    maxDepth = Number.POSITIVE_INFINITY,
    filters = [],
    includeDirs = false,
    signal,
    transform = (p: string) => p,
  } = options

  const paths: T[] = []
  let pending = 0
  let err: any = null

  let pushDirectory: PushFn
  if (includeDirs) {
    pushDirectory = filters?.length
      ? dirPath => filters!.every(filter => filter(dirPath, true)) && paths.push(transform(dirPath, true) as T)
      : dirPath => paths.push(transform(dirPath, true) as T)
  }

  const pushFile: PushFn = filters?.length
    ? filePath => filters!.every(filter => filter(filePath, false)) && paths.push(transform(filePath, false) as T)
    : filePath => paths.push(transform(filePath, false) as T)

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
