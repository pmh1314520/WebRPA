# -*- coding: utf-8 -*-
"""工作流版本管理 API 回归测试（commit/list/get/diff/delete）"""
import tempfile
import shutil
import asyncio

import pytest

from app.api import workflow_versions as wv


@pytest.fixture
def tmp_folder():
    d = tempfile.mkdtemp()
    yield d
    shutil.rmtree(d, ignore_errors=True)


def test_diff_content():
    a = {"nodes": [{"id": "1", "type": "open_page", "data": {"label": "打开"}}], "edges": []}
    b = {"nodes": [{"id": "1", "type": "open_page", "data": {"label": "打开"}},
                   {"id": "2", "type": "wait", "data": {"label": "等待"}}],
         "edges": [{"id": "e1", "source": "1", "target": "2"}]}
    d = wv._diff_content(a, b)
    assert d["hasChanges"] is True
    assert len(d["nodesAdded"]) == 1
    assert d["edgesAdded"] == 1


async def test_version_crud(tmp_folder):
    wf = "测试流程"
    c1 = {"name": wf, "nodes": [{"id": "1", "type": "open_page", "data": {"label": "打开"}}], "edges": []}
    c2 = {"name": wf, "nodes": c1["nodes"] + [{"id": "2", "type": "wait", "data": {"label": "等待"}}],
          "edges": [{"id": "e1", "source": "1", "target": "2"}]}

    r1 = await wv.commit_version(wv.CommitRequest(workflow=wf, content=c1, message="v1", folder=tmp_folder))
    assert r1["success"]
    v1 = r1["version"]
    await asyncio.sleep(0.01)
    r2 = await wv.commit_version(wv.CommitRequest(workflow=wf, content=c2, message="v2", folder=tmp_folder))
    assert r2["success"]
    v2 = r2["version"]

    lst = await wv.list_versions(wv.WorkflowRef(workflow=wf, folder=tmp_folder))
    assert lst["success"] and len(lst["versions"]) == 2
    assert lst["versions"][0]["version"] == v2  # 倒序

    got = await wv.get_version(wv.VersionRef(workflow=wf, versionId=v1, folder=tmp_folder))
    assert got["success"] and got["content"]["nodes"][0]["id"] == "1"

    d = await wv.diff_versions(wv.DiffRequest(workflow=wf, fromVersionId=v1, content=c2, folder=tmp_folder))
    assert d["success"] and d["diff"]["hasChanges"]

    dele = await wv.delete_version(wv.VersionRef(workflow=wf, versionId=v1, folder=tmp_folder))
    assert dele["success"]
    lst2 = await wv.list_versions(wv.WorkflowRef(workflow=wf, folder=tmp_folder))
    assert len(lst2["versions"]) == 1


# 历史缺陷回归基线：整文件归入 regression 层
import pytest as _pytest_reg
pytestmark = _pytest_reg.mark.regression
