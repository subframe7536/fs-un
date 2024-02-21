import type { Dirent } from 'node:fs'
import { existsSync, promises as fsp } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { basename, dirname, extname, join, parse, relative, resolve } from 'pathe'
import type { Promisable } from '@subframe7536/type-utils'
import type { CopyOptions, FileAttr, FindOptions, MoveOptions, PathType, WalkQueueItem } from '../types'
import { type Options, type ReaddirFn, walk } from '../utils/walk'

const readdirFn: ReaddirFn = path => readdir(path, { withFileTypes: true })
  .then(dirent => dirent.map(dirent => ({ isDir: dirent.isDirectory(), name: dirent.name })))

/**
 * create a directory, auto skip if exists
 *
 * return ensured path. if is `undefined`, `path` is a exist file
 */
export async function mkdir(path: string): Promise<string | undefined> {
  try {
    await fsp.mkdir(path, { recursive: true })
    return path
  } catch (err) {
    if (isAlreadyExistError(err)) {
      return await exists(path) !== 'dir' ? undefined : path
    }
    throw err
  }
}

async function copyLink(from: string, to: string) {
  const symlinkPointsAt = await fsp.readlink(from)
  try {
    await fsp.symlink(symlinkPointsAt, to)
  } catch (err) {
    // There is already file/symlink with this name on destination location.
    // Must erase it manually, otherwise system won't allow us to place symlink there.
    if (isAlreadyExistError(err)) {
      await fsp.unlink(to)
      await fsp.symlink(symlinkPointsAt, to)
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
  if (status) {
    if (overwrite) {
      await remove(to)
    } else {
      throw new Error(`dest path "${to}" already exists, cannot overwrite`)
    }
  } else {
    await mkdir(dirname(to))
  }

  try {
    switch (await exists(from)) {
      case 'dir':
        from.endsWith('asar') && process?.versions?.electron
          // eslint-disable-next-line ts/no-var-requires, ts/no-require-imports, unicorn/prefer-node-protocol
          ? require('original-fs').copyFileSync(from, to)
          : await walk(from, readdirFn, {
            includeDirs: true,
            transform: async (srcPath, isDir) => {
              const destPath = resolve(to, relative(from, srcPath))
              if (isDir) {
                await mkdir(destPath)
              } else if (!match || match(srcPath, !isDir)) {
                await mkdir(dirname(destPath))
                await fsp.copyFile(srcPath, destPath)
              }
            },
          })
        break
      case 'file':
        await fsp.copyFile(from, to)
        break
      case 'link':
        await copyLink(from, to)
        break
      default:
        throw new Error(`"${from}" not exists`)
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
export async function exists(path: Dirent): Promise<PathType>
export async function exists(path: string, link: false): Promise<PathType>
export async function exists(path: string): Promise<PathType | 'link'>
export async function exists(path: string | Dirent, link: boolean = true) {
  try {
    const stat = typeof path === 'string' ? await fsp.lstat(path) : path
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
  return walk(
    path,
    readdirFn,
    {
      includeDirs: true,
      transform: async (str, isDir) => options.match(str, !isDir) ? str : undefined,
      ...options.recursive ? undefined : { maxDepth: 1 },
    },
  )
}

/**
 * list directory and parse attributes
 */
export async function parseDir(
  path: string,
  cb?: (path: string, attr: FileAttr) => (FileAttr | undefined),
): Promise<FileAttr[]> {
  return await walk(
    path,
    readdirFn,
    {
      transform: async (p, isDir) => {
        if (isDir) {
          return undefined
        }
        const attr = await parseFileAttr(p, path)
        return cb?.(path, attr) || attr
      },
    },
  )
}

/**
 * parse file attributes
 */
export async function parseFileAttr(path: string, rootPath?: string): Promise<FileAttr> {
  const { size, mtime: modifiedTime } = await fsp.stat(path)
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
        return await fsp.readFile(path)
      case 'text':
        return await fsp.readFile(path, 'utf-8')
      case 'json':
        return parse(await fsp.readFile(path, 'utf-8'))
    }
  } catch (error) {
    if (isNotExistError(error) || isDirError(error)) {
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
  data: Parameters<typeof fsp.writeFile>[1],
  options?: Parameters<typeof fsp.writeFile>[2],
): Promise<void> {
  try {
    await fsp.writeFile(path, data, options)
  } catch (err) {
    if (isNotExistError(err)) {
      await fsp.mkdir(dirname(path), { recursive: true })
      await fsp.writeFile(path, data, options)
    } else if (isDirError(err)) {
      throw new Error(`"${path}" exists a directory, cannot write`)
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
  const toExists = existsSync(to)
  if (!overwrite && toExists) {
    throw new Error(`target path "${to}" already exists, cannot overwrite`)
  }
  if (renameMode) {
    const extName = extname(from)
    to = join(dirname(from), basename(to, extName) + extName)
  }
  if (from === to) {
    return
  }
  try {
    await fsp.rename(from, to)
  } catch (err) {
    if ((isDirError(err) || isNoPermissionError(err)) && overwrite) {
      await remove(to)
      await fsp.rename(from, to)
    } else if (isAnotherDeviceError(err)) {
      await copy(from, to, { overwrite: true })
      await remove(from)
    } else if (isNotExistError(err) && !toExists) {
      await mkdir(dirname(to))
      await fsp.rename(from, to)
    } else {
      throw err
    }
  }
}

/**
 * remove directory and files recursively
 */
export async function remove(path: string): Promise<void> {
  await fsp.rm(path, { recursive: true, maxRetries: 3, retryDelay: 500, force: true })
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
export function isDirError(err: unknown) {
  return (err as any)?.code === 'EISDIR'
}

/**
 * error code is `EPERM`
 */
export function isNoPermissionError(err: unknown) {
  return (err as any)?.code === 'EPERM'
}

/**
 * error code is `EEXIST`
 */
export function isAlreadyExistError(err: unknown) {
  return (err as any)?.code === 'EEXIST'
}