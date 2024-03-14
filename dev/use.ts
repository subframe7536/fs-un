import { get, set } from 'idb-keyval'
import { getUserRoot } from '../src/web'

export async function initHandle() {
  const root = await get('root') as FileSystemDirectoryHandle
  if (root) {
    await root.requestPermission({ mode: 'readwrite' })
    return root
  }
  const newHandle = await getUserRoot()
  await set('root', newHandle)
  return newHandle
}
