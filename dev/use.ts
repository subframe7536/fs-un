import { get, set } from 'idb-keyval'
import { getUserDir } from '../src/browser'

export async function initHandle() {
  const root = await get('root') as FileSystemDirectoryHandle
  if (root) {
    await root.requestPermission({ mode: 'readwrite' })
    return root
  }
  const newHandle = await getUserDir()
  await set('root', newHandle)
  return newHandle
}
