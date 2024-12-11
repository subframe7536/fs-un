import type { FileAttr } from './types'

type DiffResult = {
  insertList: FileAttr[]
  updateList: FileAttr[]
  deleteList: FileAttr[]
}

export const HIGH_WATER_MARK = 2 << 18 // 256kb

export function diffDir(oldArr: FileAttr[], newArr: FileAttr[]): DiffResult {
  const createMap = (arr: FileAttr[]): Map<string, FileAttr> => new Map(
    arr.map(item => [`${item.dir}/${item.name}${item.ext}`, item]),
  )

  const oldMap = createMap(oldArr)
  const newMap = createMap(newArr)

  const insertList: FileAttr[] = []
  const updateList: FileAttr[] = []
  const deleteList: FileAttr[] = []

  for (const [name, newItem] of newMap) {
    const oldItem = oldMap.get(name)
    if (!oldItem) {
      insertList.push(newItem)
    } else if (newItem.modifiedTime !== oldItem.modifiedTime || newItem.size !== oldItem.size) {
      updateList.push(newItem)
    }
  }

  for (const [name, oldItem] of oldMap) {
    if (!newMap.has(name)) {
      deleteList.push(oldItem)
    }
  }

  return { insertList, updateList, deleteList }
}
