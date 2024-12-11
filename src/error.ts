import { normalize } from 'pathe'

export const FsErrorCode = {
  AlreadyExists: 'AlreadyExists',
  NotExists: 'NotExists',
  TypeMisMatch: 'TypeMisMatch',
  NoPermission: 'NoPermission',
  Unknown: 'UnknownError',
} as const

export class FsError extends Error {
  public constructor(
    public code: (typeof FsErrorCode)[keyof typeof FsErrorCode],
    public fn: string,
    public message: string,
    public path: string,
    public path2?: string,
  ) {
    super(`[${code} in ${fn}()] ${message}, ${path2 ? `${path} -> ${path2}` : ''}`)
  }
}

export function toFsError(
  code: (typeof FsErrorCode)[keyof typeof FsErrorCode],
  fn: string,
  msg: string,
  path: string,
  path2?: string,
): FsError {
  return new FsError(code, fn, msg, normalize(path), path2?.normalize(path2))
}
