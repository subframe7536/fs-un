import type { Prettify, Promisable } from '@subframe7536/type-utils'

export type FilterFn = (path: string, attr: FileAttr) => (FileAttr | undefined)

export type BaseFileAttr = {
  /**
   * relative dir path of root, start without `./`
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
   * file scan time
   */
  scanTime?: Date
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
  renameMode?: boolean
}

export type CopyOptions = {
  /**
   * whether overwrite target path
   */
  overwrite?: boolean
  /**
   * filter files when copy directory
   */
  match?: (path: string, isFile: boolean) => Promisable<boolean>
}

export type PathType = 'file' | 'dir' | 'other' | false

// todo: https://docs.obsidian.md/Reference/TypeScript+API/FileSystemAdapter#Methods
export interface DirectoryManager<BufferType> {
  /**
   * find files
   */
  find: (path: string, options: FindOptions) => Promise<string[]>

  /**
   * read file data
   */
  read: {
    (path: string, type: 'buffer'): Promise<BufferType | undefined>
    (path: string, type: 'text'): Promise<string | undefined>
    <K = any>(path: string, type: 'json', parse?: (str: string) => any): Promise<K | undefined>
  }

  /**
   * write data to file
   */
  write: (path: string, data: string | BufferType | object, writeFn?: (data: any) => string) => Promise<void>

  /**
   * parse files attributes in directory
   */
  parseDir: (path: string, cb?: (path: string, attr: FileAttr) => (FileAttr | undefined)) => Promise<FileAttr[]>

  /**
   * parse file attributes
   */
  parseFileAttr: (path: string) => Promise<FileAttr>

  /**
   * check file or directory
   */
  exists: (path: string) => Promise<PathType>

  /**
   * make sure directory exist, auto create parent directory
   *
   * return ensured path. if is `undefined`, `path` is a exist file
   */
  ensureDir: (path: string) => Promise<string | undefined>

  /**
   * move file or directory, throw when overwrite by default
   */
  move: (from: string, to: string, options?: MoveOptions) => Promise<void>

  /**
   * copy file or directory, throw when overwrite by default
   */
  copy: (from: string, to: string, options?: CopyOptions) => Promise<void>

  /**
   * remove directory and file recursively
   */
  remove: (path: string) => Promise<void>
}
