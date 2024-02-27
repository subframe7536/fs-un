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

export class DirectoryManagerError extends Error {
  public constructor(
    public code: typeof DirectoryManagerErrorCode,
    public fn: string,
    msg: string,
    public path: string,
  ) {
    super(msg)
  }
}

export function toDirectoryManagerError(
  code: typeof DirectoryManagerErrorCode,
  fn: string,
  msg: string,
  path: string,
) {
  return new DirectoryManagerError(code, fn, msg, normalize(path))
}
