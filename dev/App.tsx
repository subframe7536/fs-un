import { getUserRoot, walk, WebFS } from '../src/web'

// export default function App() {
//   const [root, setRoot] = createSignal<FileSystemDirectoryHandle>()
//   async function handleClick() {
//     setRoot(await initHandle())
//   }
//   async function logSize() {
//     const handle = await root()?.getFileHandle('_CHECK', { create: true })
//     console.log((await handle?.getFile())?.size)
//   }
//   return (
//     <div>
//       <button onClick={handleClick}>fetch</button>
//       <button onClick={logSize}>log size</button>
//       <For each={[1, 2, 3, 4]}>
//         {item => <div>{item}</div>}
//       </For>
//     </div>
//   )
// }
export default function App() {
  let handle: FileSystemDirectoryHandle | null
  async function handleClick() {
    handle = await getUserRoot({ mode: 'readwrite' })
    // console.log(
    //   walk(handle, { includeDirs: true, maxDepth: 3, withRootPath: true }),
    // )
    for await (const path of walk(handle, { includeDirs: true, maxDepth: 3, withRootPath: true })) {
      console.log(path)
    }
  }

  async function write() {
    if (!handle) {
      console.log('No file handle')
      return
    }
    const manager = new WebFS(handle)
    const p = 'test/test.txt'
    await manager.remove(p)
    await manager.writeFile(p, 'test')
    console.log(await manager.exists(p))
  }
  return (
    <div>
      <button onClick={handleClick}>1. get dir</button>
      <button onClick={write}>2. write</button>
    </div>
  )
}
