# -*- coding: utf-8 -*-
"""真实端到端 IDP（用系统中文字体合成发票，验证中文字段抽取）。用完即删。"""
import asyncio, io, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / "backend"))


def make_invoice_png() -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    img = Image.new("RGB", (640, 380), "white")
    d = ImageDraw.Draw(img)
    font = None
    for fp in ("C:/Windows/Fonts/msyh.ttc", "C:/Windows/Fonts/simhei.ttf", "C:/Windows/Fonts/simsun.ttc"):
        if Path(fp).exists():
            try:
                font = ImageFont.truetype(fp, 22); break
            except Exception:
                pass
    lines = [
        "增值税普通发票",
        "发票号码: 24317000000123456",
        "开票日期: 2026-03-15",
        "销售方名称: 北京云图科技有限公司",
        "购买方名称: 上海创想信息技术有限公司",
        "金额(不含税): 1000.00",
        "税额: 130.00",
        "价税合计: 1130.00",
    ]
    y = 16
    for ln in lines:
        d.text((20, y), ln, fill="black", font=font)
        y += 42
    buf = io.BytesIO(); img.save(buf, format="PNG"); return buf.getvalue()


async def main():
    from app.services import idp_service
    res = await idp_service.extract(make_invoice_png(), "invoice.png", "invoice", actor="e2e")
    print("success:", res.get("success"), "| valid:", res.get("valid"))
    for f in res.get("fields", []):
        print(f"  {f['name']} = {f['value']}  (conf={f.get('confidence')})")
    print("issues:", res.get("issues"))


if __name__ == "__main__":
    asyncio.run(main())
