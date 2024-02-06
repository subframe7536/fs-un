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
  overwrite?: boolean
  renameMode?: boolean
}

export type CopyOptions = {
  overwrite?: boolean
  match?: (path: string, isFile: boolean) => Promisable<boolean>
}

// todo: https://docs.obsidian.md/Reference/TypeScript+API/FileSystemAdapter#Methods
export interface DirectoryManager<BufferType> {
  find: (path: string, options: FindOptions) => Promise<string[]>

  read: ((path: string, type: 'buffer') => Promise<BufferType>) & ((path: string, type: 'text') => Promise<string>) & (<K = any>(path: string, type: 'json') => Promise<K>)

  write: (path: string, data: string | BufferType | object, writeFn?: (data: any) => string) => Promise<void>

  parseDir: (path: string, cb?: (path: string, attr: FileAttr) => (FileAttr | undefined)) => Promise<FileAttr[]>

  parseFileAttr: (path: string, root: string) => Promise<FileAttr>

  exists: (path: string) => Promise<'file' | 'dir' | 'other' | false>

  ensureDir: (path: string) => Promise<void>

  move: (from: string, to: string, options?: MoveOptions) => Promise<void>

  copy: (from: string, to: string, options?: CopyOptions) => Promise<void>

  remove: (path: string) => Promise<void>
}
