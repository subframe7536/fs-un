# fs-un

Unified util to manage files and directories inside a directory on different platforms

## Usage

## Support Platforms

### Node

Nodejs `fs` module

```ts
import { NodeFS, walk } from 'fs-un'

const ifs = new NodeFS('/path/to/dir')

walk(ifs.root)
```

### Web

[`File Systen Access API`](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

```ts
import { getOpfsRoot, getUserRoot, isSupportOpfsRoot, isSupportUserRoot, walk, WebFS } from 'fs-un/web'

let root
if (isSupportUserRoot()) {
  root = await getUserRoot()
} else if (isSupportOpfsRoot()) {
  root = await getOpfsRoot()
} else {
  throw new Error('not support')
}

const ifs = new WebFS(root)

walk(ifs.root)
```

### Types

See more in [`types.ts`](src/types.ts)

```ts
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
   * Read file data as Buffer or Uint8Array
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
   *
   * If received data is undefined, the stream is ended
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
```

## Reference

- [humanfs](https://github.com/humanwhocodes/humanfs/blob/main/packages/web/src/web-hfs.js)
- [vscode](https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/browser/htmlFileSystemProvider.ts)
- [whatwg/fs](https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md)
