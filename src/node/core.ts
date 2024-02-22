import fsp from 'node:fs/promises'
import { join } from 'pathe'
import type { CopyOptions, DirectoryManager, FileAttr, FilterFn, FindOptions, MoveOptions, PathType } from '../types'
import * as _ from './utils'

export type DirOptions = {
  /**
   * dir path
   */
  rootPath: string
  /**
   * filter function
   */
  filter?: FilterFn
}

/**
 * all path is relative path
 */
export class NodeDirectoryManager implements DirectoryManager<Buffer> {
  private constructor(
    public rootPath: string,
    private filter?: (path: string, attr: FileAttr) => (FileAttr | undefined),
  ) { }

  public static async init(rootPath: string, filter?: (path: string, attr: FileAttr) => (FileAttr | undefined)) {
    return new NodeDirectoryManager(rootPath, filter)
  }

  private parsePath(p: string) {
    return join(this.rootPath, p)
  }

  public async copy(from: string, to: string, options?: CopyOptions | undefined): Promise<void> {
    await _.copy(this.parsePath(from), this.parsePath(to), options)
  }

  public async exists(path: string): Promise<PathType> {
    return await _.exists(this.parsePath(path), false)
  }

  public async find(path: string, options: FindOptions): Promise<string[]> {
    return await _.find(this.parsePath(path), options)
  }

  public async ensureDir(path: string): Promise<string | undefined> {
    return await _.mkdir(this.parsePath(path))
  }

  public async move(from: string, to: string, options?: MoveOptions | undefined): Promise<void> {
    await _.move(this.parsePath(from), this.parsePath(to), options)
  }

  public async parseDir(path: string, cb?: (path: string, attr: FileAttr) => (FileAttr | undefined)): Promise<FileAttr[]> {
    return await _.parseDir(this.parsePath(path), this.filter || cb)
  }

  public async parseFileAttr(path: string): Promise<FileAttr> {
    if (await this.exists(path) !== 'file') {
      throw new Error(`"${path}" does not exists`)
    }
    return await _.parseFileAttr(this.parsePath(path))
  }

  async read(path: string, type: 'buffer'): Promise<Buffer | undefined>
  async read(path: string, type: 'text'): Promise<string | undefined>
  async read<K = any>(path: string, type: 'json', parse?: (str: string) => any): Promise<K | undefined>
  async read(path: string, type: any, parse = JSON.parse): Promise<any> {
    return await _.read(this.parsePath(path), type, parse) as any
  }

  async remove(path: string): Promise<void> {
    await _.remove(this.parsePath(path))
  }

  async write(path: string, data: string | object | Buffer, writeFn = JSON.stringify): Promise<void> {
    if (typeof data === 'string') {
      await _.write(this.parsePath(path), data, 'utf-8')
    } else if (data instanceof Buffer) {
      await _.write(this.parsePath(path), data)
    } else {
      await _.write(this.parsePath(path), writeFn(data), 'utf-8')
    }
  }
}
