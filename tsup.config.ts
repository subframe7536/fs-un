import { defineConfig } from 'tsup'

export default defineConfig({
  dts: true,
  clean: true,
  format: ['esm', 'cjs'],
  entry: {
    index: './src/index.ts',
    browser: './src/browser/index.ts',
  },
  external: ['vite', 'esbuild', 'original-fs'],
})
