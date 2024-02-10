import { existsSync, promises as fs } from 'node:fs'
import { basename, dirname, join, parse, relative, resolve } from 'pathe'
import type { Promisable } from '@subframe7536/type-utils'
import type { CopyOptions, FileAttr, FindOptions, MoveOptions, PathType } from '../types'

type WalkOptions<T> = {
  /**
   * max dir depth
   * @default Number.POSITIVE_INFINITY
   */
  maxDepth?: number
  /**
   * whether to filter `null` and `undefined`
   * @default true
   */
  filterNullish?: T
}

/**
 * create a directory, auto skip if exists
 *
 * return ensured path. if is `undefined`, `path` is a exist file
 */
export async function mkdir(path: string): Promise<string | undefined> {
  try {
    await fs.mkdir(path, { recursive: true })
    return path
  } catch (err) {
    if (isAlreadyExistError(err)) {
      return await exists(path) !== 'dir' ? undefined : path
    }
    throw err
  }
}

async function copyLink(from: string, to: string) {
  const symlinkPointsAt = await fs.readlink(from)
  try {
    await fs.symlink(symlinkPointsAt, to)
  } catch (err) {
    // There is already file/symlink with this name on destination location.
    // Must erase it manually, otherwise system won't allow us to place symlink there.
    if (isAlreadyExistError(err)) {
      await fs.unlink(to)
      await fs.symlink(symlinkPointsAt, to)
    } else {
      throw err
    }
  }
}
/**
 * copy files or directories, auto create parent directory
 */
export async function copy(
  from: string,
  to: string,
  options: CopyOptions = {},
): Promise<void> {
  const { match, overwrite } = options
  const status = await exists(to)
  if (!overwrite && status) {
    throw new Error(`dest path "${to}" already exists, cannot overwrite`)
  } else if (overwrite && status === 'dir') {
    await remove(to)
  } else if (!status) {
    await mkdir(dirname(to))
  }

  try {
    switch (await exists(from)) {
      case 'dir':
        from.endsWith('asar') && process?.versions?.electron
          // eslint-disable-next-line ts/no-var-requires, ts/no-require-imports, unicorn/prefer-node-protocol
          ? require('original-fs').copyFileSync(from, to)
          : await walkDir(from, async (srcPath, pathType) => {
            const destPath = resolve(to, relative(from, srcPath))
            if (pathType === 'dir') {
              await mkdir(destPath)
            } else if (!match || match(srcPath, pathType === 'file')) {
              await mkdir(dirname(destPath))
              await fs.copyFile(srcPath, destPath)
            }
          })
        break
      case 'file':
        await fs.copyFile(from, to)
        break
      case 'link':
        await copyLink(from, to)
        break
    }
  } catch (err) {
    if (!isNotExistError(err)) {
      throw err
    }
    await mkdir(dirname(to))
    await copy(from, to, options)
  }
}

/**
 * check if path exists, if second param is true, will check 'link'
 */
export async function exists(path: string, link: false): Promise<PathType>
export async function exists(path: string): Promise<PathType | 'link'>
export async function exists(path: string, link: boolean = true) {
  try {
    const stat = await fs.stat(path)
    if (stat.isDirectory()) {
      return 'dir'
    } else if (stat.isFile()) {
      return 'file'
    } else if (link && stat.isSymbolicLink()) {
      return 'link'
    } else {
      return 'other'
    }
  } catch (err) {
    if (isNotExistError(err)) {
      return false
    }
    throw err
  }
}

/**
 * recursively search files
 */
export async function find(path: string, options: FindOptions): Promise<string[]> {
  return walkDir(
    path,
    async (str, pathType) => options.match(str, pathType === 'file') ? str : undefined,
    options.recursive ? undefined : { maxDepth: 1 },
  )
}

/**
 * list directory and parse attributes
 */
export async function parseDir(
  path: string,
  cb?: (path: string, attr: FileAttr) => (FileAttr | undefined),
): Promise<FileAttr[]> {
  return await walkDir(path, async (p, pathType) => {
    if (pathType !== 'file') {
      return undefined
    }
    const attr = await parseFileAttr(p, path)
    return cb?.(path, attr) || attr
  })
}

/**
 * parse file attributes
 */
export async function parseFileAttr(path: string, rootPath?: string): Promise<FileAttr> {
  const { size, mtime: modifiedTime } = await fs.stat(path)
  const { dir, name, ext } = parse(rootPath ? relative(rootPath, path) : path)
  return { dir, name, ext, size, modifiedTime }
}

