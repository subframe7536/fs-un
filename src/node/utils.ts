import { existsSync, promises as fsp } from 'node:fs'
import { dirname, join, normalize, relative, resolve } from 'pathe'
import type { DirectoryRelationType, MoveOptions, OverwriteOptions, PathType } from '../types'
import { FsErrorCode, toFsError } from '../error'
import { walk } from './walk'
import { handleRestError, isAlreadyExistError, isAnotherDeviceError, isDirError, isNoPermissionError, isNotExistsError } from './error'

/**
 * create a directory, auto skip if exists
 *
 * return ensured path. if is `undefined`, `path` is a exist file
 */
export async function mkdir(path: string): Promise<void> {
  try {
    await fsp.mkdir(path, { recursive: true })
  } catch (err) {
    throw handleRestError(err, 'mkdir', path)
  }
}

async function copyLink(from: string, to: string) {
  const symlinkPointsAt = await fsp.readlink(from)
  try {
    await fsp.symlink(symlinkPointsAt, to)
  } catch (err) {
    if (isAlreadyExistError(err)) {
      await fsp.unlink(to)
      await fsp.symlink(symlinkPointsAt, to)
    }
    throw handleRestError(err, 'copyLink', from, to)
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
      throw toFsError(FsErrorCode.AlreadyExists, 'copy', `"${to}" already exist, cannot overwrite`, from, to)
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
          : 'cp' in fsp
            ? await fsp.cp(from, to, { recursive: true })
            : await walk(from, {
              includeDirs: true,
              withRootPath: true,
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
        throw toFsError(FsErrorCode.NotExists, 'copy', `"${from}" does not exist`, from, to)
    }
  } catch (err) {
    if (isNotExistsError(err)) {
      await mkdir(dirname(to))
      await copy(from, to, options)
    }
    throw handleRestError(err, 'copy', from, to)
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
    if (isNotExistsError(err)) {
      return false
    }
    throw handleRestError(err, 'exists', path)
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
  const toExists = existsSync(to)
  if (!options.overwrite && toExists) {
    throw new Error(`target path "${to}" already exists, cannot overwrite`)
  }
  if (options.rename) {
    to = join(dirname(from), to)
  }
  if (normalize(from) === normalize(to)) {
    return
  }
  try {
    await fsp.rename(from, to)
  } catch (err) {
    if (isDirError(err) || (isNoPermissionError(err) && options.overwrite)) {
      await remove(to)
      await fsp.rename(from, to)
    } else if (isAnotherDeviceError(err)) {
      await copy(from, to, { overwrite: options.overwrite })
      await remove(from)
    } else if (isNotExistsError(err) && !toExists) {
      await mkdir(dirname(to))
      await fsp.rename(from, to)
    } else {
      throw handleRestError(err, 'move', from, to)
    }
  }
}

/**
 * remove directory and files recursively
 */
export async function remove(path: string): Promise<void> {
  try {
    await fsp.rm(path, { recursive: true, maxRetries: 3, retryDelay: 500, force: true })
  } catch (error) {
    throw handleRestError(error, 'remove', path)
  }
}

export function getDirectoryRelation(sourcePath: string, targetPath: string): DirectoryRelationType {
  const relativePath = relative(sourcePath, targetPath)

  if (!relativePath) {
    return 'same'
  }
  if (/^[./]*$/.test(relativePath)) {
    return 'parent'
  }
  if (!relativePath.startsWith('..')) {
    return 'child'
  }
  return 'diff'
}
