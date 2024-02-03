import { join } from 'pathe'
import type { CopyOptions, DirectoryManager, FileAttr, FilterFn, FindOptions, MoveOptions } from '../types'
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

export function createNodeDirectoryManager(options: DirOptions) {
  const { rootPath, filter } = options
  if (!_.exists(rootPath)) {
    throw new Error(`root path not exist: ${rootPath}`)
  }
  return new NodeDirectoryManager(rootPath, filter)
}

export class NodeDirectoryManager implements DirectoryManager<Buffer> {
  public constructor(
    public rootPath: string,
    private filter?: (path: string, attr: FileAttr) => (FileAttr | undefined),
  ) { }

  private full(p: string) {
    return join(this.rootPath, p)
  }

  public async copy(from: string, to: string, options?: CopyOptions | undefined): Promise<void> {
    await _.copy(this.full(from), this.full(to), options)
  }

  public async exists(path: string): Promise<false | 'file' | 'dir' | 'other'> {
    return await _.exists(this.full(path), false)
  }

  public async find(path: string, options: FindOptions): Promise<string[]> {
    return await _.find(this.full(path), options)
  }

  public async mkdir(path: string): Promise<void> {
    await _.mkdir(this.full(path))
  }

  public async move(from: string, to: string, options?: MoveOptions | undefined): Promise<void> {
    await _.move(this.full(from), this.full(to), options)
  }

  public async parseDir(path: string, cb?: (path: string, attr: FileAttr) => (FileAttr | undefined)): Promise<FileAttr[]> {
    return await _.parseDir(this.full(path), this.filter || cb)
  }

  public async parseFileAttr(path: string): Promise<FileAttr> {
    if (await this.exists(path) !== 'file') {
      throw new Error(`"${path}" does not exists`)
    }
    return await _.parseFileAttr(this.full(path))
  }

  async read(path: string, type: 'buffer'): Promise<Buffer>
  async read(path: string, type: 'text'): Promise<string>
  async read<K = any>(path: string, type: 'json'): Promise<K>
  async read(path: string, type: any) {
    return await _.read(this.full(path), type) as any
  }

  async remove(path: string): Promise<void> {
    await _.remove(this.full(path))
  }

  async write(path: string, data: string | object | Buffer, writeFn = JSON.stringify): Promise<void> {
    if (typeof data === 'string') {
      await _.write(this.full(path), data, 'utf-8')
    } else if (data instanceof Buffer) {
      await _.write(this.full(path), data)
    } else {
      await _.write(this.full(path), writeFn(data), 'utf-8')
    }
  }
}
