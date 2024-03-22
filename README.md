# fs-un

unified util to manage files and directories inside a directory on different platforms

## Usage

## support platform

### Node

Nodejs `fs` module

```ts
import { NodeIFS, walk } from 'fs-un'

const ifs = new NodeIFS('/path/to/dir')

walk(ifs.root)
```

### Web

[`File Systen Access API`](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

```ts
import { WebIFS, getOpfsRoot, getUserRoot, isSupportOpfsRoot, isSupportUserRoot, walk } from 'fs-un/web'

let root
if (isSupportUserRoot()) {
  root = await getUserRoot()
} else if (isSupportOpfsRoot()) {
  root = await getOpfsRoot()
} else {
  throw new Error('not support')
}

const ifs = new WebIFS(root)

walk(ifs.root)
```

### types

```ts
export interface IReadonlyFS {
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

export interface IFS extends IReadonlyFS {
  /**
   * ensure directory exists, auto create parent directory
   */
  mkdir: (path: string) => Promise<void>

  /**
   * write data to file
   */
  writeFile: (path: string, data: string | ArrayBuffer | ArrayBufferView, options?: OverwriteOptions) => Promise<void>

  /**
   * move or rename file or dir, in default, throw error when overwrite by default
   */
  move: (from: string, to: string, options?: MoveOptions) => Promise<void>

  /**
   * copy file or dir, throw error when overwrite by default
   */
  copy: (from: string, to: string, options?: OverwriteOptions) => Promise<void>

  /**
   * remove directory and file recursively
   */
  remove: (path: string) => Promise<void>
}
```

## reference

- [humanfs](https://github.com/humanwhocodes/humanfs/blob/main/packages/web/src/web-hfs.js)
- [vscode](https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/browser/htmlFileSystemProvider.ts)
- [whatwg/fs](https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md)
