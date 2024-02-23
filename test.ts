import { walkDir } from './src'

const path = 'src'
walkDir(path, { includeDirs: true }).then(l => console.log(l))
