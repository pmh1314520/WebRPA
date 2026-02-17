// 当前编辑器版本号
export const CURRENT_VERSION = '1.29.33'

// 默认工作流仓库地址
const HUB_URL = 'https://hub.pmhs.top'

export interface VersionInfo {
  version: string
  releaseDate: string
  downloadUrl: string
  changelog: string
}

/**
 * 从工作流仓库获取最新版本信息
 */
export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`${HUB_URL}/api/version`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('获取版本信息失败:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.warn('获取版本信息失败:', error)
    return null
  }
}

/**
 * 比较版本号，返回 true 表示有新版本
 */
export function hasNewVersion(current: string, latest: string): boolean {
  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0

    if (latestPart > currentPart) return true
    if (latestPart < currentPart) return false
  }

  return false
}
