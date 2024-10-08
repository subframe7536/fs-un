import { normalize } from 'pathe'

export const FsErrorCode = {
  AlreadyExists: 'AlreadyExists',
  NotExists: 'NotExists',
  TypeMisMatch: 'TypeMisMatch',
  NoPermission: 'NoPermission',
  Unknown: 'Unknown',
} as const

export class FsError extends Error {
  public constructor(
    public code: (typeof FsErrorCode)[keyof typeof FsErrorCode],
    public fn: string,
    msg: string,
    public path: string,
    public path2?: string,
  ) {
    super(`[${code} in \`${fn}\`] ${msg}, ${path}${path2 ? ` -> ${path2}` : ''}`)
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
