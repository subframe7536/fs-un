import { normalize } from 'pathe'

export const DirectoryManagerErrorCode = {
  Exists: 'Exists',
  NotFound: 'NotFound',
  NotADirectory: 'NotADirectory',
  IsADirectory: 'IsADirectory',
  NoPermissions: 'NoPermissions',
  Unavailable: 'Unavailable',
  Unknown: 'Unknown',
} as const

export class FsError extends Error {
  public constructor(
    public code: typeof DirectoryManagerErrorCode,
    public fn: string,
    public path: string,
    msg: string,
  ) {
    super(msg)
  }
}

export function toFsError(
  code: typeof DirectoryManagerErrorCode,
  fn: string,
  msg: string,
  path: string,
) {
  return new FsError(code, fn, normalize(path), msg)
}
