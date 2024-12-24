# fs-un

Unified util to manage files and directories inside a directory on different platforms

**WIP, breaking changes expected between patch versions!!**

## Install

```sh
npm install fs-un
```

```sh
yarn add fs-un
```

```sh
pnpm add fs-un
```

## Usage

### Node

Using nodejs `fs` module

```ts
import { NodeFS, walk } from 'fs-un'

const ifs = new NodeFS('/path/to/dir')

for await (const path of walk(ifs.root, { includeDirs: true, transform: (path, isDirectory) => path })) {
  console.log(path)
}
```

### Web

Using [File Systen Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)

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

for await (const path of walk(ifs.root, { includeDirs: true, transform: (path, fileHandle) => path })) {
  console.log(path)
}
```

### Types

See more in [`types.ts`](src/types.ts)

```ts
export type ReadStreamEvent = {
  on: {
    /**
     * Called when an error occurs
     */
    (event: 'error', callback: (error: FsError) => void): void
    /**
     * Called when data is read
     */
    (event: 'data', callback: (data: Uint8Array) => void): void
    /**
     * Called when stream ends
     */
    (event: 'end', callback: (isAborted?: true) => void): void
  }
}

export type ReadableStreamOptions = {
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

export interface IReadonlyFS<RootType> {
  readonly root: RootType
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
  readStream: (path: string, options?: ReadableStreamOptions) => ReadStreamEvent
}

export interface IFS<RootType = any> extends IReadonlyFS<RootType>, IStreamFs {
  /**
   * Ensure directory exists, auto create parent directory
   */
  mkdir: (path: string) => Promise<void>

  /**
   * Append data to file
   */
  appendFile: (path: string, data: string | Uint8Array) => Promise<void>

  /**
   * Write data to file
   */
  writeFile: (path: string, data: string | Uint8Array, options?: OverwriteOptions) => Promise<void>

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
```

## Reference

- [humanfs](https://github.com/humanwhocodes/humanfs/blob/main/packages/web/src/web-hfs.js)
- [vscode](https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/browser/htmlFileSystemProvider.ts)
- [whatwg/fs](https://github.com/whatwg/fs/blob/main/proposals/MovingNonOpfsFiles.md)
