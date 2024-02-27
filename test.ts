import { walk } from './src'

const path = 'src'
walk(path, { includeDirs: true }).then(l => console.log(l))
