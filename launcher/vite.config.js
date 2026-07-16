import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  clearScreen: false,
  // 打包后由 Electron 以 file:// 方式加载 dist/index.html，资源需相对路径引用
  base: './',
  server: {
    port: 1420,
    strictPort: true,
  },
  build: {
    target: ['es2021', 'chrome110'],
    minify: 'esbuild',
    sourcemap: false,
  },
})
