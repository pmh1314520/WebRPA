"""WebDAV 管理：让 WebRPA 的本地工作流可以保存/读取到 WebDAV（NAS、坚果云、Nextcloud 等）。

- 配置持久化在 backend/data/webdav.json：{enabled, url, username, password, remoteDir}
- 用 requests 直接走 WebDAV 协议（PROPFIND/GET/PUT/DELETE/MKCOL），无需额外依赖
- 启用后，工作流的 list/save/load/delete 都改走 WebDAV 远程目录
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.parse import quote, urljoin
import xml.etree.ElementTree as ET

import requests
from app.utils.paths import BACKEND_DATA_DIR

_DATA_DIR = BACKEND_DATA_DIR
_CONF_FILE = _DATA_DIR / "webdav.json"
_lock = threading.RLock()

_DEFAULT = {
    "enabled": False,
    "url": "",          # 形如 https://dav.example.com/webrpa/ （指向存放工作流的目录）
    "username": "",
    "password": "",
    "remoteDir": "",     # 相对 url 的子目录（可空，直接用 url 作为工作流目录）
}


def get_config() -> Dict[str, Any]:
    with _lock:
        if _CONF_FILE.exists():
            try:
                data = json.loads(_CONF_FILE.read_text(encoding="utf-8"))
                return {**_DEFAULT, **data}
            except Exception:
                return dict(_DEFAULT)
        return dict(_DEFAULT)


def save_config(conf: Dict[str, Any]) -> Dict[str, Any]:
    with _lock:
        merged = {**get_config(), **(conf or {})}
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _CONF_FILE.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        return merged


def is_enabled() -> bool:
    c = get_config()
    return bool(c.get("enabled") and c.get("url"))


def _base_url(conf: Dict[str, Any]) -> str:
    url = (conf.get("url") or "").strip()
    if not url.endswith("/"):
        url += "/"
    remote_dir = (conf.get("remoteDir") or "").strip().strip("/")
    if remote_dir:
        url = urljoin(url, remote_dir + "/")
    return url


def _auth(conf: Dict[str, Any]):
    u = conf.get("username") or ""
    p = conf.get("password") or ""
    return (u, p) if (u or p) else None


def _file_url(conf: Dict[str, Any], filename: str) -> str:
    return urljoin(_base_url(conf), quote(filename))


class WebDAVError(Exception):
    pass


def ensure_remote_dir(conf: Optional[Dict[str, Any]] = None) -> None:
    """确保远程目录存在（MKCOL，已存在返回 405 也视为成功）"""
    conf = conf or get_config()
    base = _base_url(conf)
    try:
        resp = requests.request("MKCOL", base, auth=_auth(conf), timeout=15)
        # 201=已创建, 405/301=已存在
        if resp.status_code not in (201, 200, 301, 405):
            pass
    except Exception:
        pass


def test_connection(conf: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    conf = conf or get_config()
    if not conf.get("url"):
        return {"success": False, "error": "未填写 WebDAV 地址"}
    try:
        resp = requests.request(
            "PROPFIND", _base_url(conf), auth=_auth(conf),
            headers={"Depth": "0"}, timeout=15,
        )
        if resp.status_code in (207, 200, 301, 405):
            return {"success": True}
        if resp.status_code in (401, 403):
            return {"success": False, "error": "认证失败：用户名或密码错误"}
        return {"success": False, "error": f"连接失败：HTTP {resp.status_code}"}
    except Exception as e:
        return {"success": False, "error": f"连接异常：{e}"}


def list_workflows() -> List[Dict[str, Any]]:
    """列出远程目录下所有 .json 工作流，返回 [{filename,name,modifiedTime,size}]"""
    conf = get_config()
    ensure_remote_dir(conf)
    resp = requests.request(
        "PROPFIND", _base_url(conf), auth=_auth(conf),
        headers={"Depth": "1"}, timeout=20,
    )
    if resp.status_code not in (207, 200):
        raise WebDAVError(f"列举失败：HTTP {resp.status_code}")

    items: List[Dict[str, Any]] = []
    try:
        root = ET.fromstring(resp.content)
    except Exception as e:
        raise WebDAVError(f"解析 WebDAV 响应失败：{e}")

    ns = {"d": "DAV:"}
    for resp_el in root.findall("d:response", ns):
        href_el = resp_el.find("d:href", ns)
        if href_el is None or not href_el.text:
            continue
        href = href_el.text
        # 取最后一段作为文件名
        name_part = href.rstrip("/").split("/")[-1]
        try:
            from urllib.parse import unquote
            name_part = unquote(name_part)
        except Exception:
            pass
        if not name_part.lower().endswith(".json"):
            continue
        size = 0
        modified = ""
        propstat = resp_el.find("d:propstat", ns)
        if propstat is not None:
            prop = propstat.find("d:prop", ns)
            if prop is not None:
                length_el = prop.find("d:getcontentlength", ns)
                if length_el is not None and length_el.text and length_el.text.isdigit():
                    size = int(length_el.text)
                mod_el = prop.find("d:getlastmodified", ns)
                if mod_el is not None and mod_el.text:
                    modified = mod_el.text
        # 读取工作流名称（从内容里取 name）较慢，这里默认用文件名去掉 .json
        workflow_name = name_part[:-5]
        items.append({
            "filename": name_part,
            "name": workflow_name,
            "modifiedTime": modified,
            "size": size,
        })
    items.sort(key=lambda x: x.get("modifiedTime", ""), reverse=True)
    return items


def read_workflow(filename: str) -> Optional[dict]:
    conf = get_config()
    resp = requests.get(_file_url(conf, filename), auth=_auth(conf), timeout=20)
    if resp.status_code == 404:
        return None
    if resp.status_code not in (200, 206):
        raise WebDAVError(f"读取失败：HTTP {resp.status_code}")
    return json.loads(resp.content.decode("utf-8"))


def exists_workflow(filename: str) -> bool:
    conf = get_config()
    try:
        resp = requests.head(_file_url(conf, filename), auth=_auth(conf), timeout=15)
        if resp.status_code == 200:
            return True
        if resp.status_code == 404:
            return False
        # 有些服务器不支持 HEAD，用 GET 兜底
        resp = requests.get(_file_url(conf, filename), auth=_auth(conf), timeout=15)
        return resp.status_code == 200
    except Exception:
        return False


def save_workflow(filename: str, content: dict) -> str:
    conf = get_config()
    ensure_remote_dir(conf)
    body = json.dumps(content, ensure_ascii=False, indent=2).encode("utf-8")
    resp = requests.put(
        _file_url(conf, filename), data=body, auth=_auth(conf),
        headers={"Content-Type": "application/json; charset=utf-8"}, timeout=30,
    )
    if resp.status_code not in (200, 201, 204):
        raise WebDAVError(f"保存失败：HTTP {resp.status_code}")
    return filename


def delete_workflow(filename: str) -> bool:
    conf = get_config()
    resp = requests.delete(_file_url(conf, filename), auth=_auth(conf), timeout=20)
    if resp.status_code in (200, 204, 404):
        return True
    raise WebDAVError(f"删除失败：HTTP {resp.status_code}")
