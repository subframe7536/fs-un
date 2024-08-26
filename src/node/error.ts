import { type FsError, FsErrorCode, toFsError } from '../error'

export function isNotExistsError(err: any): boolean {
  return err.code === 'ENOENT'
}

export function isAnotherDeviceError(err: any): boolean {
  return err.code === 'EXDEV'
}

export function isDirError(err: any): boolean {
  return err.code === 'EISDIR'
}

export function notDirError(err: any): boolean {
  return err.code === 'ENOTDIR'
}

export function isNoPermissionError(err: any): boolean {
  return err.code === 'EACCES' || err.code === 'EPERM'
}

export function isAlreadyExistError(err: any): boolean {
  return err.code === 'EEXIST'
}

export function handleRestError(err: any, fn: string, path: string, path2?: string): FsError {
  let code: (typeof FsErrorCode)[keyof typeof FsErrorCode]
  switch (err.code) {
    case 'EACCES':
    case 'EPERM':
      code = FsErrorCode.NoPermission
      break
    case 'EEXIST':
      code = FsErrorCode.AlreadyExists
      break
    case 'EISDIR':
    case 'ENOTDIR':
      code = FsErrorCode.TypeMisMatch
      break
    case 'ENOENT':
      code = FsErrorCode.NotExists
      break
    default:
      code = FsErrorCode.Unknown
  }
  return toFsError(code, fn, (err as Error).message, path, path2)
}
