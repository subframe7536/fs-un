import { existsSync, promises as fsp } from 'node:fs'
import { basename, dirname, extname, join, relative, resolve } from 'pathe'
import type { MoveOptions, OverwriteOptions, PathType } from '../types'
import { walk } from './walk'

/**
 * create a directory, auto skip if exists
 *
 * return ensured path. if is `undefined`, `path` is a exist file
 */
export async function mkdir(path: string): Promise<void> {
  try {
    await fsp.mkdir(path, { recursive: true })
  } catch (err) {
    if (isAlreadyExistError(err)) {
      return
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
  options: OverwriteOptions = {},
): Promise<void> {
  const { overwrite } = options
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
          : await walk(from, {
            includeDirs: true,
            appendRoot: true,
            transform: async (srcPath, isDir) => {
              const destPath = resolve(to, relative(from, srcPath))
              if (isDir) {
                await mkdir(destPath)
              } else {
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
export async function exists(path: string): Promise<PathType | 'link'> {
  try {
    const stat = await fsp.lstat(path)
    if (stat.isDirectory()) {
      return 'dir'
    } else if (stat.isFile()) {
      return 'file'
    } else if (stat.isSymbolicLink()) {
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