/**
 * read file as buffer or text or json or custom
 */
export async function read(path: string, type: 'buffer'): Promise<Buffer | undefined>
export async function read(path: string, type: 'text'): Promise<string | undefined>
export async function read<T = any>(path: string, type: 'json', parse?: (str: string) => any): Promise<T | undefined>
export async function read(path: string, type: 'buffer' | 'text' | 'json', parse: (str: string) => any = JSON.parse) {
  try {
    switch (type) {
      case 'buffer':
        return await fs.readFile(path)
      case 'text':
        return await fs.readFile(path, 'utf-8')
      case 'json':
        return parse(await fs.readFile(path, 'utf-8'))
    }
  } catch (error) {
    if (isNotExistError(error)) {
      return undefined
    }
    throw error
  }
}

/**
 * write file, auto create parent directory
 */
export async function write(
  path: string,
  data: Parameters<typeof fs.writeFile>[1],
  options?: Parameters<typeof fs.writeFile>[2],
): Promise<void> {
  try {
    await fs.writeFile(path, data, options)
  } catch (err) {
    if (isNotExistError(err)) {
      await fs.mkdir(dirname(path), { recursive: true })
      await fs.writeFile(path, data, options)
    } else {
      throw err
    }
  }
}

/**
 * move files or directories, auto create parent directory.
 *
 * overwrite by default
 */
export async function move(
  from: string,
  to: string,
  options: MoveOptions = {},
): Promise<void> {
  const { overwrite, renameMode } = options
  if (!overwrite && existsSync(to)) {
    throw new Error(`target path "${to}" already exists, cannot overwrite`)
  }
  if (renameMode) {
    to = join(dirname(from), basename(to))
  }
  if (from === to) {
    return
  }
  try {
    await fs.rename(from, to)
  } catch (err) {
    if ((isDir(err) || isNoPermission(err)) && overwrite) {
      await remove(to)
      await fs.rename(from, to)
    } else if (isAnotherDeviceError(err)) {
      await copy(from, to, { overwrite: true })
      await remove(from)
    } else if (isNotExistError(err) && !existsSync(to)) {
      await mkdir(dirname(to))
      await fs.rename(from, to)
    } else {
      throw err
    }
  }
}

/**
 * remove directory and files recursively
 */
export async function remove(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, maxRetries: 3, retryDelay: 500, force: true })
}

type WalkQueue = {
  currentPath: string
  depth: number
  pathType: PathType
}[]

/**
 * check dir exists and walk files
 */
export async function walkDir<T, N = false>(
  folder: string,
  transform: (path: string, pathType: PathType) => Promisable<T>,
  options: WalkOptions<N> = {},
): Promise<N extends false ? Exclude<T, null | undefined>[] : T[]> {
  if ((await exists(folder)) !== 'dir') {
    throw new Error(`"${folder}" not exists or is not a dir`)
  }
  const queue: WalkQueue = [{ currentPath: folder, pathType: 'dir', depth: 0 }]
  const files: T[] = []
  const { filterNullish = true, maxDepth = Number.POSITIVE_INFINITY } = options
  while (queue.length) {
    const { currentPath, depth, pathType } = queue.shift()!

    if (pathType === 'dir' && depth < maxDepth) {
      const dirFiles = (await fs.readdir(currentPath))
      await Promise.all(dirFiles.map(async (file) => {
        const cur = join(currentPath, file)
        queue.push({
          currentPath: cur,
          pathType: await exists(cur, false),
          depth: depth + 1,
        })
      }))
    }

    const result = await transform(currentPath, pathType)
    if (!filterNullish || (result !== null && result !== undefined)) {
      files.push(result as T)
    }
  }
  return files as any
}

/**
 * error code is `ENOENT`
 */
export function isNotExistError(err: unknown) {
  return (err as any)?.code === 'ENOENT'
}

/**
 * error code is `EXDEV`
 */
export function isAnotherDeviceError(err: unknown) {
  return (err as any)?.code === 'EXDEV'
}

/**
 * error code is `EISDIR`
 */
export function isDir(err: unknown) {
  return (err as any)?.code === 'EISDIR'
}

/**
 * error code is `EPERM`
 */
export function isNoPermission(err: unknown) {
  return (err as any)?.code === 'EPERM'
}

/**
 * error code is `EEXIST`
 */
export function isAlreadyExistError(err: unknown) {
  return (err as any)?.code === 'EEXIST'
}
