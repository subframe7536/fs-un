import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  entry: {
    index: './src/index.ts',
    web: './src/web/index.ts',
    utils: './src/utils.ts',
  },
  external: ['vite', 'esbuild', 'original-fs'],
})
