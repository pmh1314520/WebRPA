// 录制器生成节点的蛇形（横向长方形）自动排版
// 录制得到的是一条线性节点链，纯竖排又长又难看；此处按"蛇形"（boustrophedon）
// 排布：第一行从左到右，第二行从右到左，逐行折返，形成横向长方形且连线自动拐弯。

export interface LayoutNode {
  id: string
  position: { x: number; y: number }
  width?: number
  height?: number
  measured?: { width?: number; height?: number }
  [k: string]: any
}

export interface SerpentineOptions {
  xStep?: number       // 列间距
  yStep?: number       // 行间距
  startX?: number
  startY?: number
  cols?: number        // 每行列数；不传则按"偏横向长方形"自动推算
}

/**
 * 就地为 newNodes 计算蛇形网格坐标（横向长方形，逐行折返）。
 * @param newNodes 本次新增、需要排版的线性节点链（顺序即执行顺序）
 * @param existingNodes 画布上已有节点，用于计算起始 Y，避免与旧节点重叠
 */
export function applySerpentineLayout(
  newNodes: LayoutNode[],
  existingNodes: LayoutNode[] = [],
  opts: SerpentineOptions = {},
): void {
  const count = newNodes.length
  if (!count) return

  const xStep = opts.xStep ?? 320
  const yStep = opts.yStep ?? 200

  // 每行列数：偏向横向长方形（宽 > 高），列数约为 sqrt(count * 2)，并限定在 [3, 8]
  let cols = opts.cols ?? Math.round(Math.sqrt(count * 2))
  cols = Math.max(3, Math.min(8, cols))
  cols = Math.min(cols, count) // 节点很少时不必留空列

  // 起始坐标：默认左上留白；若画布已有节点，则排在其下方，避免重叠
  let startX = opts.startX ?? 120
  let startY = opts.startY ?? 80
  if (existingNodes.length) {
    let maxBottom = -Infinity
    let minLeft = Infinity
    for (const n of existingNodes) {
      const p = n.position
      if (!p) continue
      const h = n.height || n.measured?.height || 90
      maxBottom = Math.max(maxBottom, p.y + h)
      minLeft = Math.min(minLeft, p.x)
    }
    if (Number.isFinite(maxBottom)) startY = maxBottom + 140
    if (Number.isFinite(minLeft)) startX = minLeft
  }

  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols)
    const posInRow = i % cols
    // 偶数行从左到右，奇数行从右到左 —— 折返形成蛇形，连线自动拐弯回下一行起点
    const col = row % 2 === 0 ? posInRow : cols - 1 - posInRow
    newNodes[i].position = { x: startX + col * xStep, y: startY + row * yStep }
  }
}
