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
  async function handleClick() {
    const handle = await getUserRoot({ mode: 'readwrite' })
    // console.log(
    //   walk(handle, { includeDirs: true, maxDepth: 3, withRootPath: true }),
    // )
    for await (const path of walk(handle, { includeDirs: true, maxDepth: 3, withRootPath: true })) {
      console.log(path)
    }
    const manager = new WebFS(handle)
    await manager.writeFile('test/test/test.txt', 'test')
    console.log(await manager.exists('test/test/test.txt'))
  }
  return (
    <div>
      <button onClick={handleClick}>fetch</button>
    </div>
  )
}
