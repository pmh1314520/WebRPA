# -*- coding: utf-8 -*-
"""WebRPA 集群执行机节点代理（Robot Node Agent）

在每台执行机上运行本脚本，它会：
1. 向控制中心注册自己（携带标签/能力/入网密钥），拿到 node_id + token
2. 周期性上报心跳（含当前负载）
3. 轮询领取分配给自己的任务，用本地 workflow_runner 真实执行
4. 执行完把结果上报回控制中心（失败由控制中心自动转移到其他节点）

用法（在执行机上，项目根目录）：
  python313\\python.exe backend\\cluster_node.py --server http://控制中心IP:5241 \\
      --name 机器A --tags finance,excel --capabilities excel --max-concurrency 2 \\
      --enroll-secret 你的入网密钥

node_id/token 会缓存到 backend/data/cluster_node_identity.json，重启复用同一身份。
"""
from __future__ import annotations

import argparse
import asyncio
import json
import socket
import sys
from pathlib import Path

try:
    import httpx
except Exception:
    print("缺少 httpx 依赖，请确认在 WebRPA 的 Python 环境中运行")
    sys.exit(1)

# 让脚本能 import app.*（以 backend 为根）
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

_IDENTITY_FILE = _BACKEND_DIR / "data" / "cluster_node_identity.json"


def _load_identity(server: str, name: str) -> dict | None:
    try:
        if _IDENTITY_FILE.exists():
            data = json.loads(_IDENTITY_FILE.read_text(encoding="utf-8"))
            # 仅当 server+name 一致时复用，避免串号
            if data.get("server") == server and data.get("name") == name:
                return data
    except Exception:
        pass
    return None


def _save_identity(server: str, name: str, node_id: str, token: str) -> None:
    try:
        _IDENTITY_FILE.parent.mkdir(parents=True, exist_ok=True)
        _IDENTITY_FILE.write_text(json.dumps(
            {"server": server, "name": name, "node_id": node_id, "token": token},
            ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[node] 保存身份失败: {e}")


class ClusterNode:
    def __init__(self, args):
        self.server = args.server.rstrip("/")
        self.name = args.name
        self.tags = [t.strip() for t in (args.tags or "").split(",") if t.strip()]
        self.capabilities = [c.strip() for c in (args.capabilities or "").split(",") if c.strip()]
        self.max_concurrency = max(1, int(args.max_concurrency))
        self.enroll_secret = args.enroll_secret or ""
        self.poll_interval = max(2, int(args.poll_interval))
        self.headless = not args.show_browser
        self.node_id = ""
        self.token = ""
        self._active = 0  # 当前正在执行的任务数
        self._stop = False

    async def register(self, client: httpx.AsyncClient) -> bool:
        ident = _load_identity(self.server, self.name)
        body = {
            "name": self.name, "tags": self.tags, "capabilities": self.capabilities,
            "max_concurrency": self.max_concurrency, "host": socket.gethostname(),
            "enroll_secret": self.enroll_secret,
        }
        if ident:
            body["node_id"] = ident["node_id"]
        try:
            r = await client.post(f"{self.server}/api/orchestrator/nodes/register", json=body)
            if r.status_code != 200:
                print(f"[node] 注册失败 HTTP {r.status_code}: {r.text[:200]}")
                return False
            data = r.json()
            self.node_id = data["node_id"]
            self.token = data["token"]
            _save_identity(self.server, self.name, self.node_id, self.token)
            print(f"[node] 已注册：node_id={self.node_id} name={self.name} "
                  f"tags={self.tags} caps={self.capabilities} 并发={self.max_concurrency}")
            return True
        except Exception as e:
            print(f"[node] 注册异常: {e}")
            return False

    async def _heartbeat(self, client: httpx.AsyncClient):
        try:
            await client.post(f"{self.server}/api/orchestrator/nodes/heartbeat",
                              json={"node_id": self.node_id, "token": self.token,
                                    "load": self._active})
        except Exception as e:
            print(f"[node] 心跳异常: {e}")

    async def _run_task(self, client: httpx.AsyncClient, task: dict):
        self._active += 1
        wf = task.get("workflow")
        tid = task.get("task_id")
        print(f"[node] 开始执行任务 {tid} → {wf}")
        success = False
        result = {}
        try:
            from app.services.workflow_runner import run_workflow
            res = await run_workflow(wf, headless=self.headless, source_tag="cluster")
            success = bool(res.get("success"))
            result = {"success": success, "status": res.get("status"),
                      "executed_nodes": res.get("executed_nodes"),
                      "failed_nodes": res.get("failed_nodes"),
                      "duration_ms": res.get("duration_ms"),
                      "error": res.get("error")}
        except Exception as e:
            result = {"success": False, "error": str(e)}
        finally:
            self._active = max(0, self._active - 1)
        try:
            await client.post(f"{self.server}/api/orchestrator/nodes/report",
                              json={"node_id": self.node_id, "token": self.token,
                                    "task_id": tid, "success": success, "result": result})
            print(f"[node] 任务 {tid} 完成上报：success={success}")
        except Exception as e:
            print(f"[node] 结果上报异常: {e}")

    async def _claim_loop(self, client: httpx.AsyncClient):
        while not self._stop:
            try:
                free = self.max_concurrency - self._active
                if free > 0:
                    r = await client.post(f"{self.server}/api/orchestrator/nodes/claim",
                                          json={"node_id": self.node_id, "token": self.token,
                                                "max_take": free})
                    if r.status_code == 200:
                        for task in (r.json().get("tasks") or []):
                            asyncio.create_task(self._run_task(client, task))
            except Exception as e:
                print(f"[node] 领取任务异常: {e}")
            await asyncio.sleep(self.poll_interval)

    async def _heartbeat_loop(self, client: httpx.AsyncClient):
        while not self._stop:
            await self._heartbeat(client)
            await asyncio.sleep(min(30, self.poll_interval * 3))

    async def run(self):
        async with httpx.AsyncClient(timeout=30) as client:
            # 注册（失败则重试）
            while not await self.register(client):
                print("[node] 5 秒后重试注册…")
                await asyncio.sleep(5)
            print("[node] 进入工作循环（Ctrl+C 退出）")
            await asyncio.gather(self._claim_loop(client), self._heartbeat_loop(client))


def main():
    p = argparse.ArgumentParser(description="WebRPA 集群执行机节点代理")
    p.add_argument("--server", required=True, help="控制中心地址，如 http://192.168.1.10:5241")
    p.add_argument("--name", required=True, help="本节点名称")
    p.add_argument("--tags", default="", help="标签，逗号分隔")
    p.add_argument("--capabilities", default="", help="能力，逗号分隔")
    p.add_argument("--max-concurrency", type=int, default=2, help="本机最大并发任务数")
    p.add_argument("--enroll-secret", default="", help="集群入网密钥（若控制中心已设置）")
    p.add_argument("--poll-interval", type=int, default=3, help="领取任务轮询间隔（秒）")
    p.add_argument("--show-browser", action="store_true", help="显示浏览器（默认无头）")
    args = p.parse_args()

    # Windows 上 Playwright 需要 Proactor 事件循环
    if sys.platform == "win32":
        try:
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        except Exception:
            pass
    node = ClusterNode(args)
    try:
        asyncio.run(node.run())
    except KeyboardInterrupt:
        print("\n[node] 已退出")


if __name__ == "__main__":
    main()
