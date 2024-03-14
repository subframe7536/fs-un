import type { AnyFunction, Prettify, Promisable } from '@subframe7536/type-utils'

export type Serializer = {
  read: (parameter: string) => any
  write: (parameter: any) => string
}

export type FilterFn = (path: string, attr: FileAttr) => (FileAttr | undefined)

export type BaseFileAttr = {
  /**
   * relative dir path of root, start without `.`
   */
  dir: string
  /**
   * file name without extension
   */
  name: string
  /**
   * extension name with dot
   */
  ext: string
}
export type BaseFileAttrWithRoot = Prettify<BaseFileAttr & {
  /**
   * file root
   */
  root: string
}>
export type FileAttr = Prettify<BaseFileAttr & {
  /**
   * file size
   */
  size: number
  /**
   * file change time
   */
  modifiedTime: Date
}>
export type FindOptions = {
  recursive?: boolean
  match: (path: string, isFile: boolean) => Promisable<boolean>
}

export type MoveOptions = {
  /**
   * whether overwrite target path
   */
  overwrite?: boolean
  /**
   * `to` is name instead of path
   */
  rename?: boolean
}

export type PathType = 'file' | 'dir' | 'other' | false

export type OverwriteOptions = { overwrite?: boolean }

export type ListState = {
  name: string
  isFile: boolean
  isDirectory: boolean
  isSymlink: boolean
}

export interface IReadonlyFs {
  /**
   * check file or directory
   */
  exists: (path: string) => Promise<PathType>

  /**
   * get file attributes
   */
  fileAttr: (path: string) => Promise<FileAttr | undefined>

  /**
   * list directory
   * @throws no such dir
   */
  list: (path: string) => AsyncIterable<ListState>

  /**
   * read file data as Buffer or Uint8Array
   */
  readByte: (path: string) => Promise<Uint8Array | undefined>
  /**
   * read file data as string
   */
  readText: (path: string) => Promise<string | undefined>
}

export interface IFS extends IReadonlyFs {
  /**
   * ensure directory exists, auto create parent directory
   */
  mkdir: (path: string) => Promise<void>

  /**
   * write data to file
   */
  writeFile: (path: string, data: string | ArrayBuffer | ArrayBufferView, options?: OverwriteOptions) => Promise<void>

  /**
   * move or rename file or dir, in default, throw error when overwrite
   */
  move: (from: string, to: string, options?: MoveOptions) => Promise<void>

  /**
   * copy file or dir, in default, throw error when overwrite
   */
  copy: (from: string, to: string, options?: OverwriteOptions) => Promise<void>

  /**
   * remove directory and file recursively
   */
  remove: (path: string) => Promise<void>
}

export type WalkOptions<T extends AnyFunction, N> = {
  /**
   * whether to include directories
   */
  includeDirs?: boolean
  /**
   * whether to prepend root dir path when transform
   */
  withRootPath?: boolean
  /**
   * max directory depth
   */
  maxDepth?: number
  /**
   * filter files or directories, executed before `transform`
   */
  filter?: (path: string, isDirectory: boolean) => boolean
  /**
   * abort controller
   */
  signal?: AbortSignal
  /**
   * transform result, `state` is undefined if `isDirectory` is `true`
   */
  transform?: T
  /**
   * whether to filter `null` and `undefined` result from `transform`
   * @default true
   */
  notNullish?: N
}
