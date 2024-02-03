import { $ } from 'solid-dollar'
import { For } from 'solid-js'
import type { BrowserDirectoryManager } from '../src/browser'
import { createBrowserDirectoryManager } from '../src/browser'
import { initHandle } from './use'

export default function App() {
  let dir: BrowserDirectoryManager
  async function handleClick() {
    const root = $<FileSystemDirectoryHandle>(await initHandle())
    if (root()) {
      dir = await createBrowserDirectoryManager(root())
      dir.parseDir().then(console.log)
    }
  }
  return (
    <div>
      <button onClick={handleClick}>fetch</button>
      <For each={[1, 2, 3, 4]}>
        {item => <div>{item}</div>}
      </For>
    </div>
  )
}
