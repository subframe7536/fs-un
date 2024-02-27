import { For, createSignal } from 'solid-js'
import { walk } from '../src/browser/walk'
import { initHandle } from './use'

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
    const handle = await window.showDirectoryPicker()
    console.log(
      await walk(handle, { includeDirs: true, maxDepth: 3, withRootPath: true }),
    )
  }
  return (
    <div>
      <button onClick={handleClick}>fetch</button>
    </div>
  )
}
