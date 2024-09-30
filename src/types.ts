import type { AnyFunction, Prettify, Promisable } from '@subframe7536/type-utils'
import type { FsError } from './error'

export type DirectoryRelationType = 'same' | 'child' | 'parent' | 'diff'

export type BaseFileAttr = {
  /**
   * Relative dir path of root, start without `.`
   */
  dir: string
  /**
   * File name without extension name, e.g. `README`
   */
  name: string
  /**
   * Extension name with dot, e.g. `.md`
   */
  ext: string
}

export type FileAttr = Prettify<BaseFileAttr & {
  /**
   * File size
   */
  size: number
  /**
   * File change time
   */
  modifiedTime: Date
}>

export type MoveOptions = {
  /**
   * Whether overwrite target path
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

export type ReadStreamEvent = {
  /**
   * Called when an error occurs
   */
  error?: (error: FsError) => Promisable<void>
  /**
   * Called when data is read
   */
  data?: (data: Uint8Array) => Promisable<void>
  /**
   * Called when stream ends
   */
  end?: () => Promisable<void>
}

export type ReadStreamOptions = {
  /**
   * Start position in the stream
   * @default 0
   */
  position?: number
  /**
   * Read length
   */
  length?: number
  /**
   * Abort signal
   */
  signal?: AbortSignal
}

export interface IReadonlyFS {
  /**
   * Check file or directory
   */
  exists: (path: string) => Promise<PathType>

  /**
   * Get file attributes
   */
  fileAttr: (path: string) => Promise<FileAttr | undefined>

  /**
   * List directory
   * @throws no such dir
   */
  list: (path: string) => AsyncIterable<ListState>

  /**
   * Read file data as Uint8Array
   */
  readByte: (path: string) => Promise<Uint8Array | undefined>
  /**
   * Read file data as string
   */
  readText: (path: string) => Promise<string | undefined>
}

export interface IStreamFs {
  /**
   * Streamly read file content
   */
  readStream: (path: string, listener: ReadStreamEvent, options?: ReadStreamOptions) => Promise<void>
}

export interface IFS extends IReadonlyFS, IStreamFs {
  /**
   * Ensure directory exists, auto create parent directory
   */
  mkdir: (path: string) => Promise<void>

  /**
   * Write data to file
   */
  writeFile: (path: string, data: string | ArrayBuffer | ArrayBufferView, options?: OverwriteOptions) => Promise<void>

  /**
   * Move or rename file or dir, in default, throw error when overwrite by default
   */
  move: (from: string, to: string, options?: MoveOptions) => Promise<void>

  /**
   * Copy file or dir, throw error when overwrite by default
   */
  copy: (from: string, to: string, options?: OverwriteOptions) => Promise<void>

  /**
   * Remove directory and file recursively
   */
  remove: (path: string) => Promise<void>
}

export type WalkOptions<T extends AnyFunction, N> = {
  /**
   * Whether to include directories
   */
  includeDirs?: boolean
  /**
   * Whether to prepend root dir path when transform
   */
  withRootPath?: boolean
  /**
   * Max directory depth
   */
  maxDepth?: number
  /**
   * Filter files or directories, executed before `transform`
   */
  filter?: (path: string, isDirectory: boolean) => boolean
  /**
   * Abort controller
   */
  signal?: AbortSignal
  /**
   * Transform result, `state` is undefined if `isDirectory` is `true`
   */
  transform?: T
  /**
   * Whether to filter `null` and `undefined` result from `transform`
   * @default true
   */
  notNullish?: N
}
