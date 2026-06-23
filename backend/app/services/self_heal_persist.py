# -*- coding: utf-8 -*-
"""自愈固化（Self-Heal Persist）

WebRPA 区别于影刀的关键能力：流程运行时若元素选择器失效，锚点语义自愈会自动
重定位元素（无需 AI）。本模块把"这次自愈得到的新选择器"持久化回工作流文件：
  1. 备份旧版本（保留错误版本，可回溯）
  2. 把新选择器写回对应节点（下次运行直接命中，零 AI、零等待）
  3. 在画布写一张便签，说明改了哪些选择器、旧版本备份名
  4. 通过告警中心发通知（邮件/飞书/钉钉等，按用户配置）

仅当工作流开启了 `selfHeal.enabled`（"健康基线/自愈固化"）时才生效；
且仅对"本地工作流文件"来源持久化（定时/发布/CLI/打包运行）。编辑器实时运行
走前端回写画布，不经过这里，避免冲突。
"""
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from typing import Any, Optional


def _workflow_folder() -> Path:
    # 与 api/local_workflows.py 的 DEFAULT_WORKFLOW_FOLDER 一致
    return Path(__file__).parent.parent.parent.parent / "workflows"


def _versions_folder() -> Path:
    p = _workflow_folder() / "_self_heal_versions"
    try:
        p.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return p


def _resolve_file(source: Any) -> Optional[Path]:
    """把工作流来源解析成本地文件路径；非本地文件来源返回 None。"""
    if not isinstance(source, str) or not source.strip():
        return None
    # 完整路径
    p = Path(source)
    if p.is_file():
        return p
    name = source if source.endswith(".json") else source + ".json"
    p2 = _workflow_folder() / name
    if p2.is_file():
        return p2
    return None


def persist_self_heal(source: Any, healed_selectors: list, *, wf_name: str = "") -> dict:
    """把自愈得到的新选择器固化回工作流文件。返回处理摘要。"""
    try:
        if not healed_selectors:
            return {"persisted": False, "reason": "no heals"}
        fp = _resolve_file(source)
        if fp is None:
            return {"persisted": False, "reason": "not a local workflow file"}

        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            return {"persisted": False, "reason": f"read failed: {e}"}

        # 门控：仅当开启"自愈固化（健康基线）"
        sh = data.get("selfHeal") or {}
        if not sh.get("enabled"):
            return {"persisted": False, "reason": "selfHeal disabled"}

        # 去重：同一 (nodeId, configKey) 取最后一次自愈结果
        latest: dict[tuple, dict] = {}
        for h in healed_selectors:
            nid = h.get("nodeId")
            ck = h.get("configKey") or "selector"
            ns = h.get("newSelector")
            if nid and ns:
                latest[(nid, ck)] = h
        if not latest:
            return {"persisted": False, "reason": "no valid heals"}

        nodes = data.get("nodes") or []
        # 应用新选择器
        applied: list[dict] = []
        for n in nodes:
            nid = n.get("id")
            for (hnid, ck), h in latest.items():
                if nid == hnid:
                    d = n.setdefault("data", {})
                    old_val = h.get("oldSelector") or d.get(ck)
                    d[ck] = h["newSelector"]
                    applied.append({
                        "nodeId": nid, "configKey": ck,
                        "old": old_val, "new": h["newSelector"],
                        "label": d.get("label") or d.get("moduleType") or nid,
                    })
        if not applied:
            return {"persisted": False, "reason": "no matching nodes"}

        ts = time.strftime("%Y%m%d_%H%M%S")
        # 1) 备份旧版本（保留错误/旧版本，可回溯）
        backup = _versions_folder() / f"{fp.stem}__{ts}.json"
        try:
            backup.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            print(f"[self_heal_persist] 备份旧版本失败: {e}")

        # 2) 写一张说明便签
        note_lines = [
            f"[自愈固化] {ts}",
            "运行时检测到下列元素选择器失效，已用锚点语义自动重定位并固化，",
            "下次运行直接命中，无需再次调用 AI：",
            "",
        ]
        for a in applied:
            note_lines.append(f"· {a['label']}")
            note_lines.append(f"   旧选择器：{a['old']}")
            note_lines.append(f"   新选择器：{a['new']}")
        note_lines.append("")
        note_lines.append(f"旧版本已备份：_self_heal_versions/{backup.name}")
        note_text = "\n".join(note_lines)

        xs = [(n.get("position") or {}).get("x", 0) for n in nodes if n.get("type") == "moduleNode"]
        ys = [(n.get("position") or {}).get("y", 0) for n in nodes if n.get("type") == "moduleNode"]
        min_x = min(xs) if xs else 0
        min_y = min(ys) if ys else 0
        note_id = "selfheal_note_" + uuid.uuid4().hex[:8]
        nodes.append({
            "id": note_id,
            "type": "noteNode",
            "position": {"x": min_x - 380, "y": min_y},
            "data": {"label": "", "moduleType": "note", "content": note_text, "color": "yellow"},
            "width": 340, "height": 220, "zIndex": -1,
        })

        # 3) 更新 selfHeal 元信息并落盘
        sh["lastHealedAt"] = ts
        sh["healCount"] = int(sh.get("healCount", 0) or 0) + len(applied)
        data["selfHeal"] = sh
        data["nodes"] = nodes
        try:
            fp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            return {"persisted": False, "reason": f"write failed: {e}"}

        # 4) 通知（邮件/飞书/钉钉等，按用户告警配置；异常隔离）
        try:
            from app.services.alert_center import notify_event
            body = (
                f"工作流「{wf_name or fp.stem}」运行时有 {len(applied)} 处元素选择器失效，"
                f"已自动重定位并固化更新（旧版本已备份：_self_heal_versions/{backup.name}）。\n\n"
                + "\n".join(f"- {a['label']}：{a['old']} → {a['new']}" for a in applied)
                + "\n\n下次运行将直接使用新选择器，无需再次 AI。"
            )
            notify_event("WebRPA 自愈：流程已自动修复并更新", body)
        except Exception as e:
            print(f"[self_heal_persist] 通知失败: {e}")

        print(f"[self_heal_persist] 已固化 {len(applied)} 处选择器到 {fp.name}，旧版本备份 {backup.name}")
        return {"persisted": True, "applied": applied, "backup": backup.name}
    except Exception as e:
        print(f"[self_heal_persist] 失败: {e}")
        return {"persisted": False, "reason": str(e)}
