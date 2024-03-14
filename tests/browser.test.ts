import { WebFS, getOpfsRoot } from '../src/web'
import { testSuite } from './utils'

const root = await getOpfsRoot()
testSuite(new WebFS(root))
