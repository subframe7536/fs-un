import { BrowserDirectoryManager, getOpfsDir } from '../src/browser'
import { testSuite } from './utils'

const root = await getOpfsDir()
testSuite(new BrowserDirectoryManager(root))
