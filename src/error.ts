import { normalize } from 'pathe'

export const FsErrorCode = {
  Unknown: 0,
  AlreadyExists: 1,
  NotFound: 2,
  TypeMisMatch: 3,
  NoPermissions: 4,
  Unavailable: 5,
} as const

export class FsError extends Error {
  public constructor(
    public code: (typeof FsErrorCode)[keyof typeof FsErrorCode],
    public fn: string,
    public path: string,
    public path2: string,
    msg: string,
  ) {
    super(msg)
  }
}

export function toFsError(
  code: (typeof FsErrorCode)[keyof typeof FsErrorCode],
  fn: string,
  msg: string,
  path: string,
  path2: string,
) {
  return new FsError(code, fn, normalize(path), path2, msg)
}
