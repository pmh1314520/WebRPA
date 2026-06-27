"""赞助与致谢 - 读取 README 中已有的赞助者表格 + 提供已有的收款码图片。

赞助者名单沿用 README.md 里作者手动维护的表格：
    | 序号 | 付款账户 | 赞助日期 | 赞助金额 |
随版本更新、非实时。收款码复用仓库根目录 png/ 下的微信、支付宝收款码图片。
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, Response

router = APIRouter(prefix="/api/sponsors", tags=["sponsors"])

# 赞助表格表头标志（命中后逐行解析其后的数据行）
_TABLE_HEADER_KEYS = ("付款账户", "赞助金额")

# 收款码图片：复用仓库根 png/ 下作者已维护的收款码（按顺序探测）
_QR_FILES = {
    "wechat": ["微信收款码.png", "微信收款码.jpg", "微信收款码.jpeg"],
    "alipay": ["支付宝收款码.jpg", "支付宝收款码.png", "支付宝收款码.jpeg"],
}


def _project_root() -> Path:
    # backend/app/api/sponsors.py -> 项目根
    return Path(__file__).resolve().parents[3]


def _readme_path() -> Path:
    return _project_root() / "README.md"


def _png_dir() -> Path:
    return _project_root() / "png"


def parse_sponsors(text: str) -> list[dict]:
    """解析 README 中的赞助者表格。

    识别表头 ``| 序号 | 付款账户 | 赞助日期 | 赞助金额 |`` 之后、连续的 Markdown
    表格数据行（``| 1 | 名称 | 日期 | 金额 |``），跳过分隔行（``| :--: |``）。
    返回按 README 中的顺序排列的 ``{name, date, amount}`` 列表。
    """
    out: list[dict] = []
    if not text:
        return out
    lines = text.splitlines()
    in_table = False
    for raw in lines:
        line = raw.strip()
        is_table_row = line.startswith("|")
        if not in_table:
            if is_table_row and all(k in line for k in _TABLE_HEADER_KEYS):
                in_table = True
            continue
        # 已进入表格区：遇到非表格行即结束
        if not is_table_row:
            break
        # 拆分单元格（去掉首尾空串）
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        # 跳过对齐分隔行（形如 :--: / --- / :-- 等）
        joined = "".join(cells).replace(":", "").replace("-", "").replace(" ", "")
        if joined == "":
            continue
        # 期望列：序号 | 付款账户 | 赞助日期 | 赞助金额
        name = cells[1] if len(cells) > 1 else ""
        date = cells[2] if len(cells) > 2 else ""
        amount = cells[3] if len(cells) > 3 else ""
        if not name:
            continue
        out.append({"name": name, "date": date, "amount": amount})
    return out


@router.get("/list")
async def list_sponsors():
    """返回赞助者名单（从 README 表格解析，随版本更新，非实时）。最新赞助在前。"""
    try:
        text = _readme_path().read_text(encoding="utf-8")
    except Exception:
        return {"sponsors": [], "count": 0}
    sponsors = parse_sponsors(text)
    # README 表格按时间正序维护，这里倒序让最新赞助者显示在前
    sponsors = list(reversed(sponsors))
    return {"sponsors": sponsors, "count": len(sponsors)}


@router.get("/status")
async def sponsor_status():
    """返回各收款码是否已配置，供前端决定显示真实图还是占位。"""
    def _has(kind: str) -> bool:
        return any((_png_dir() / fn).exists() for fn in _QR_FILES[kind])

    return {"wechat": _has("wechat"), "alipay": _has("alipay")}


@router.get("/qr/{kind}")
async def sponsor_qr(kind: str):
    """返回指定收款码图片（wechat / alipay）；未配置返回 404。"""
    cands = _QR_FILES.get(kind)
    if not cands:
        return Response(status_code=404)
    for fn in cands:
        p = _png_dir() / fn
        if p.exists() and p.is_file():
            return FileResponse(str(p))
    return Response(status_code=404)
