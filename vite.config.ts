import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so GitHub Pages works from any subpath
  base: './',
  build: {
    target: 'es2022',
  },
})
