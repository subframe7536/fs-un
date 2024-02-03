import { get, set } from 'idb-keyval'
import { getRootHandle } from '../src/browser'

export async function initHandle() {
  const root = await get('root')
  if (root) {
    return root
  }
  const newHandle = await getRootHandle()
  await set('root', newHandle)
  return newHandle
}
