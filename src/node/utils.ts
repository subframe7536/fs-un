import { existsSync, promises as fs } from 'node:fs'
import { basename, dirname, join, parse, relative } from 'pathe'
import type { Promisable } from '@subframe7536/type-utils'
import type { CopyOptions, FileAttr, FindOptions, MoveOptions } from '../types'

type WalkOptions<T> = {
  dirDepth?: number
  allowNullish?: T
}

export async function mkdir(path: string): Promise<string | undefined> {
  try {
    return await fs.mkdir(path, { recursive: true })
  } catch (err) {
    if (isAlreadyExistError(err)) {
      return path
    }
    throw err
  }
}
export async function copy(
  from: string,
  to: string,
  options: CopyOptions = {},
): Promise<void> {
  const { match, overwrite } = options
  if (!overwrite && existsSync(to)) {
    throw new Error(`dest path "${to}" already exists and overwrite is false`)
  }
  const copyLink = async () => {
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
  try {
    switch (await exists(from)) {
      case 'dir':
        from.endsWith('asar') && process?.versions?.electron
          // eslint-disable-next-line ts/no-var-requires, ts/no-require-imports, unicorn/prefer-node-protocol
          ? require('original-fs').copyFileSync(from, to)
          : await walkDir(from, async (path) => {
            if (!match || match(path, await exists(path) === 'file')) {
              await mkdir(dirname(path))
              await fs.copyFile(path, to)
            }
          })
        break
      case 'file':
        await fs.copyFile(from, to)
        break
      case 'link':
        await copyLink()
        break
    }
  } catch (err) {
    if (!isNotExistError(err)) {
      throw err
    }
    if (!existsSync(to)) {
      await mkdir(dirname(to))
      await copy(from, to, options)
    }
  }
}

export async function exists(path: string, link: false): Promise<'file' | 'dir' | 'other' | false>
export async function exists(path: string): Promise<'file' | 'dir' | 'other' | 'link' | false>
export async function exists(path: string, link = true): Promise<'file' | 'dir' | 'other' | 'link' | false> {
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

export async function find(path: string, { match, recursive }: FindOptions): Promise<string[]> {
  return walkDir(
    path,
    async str => match(str, await exists(str) === 'file') ? str : undefined,
    recursive ? undefined : { dirDepth: 1 },
  )
}

export async function parseDir(
  path: string,
  cb?: (path: string, attr: FileAttr) => (FileAttr | undefined),
): Promise<FileAttr[]> {
  return await walkDir(path, async (p) => {
    const attr = await parseFileAttr(p, path)
    return cb?.(path, attr) || attr
  })
}

export async function parseFileAttr(path: string, rootPath?: string): Promise<FileAttr> {
  const { size, mtime: modifiedTime } = await fs.stat(path)
  const { dir, name, ext } = parse(rootPath ? relative(rootPath, path) : path)
  return { dir, name, ext: ext.slice(1), size, modifiedTime }
}

export async function read(path: string, type: 'buffer'): Promise<Buffer>
export async function read(path: string, type: 'text'): Promise<string>
export async function read<T = any>(path: string, type: 'json', parse?: (str: string) => any): Promise<T>
export async function read(path: string, type: 'buffer' | 'text' | 'json', parse: (str: string) => any = JSON.parse) {
  switch (type) {
    case 'buffer':
      return await fs.readFile(path)
    case 'text':
      return await fs.readFile(path, 'utf-8')
    case 'json':
      return parse(await fs.readFile(path, 'utf-8'))
  }
}

export async function write(
  path: string,
  data: Parameters<typeof fs.writeFile>[1],
  options?: Parameters<typeof fs.writeFile>[2],
): Promise<void> {
  try {
    await fs.writeFile(path, data, options)
  } catch (err) {
    if (!isNotExistError(err)) {
      await fs.mkdir(dirname(path), { recursive: true })
      await fs.writeFile(path, data, options)
    } else {
      throw err
    }
  }
}

export async function move(
  from: string,
  to: string,
  { overwrite = true, renameMode }: MoveOptions = {},
): Promise<void> {
  if (!overwrite && existsSync(to)) {
    throw new Error(`dest path "${to}" already exists and overwrite is false`)
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
    if (isAnotherDeviceError(err)) {
      await copy(from, to, { overwrite })
      await remove(from)
    } else if (isNotExistError(err) && !existsSync(to)) {
      await mkdir(dirname(to))
      await fs.rename(from, to)
    } else {
      throw err
    }
  }
}

export async function remove(path: string): Promise<void> {
  await fs.rm(path, { recursive: true, maxRetries: 3, retryDelay: 500, force: true })
}

async function walkDir<T, N = false>(
  folder: string,
  fn: (path: string) => Promisable<T>,
  options?: WalkOptions<N>,
): Promise<N extends false ? Exclude<T, null | undefined>[] : T[]> {
  if ((await exists(folder)) !== 'dir') {
    throw new Error(`"${folder}" not exists or is not a dir`)
  }
  const queue = [{ currentPath: folder, depth: 0 }]
  const files: T[] = []
  const { allowNullish = false, dirDepth = Number.POSITIVE_INFINITY } = options || {}
  while (queue.length > 0) {
    const { currentPath, depth } = queue.shift()!
    const stat = await exists(currentPath)

    if (stat === 'dir' && depth < dirDepth) {
      const dirFiles = await fs.readdir(currentPath)
      await Promise.all(dirFiles.map(async file => queue.push({
        currentPath: join(currentPath, file),
        depth: depth + 1,
      })))
      continue
    }
    const result = await fn(currentPath)
    if (allowNullish || (result !== undefined && result !== null)) {
      files.push(result as T)
    }
  }
  return files as any
}

export function isNotExistError(err: unknown) {
  return (err as any)?.code === 'ENOENT'
}

export function isAnotherDeviceError(err: unknown) {
  return (err as any)?.code === 'EXDEV'
}

export function isAlreadyExistError(err: unknown) {
  return (err as any)?.code === 'EEXIST'
}
