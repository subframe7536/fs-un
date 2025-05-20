import type {
  DirectoryRelationType,
  MoveOptions,
  OverwriteOptions,
  PathType,
  ReadableStreamOptions,
  StreamEmitEvents,
} from '../types'
import type { ReadStream } from 'node:fs'
import type { EventEmitter } from 'node:stream'

import { existsSync, promises as fsp } from 'node:fs'

import { dirname, join, normalize, relative, resolve } from 'pathe'

import { FsErrorCode, toFsError } from '../error'
import { HIGH_WATER_MARK } from '../utils'
import {
  handleRestError,
  isAlreadyExistError,
  isAnotherDeviceError,
  isDirError,
  isNoPermissionError,
  isNotExistsError,
} from './error'
import { walk } from './walk'

/**
 * Recursively create a directory, auto skip if exists
 */
export async function mkdir(path: string): Promise<void> {
  try {
    await fsp.mkdir(path, { recursive: true })
  } catch (err) {
    throw handleRestError(err, 'mkdir', path)
  }
}

async function copyLink(from: string, to: string): Promise<void> {
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
 * Copy files or directories, auto create parent directory
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
      throw toFsError(FsErrorCode.AlreadyExists, 'copy', `${to} already exist, cannot overwrite`, from, to)
    }
  } else {
    await mkdir(dirname(to))
  }

  try {
    switch (await exists(from)) {
      case 'dir':
        if (from.endsWith('asar') && process?.versions?.electron) {
          // @ts-expect-error electron
          (await import('node:original-fs')).copyFileSync(from, to)
        } else {
          await fsp.cp(from, to, { recursive: true })
        }
        break
      case 'file':
        await fsp.copyFile(from, to)
        break
      case 'link':
        await copyLink(from, to)
        break
      default:
        throw toFsError(FsErrorCode.NotExists, 'copy', `${from} does not exist`, from, to)
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
 * Check if path exists, if second param is true, will check 'link'
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
 * Move files or directories, auto create parent directory.
 */
export async function move(
  from: string,
  to: string,
  options: MoveOptions = {},
): Promise<void> {
  const toExists = existsSync(to)
  if (!options.overwrite && toExists) {
    throw new Error(`Target path ${to} already exists, cannot overwrite`)
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
 * Remove directory and file recursively
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

export async function readFileIntoStream(
  target: EventEmitter<StreamEmitEvents>,
  url: string,
  options: ReadableStreamOptions,
  highWaterMark = HIGH_WATER_MARK,
): Promise<void> {
  let error: Error | undefined
  let stream: ReadStream | undefined

  try {
    const { length, position = 0, signal } = options
    // Check for cancellation
    if (signal?.aborted) {
      target.emit('end', true)
      return
    }
    let fileHandle
    try {
      fileHandle = await fsp.open(url, 'r')
    } catch (error) {
      target.emit('error', handleRestError(error, 'readStream', url))
      return
    }

    stream = fileHandle.createReadStream({
      start: position,
      end: length ? position + length - 1 : undefined,
      autoClose: true,
      encoding: null, // force stream to be read as raw bytes
      highWaterMark,
    })

    for await (const chunk of stream) {
      if (signal?.aborted) {
        target.emit('end', true)
        return
      }
      target.emit('data', chunk)
    }
  } catch (err) {
    error = err as Error
  } finally {
    stream?.destroy()
    if (typeof error !== 'undefined') {
      target.emit('error', error)
    }

    target.emit('end')
  }
}
