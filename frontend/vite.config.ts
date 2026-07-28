import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'

/**
 * 加载配置文件
 */
function loadConfig() {
  const configPath = path.resolve(__dirname, '../WebRPAConfig.json')
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      return { frontend: config.frontend || {}, backend: config.backend || {} }
    } else {
      console.log('[Config] 配置文件不存在，使用默认配置')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[Config] 读取配置文件失败:', errorMessage, '，使用默认配置')
  }

  // 返回默认配置
  return {
    frontend: { host: '0.0.0.0', port: 5173 },
    backend: {},
  }
}

// 加载配置
const rootConfig = loadConfig()
const config = rootConfig.frontend
// 后端端口在构建/启动时从**根目录**配置注入。
// 运行时原本只依赖 public/WebRPAConfig.json 这个副本，用户手改根配置（README 明确
// 允许）却没经过启动器保存时副本不会更新，前端就会拿旧端口请求后端、整站失败。
// 这里把根配置的真值编译进产物，作为副本读取失败/过期时的可靠兜底。
const backendPortFromRoot = Number(rootConfig.backend?.port) || 0
console.log(`[Config] 前端服务配置: host=${config.host}, port=${config.port}`
  + `, 注入后端端口=${backendPortFromRoot || '(未配置)'}`)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // 根目录 WebRPAConfig.json 里的后端端口（0 表示未配置，运行时按默认值处理）
    __WEBRPA_BACKEND_PORT__: JSON.stringify(backendPortFromRoot),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: config.host || '0.0.0.0', // 允许局域网访问
    port: config.port || 5173,
    strictPort: true, // 端口被占用时报错，而不是自动尝试下一个端口
  },
  // 优化 Monaco Editor 打包
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 关键修复（编辑器白屏根因）：Vite 注入的 __vitePreload 辅助模块（preload-helper）
          // 以及 commonjs 互操作 helper 必须固定并入 vendor 这种"启动时一定加载"的 chunk。
          // 否则 Rollup 可能把这些共享 helper 分配到 monaco-editor 等"仅懒加载"的 chunk 里，
          // 导致 vendor 反向 `import ... from "./monaco-editor-xxx.js"`，使 monaco 在启动时
          // 就被静态加载执行，触发 "Cannot read properties of undefined (reading 'create')" 整页白屏。
          if (
            id.includes('vite/preload-helper') ||
            id.includes('vite/modulepreload-polyfill') ||
            id.includes('commonjsHelpers') ||
            id.includes('commonjs-dynamic-modules')
          ) {
            return 'vendor'
          }
          if (!id.includes('node_modules')) return
          if (id.includes('monaco-editor') || id.includes('@monaco-editor')) return 'monaco-editor'
          // reactflow 必须在 react 判断之前（名字含 react）
          if (id.includes('reactflow') || id.includes('@reactflow') || id.includes('@xyflow')) return 'reactflow'
          // React 全家桶必须在同一 chunk：react / react-dom / scheduler / jsx-runtime
          // 否则 react-dom 给 scheduler 设置 unstable_now 时会因跨 chunk 初始化顺序报错
          if (
            id.includes('/react-dom/') || id.includes('/react/') ||
            id.includes('/scheduler/') || id.includes('/react-is/') ||
            id.includes('use-sync-external-store')
          ) return 'react-vendor'
          if (id.includes('elkjs')) return 'elkjs'
          if (id.includes('xlsx') || id.includes('exceljs')) return 'excel-vendor'
          return 'vendor'
        },
      },
    },
  },
})
