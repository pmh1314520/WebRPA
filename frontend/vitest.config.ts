import { defineConfig } from 'vitest/config'
import path from 'path'

// Vitest 专用配置：与应用打包配置（vite.config.ts）解耦。
// 使用 jsdom 环境，使依赖链中在模块加载时读取 window 的代码（如 services/config.ts）可正常解析。
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      // 仅统计核心源码，排除入口/类型声明/测试自身/构建产物
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
      ],
    },
  },
})
