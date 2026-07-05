# -*- coding: utf-8 -*-
"""SAP GUI 自动化模块执行器（修复版：动态会话获取，无COM对象存储）"""
import asyncio
import time
from typing import Any, Dict

from .base import ModuleExecutor, ExecutionContext, ModuleResult, register_executor
from .type_utils import to_int

import pythoncom


def _get_active_session(conn_id: int, session_index: int):
    """根据保存的连接ID和会话索引，在当前线程获取SAP会话对象。
    调用者必须确保当前线程已初始化COM，并在使用完毕后释放。
    """
    import win32com.client
    gui = win32com.client.GetObject('SAPGUI')
    eng = gui.GetScriptingEngine
    for conn in eng.Connections:
        if conn.Id == conn_id:
            return conn.Children(session_index)
    raise RuntimeError(f'未找到 SAP 连接 ID={conn_id}，会话可能已断开')


def _handle_popups(session):
    """
    处理登录后可能出现的各种弹窗。
    包括：
    - 多重登录选择弹窗（自动强制登录）
    - 信息弹窗（如“密码错误次数”提示）
    - Copyright 弹窗
    - 主菜单“开始”按钮
    """
    # ---------- 1. 处理多重登录弹窗 ----------
    try:
        multi_force = session.findById('wnd[1]/usr/radMULTI_LOGON_OPT1', False)
        if multi_force is not None:
            multi_force.select()                     # 选中“强制登录”
            session.findById('wnd[1]').sendVKey(0)   # 回车确认
            # 等待弹窗关闭
            time.sleep(0.5)
    except Exception:
        pass

    # ---------- 2. 循环关闭其他一次性弹窗 ----------
    max_attempts = 5
    for _ in range(max_attempts):
        try:
            # 检查 wnd[1] 是否存在
            wnd1 = session.findById('wnd[1]', False)
            if wnd1 is None:
                break
            # 获取窗口标题判断类型
            wnd_text = ''
            try:
                wnd_text = wnd1.text
            except Exception:
                pass

            # Copyright 弹窗（多语言可扩展）
            if wnd_text == 'Copyright':
                session.findById('wnd[1]').sendVKey(0)
                time.sleep(0.3)
                continue

            # 信息弹窗（含登录失败次数提示），根据 SAPFields 中的标签判断
            try:
                fail_label = session.findById('wnd[1]/usr/txtMESSTXT1', False)
                if fail_label is not None:
                    # 点击“确定”或回车关闭
                    try:
                        session.findById('wnd[1]/tbar[0]/btn[0]').press()
                    except Exception:
                        session.findById('wnd[1]').sendVKey(0)
                    time.sleep(0.3)
                    continue
            except Exception:
                pass

            # 其他未知弹窗，尝试按第一个按钮或回车
            try:
                session.findById('wnd[1]/tbar[0]/btn[0]').press()
            except Exception:
                try:
                    session.findById('wnd[1]').sendVKey(0)
                except Exception:
                    break
            time.sleep(0.3)
        except Exception:
            break

    # ---------- 3. 检查是否需要点击“开始菜单”按钮（登录后可能停留在 SMEN 界面）----------
    try:
        start_btn = session.findById('wnd[0]/usr/btnSTARTBUTTON', False)
        if start_btn is not None:
            start_btn.press()
    except Exception:
        pass


@register_executor
class SapLoginExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_login'

    async def execute(self, config, context):
        conn_name = context.resolve_value(config.get('connName', ''))
        conn_string = context.resolve_value(config.get('connString', ''))
        username = context.resolve_value(config.get('username', ''))
        password = context.resolve_value(config.get('password', ''))
        mandt = context.resolve_value(config.get('mandt', '800'))
        language = context.resolve_value(config.get('language', 'ZH'))
        save_var = config.get('saveToVariable', 'sap_session')
        if not username: return ModuleResult(success=False, error='用户名不能为空')
        if not password: return ModuleResult(success=False, error='密码不能为空')
        if not conn_name and not conn_string: return ModuleResult(success=False, error='连接名称或连接字符串至少填写一个')
        try:
            result = await asyncio.get_running_loop().run_in_executor(None, self._login, conn_name, conn_string, username, password, mandt, language)
            if save_var: context.set_variable(save_var, result)
            return ModuleResult(success=True, message=f'SAP 登录成功，用户: {username}', data={'username': username, 'mandt': mandt})
        except Exception as e: return ModuleResult(success=False, error=f'SAP 登录失败: {str(e)}')

    def _login(self, conn_name, conn_string, username, password, mandt, language):
        import win32com.client, subprocess, psutil
        pythoncom.CoInitialize()
        try:
            if not any(p.name().lower() == 'saplogon.exe' for p in psutil.process_iter(['name'])):
                try:
                    import winreg
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\saplogon.exe') as k:
                        sap_path, _ = winreg.QueryValueEx(k, None)
                    subprocess.Popen(sap_path)
                    time.sleep(5)
                except Exception: raise RuntimeError('SAP GUI 未启动，请手动打开 SAP Logon')
            gui = win32com.client.GetObject('SAPGUI')
            eng = gui.GetScriptingEngine
            eng.AllowSystemMessages = False
            eng.HistoryEnabled = False
            if eng.Connections.Count > 0:
                for c in eng.Connections:
                    try: c.CloseSession('ses[0]')
                    except Exception: pass
            conn = eng.OpenConnectionByConnectionString(conn_string) if conn_string else eng.OpenConnection(conn_name, True)
            if conn.DisabledByServer: raise RuntimeError('服务器已禁用 SAP GUI 脚本')
            ses = conn.Children(0)
            if ses.Busy: raise RuntimeError('SAP 会话正忙')
            ses.findById('wnd[0]/usr/txtRSYST-MANDT').text = str(mandt)
            ses.findById('wnd[0]/usr/txtRSYST-BNAME').text = str(username)
            ses.findById('wnd[0]/usr/pwdRSYST-BCODE').text = str(password)
            ses.findById('wnd[0]/usr/txtRSYST-LANGU').text = str(language)
            ses.findById('wnd[0]').sendVKey(0)
            time.sleep(1)

            # 修复：增加弹窗判断与处理
            _handle_popups(ses)

            # 最大化主窗口
            try:
                ses.findById('wnd[0]').maximize()
            except Exception:
                pass

            # 只保存可序列化的标识，不保存 COM 对象
            conn_id = conn.Id
            session_index = 0
            return {
                'conn_id': conn_id,
                'session_index': session_index,
                'username': username,
                'mandt': mandt,
                'language': language
            }
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapLogoutExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_logout'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._logout, session_info)
            context.set_variable(sv, None)
            return ModuleResult(success=True, message='SAP 退出登录成功')
        except Exception as e: return ModuleResult(success=False, error=f'SAP 退出失败: {str(e)}')

    def _logout(self, session_info: dict):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById('wnd[0]/tbar[0]/okcd').text = '/nex'
            time.sleep(0.5)
            s.findById('wnd[0]').sendVKey(0)
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapRunTcodeExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_run_tcode'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        tcode = context.resolve_value(config.get('tcode', ''))
        if not tcode: return ModuleResult(success=False, error='事务码不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._run, session_info, tcode)
            return ModuleResult(success=True, message=f'已执行事务码: {tcode}')
        except Exception as e: return ModuleResult(success=False, error=f'执行事务码失败: {str(e)}')

    def _run(self, session_info: dict, tcode: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.SendCommand(f'/n{tcode}')
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSetFieldValueExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_set_field_value'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        val = context.resolve_value(config.get('value', ''))
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._set, session_info, eid, val)
            return ModuleResult(success=True, message=f'已设置 {eid} = {val}')
        except Exception as e: return ModuleResult(success=False, error=f'设置字段值失败: {str(e)}')

    def _set(self, session_info: dict, eid: str, val: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).text = str(val)
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapGetFieldValueExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_get_field_value'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        var = config.get('saveToVariable', 'sap_value')
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            val = await asyncio.get_running_loop().run_in_executor(None, self._get, session_info, eid)
            if var: context.set_variable(var, val)
            return ModuleResult(success=True, message=f'获取到值: {val}', data={'value': val})
        except Exception as e: return ModuleResult(success=False, error=f'获取字段值失败: {str(e)}')

    def _get(self, session_info: dict, eid: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            el = s.findById(eid)
            if hasattr(el, 'text'): return el.text
            if hasattr(el, 'Text'): return el.Text
            return ''
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapClickButtonExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_click_button'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        if not eid: return ModuleResult(success=False, error='按钮ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._press, session_info, eid)
            return ModuleResult(success=True, message=f'已点击: {eid}')
        except Exception as e: return ModuleResult(success=False, error=f'点击失败: {str(e)}')

    def _press(self, session_info: dict, eid: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).press()
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSendVKeyExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_send_vkey'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        vkey = to_int(config.get('vkey', 0), 0, context)
        wnd = to_int(config.get('windowIndex', 0), 0, context)
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._vkey, session_info, vkey, wnd)
            return ModuleResult(success=True, message=f'已发送虚拟键: {vkey}')
        except Exception as e: return ModuleResult(success=False, error=f'发送虚拟键失败: {str(e)}')

    def _vkey(self, session_info: dict, vkey: int, wnd: int):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(f'wnd[{wnd}]').sendVKey(vkey)
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapGetStatusMessageExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_get_status_message'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        var = config.get('saveToVariable', 'sap_status_message')
        type_var = config.get('saveTypeVariable', '')
        wnd = to_int(config.get('windowIndex', 0), 0, context)
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            r = await asyncio.get_running_loop().run_in_executor(None, self._get, session_info, wnd)
            if var: context.set_variable(var, r['message'])
            if type_var: context.set_variable(type_var, r['type'])
            return ModuleResult(success=True, message=f"状态消息: {r['message']}", data=r)
        except Exception as e: return ModuleResult(success=False, error=f'获取状态消息失败: {str(e)}')

    def _get(self, session_info: dict, wnd: int):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            msg = s.findById(f'wnd[{wnd}]/sbar/pane[0]').text
            try:
                mt = s.findById(f'wnd[{wnd}]/sbar').messageType
            except Exception:
                mt = ''
            return {'message': msg, 'type': mt}
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapGetTitleExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_get_title'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        var = config.get('saveToVariable', 'sap_title')
        wnd = to_int(config.get('windowIndex', 0), 0, context)
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            title = await asyncio.get_running_loop().run_in_executor(None, self._get_title, session_info, wnd)
            if var: context.set_variable(var, title)
            return ModuleResult(success=True, message=f'窗口标题: {title}', data={'title': title})
        except Exception as e: return ModuleResult(success=False, error=f'获取标题失败: {str(e)}')

    def _get_title(self, session_info: dict, wnd: int):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            return s.findById(f'wnd[{wnd}]').text
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapCloseWarningExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_close_warning'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._close, session_info)
            return ModuleResult(success=True, message='已关闭警告弹窗')
        except Exception as e: return ModuleResult(success=False, error=f'关闭警告弹窗失败: {str(e)}')

    def _close(self, session_info: dict):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            cnt = len(s.children)
            for i in range(cnt - 1, 0, -1):
                try:
                    wnd = s.findById(f'wnd[{i}]')
                    # 优先尝试按“确定”按钮
                    try:
                        wnd.findById('tbar[0]/btn[0]').press()
                    except Exception:
                        wnd.sendVKey(0)
                except Exception:
                    pass
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSetCheckboxExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_set_checkbox'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        checked = config.get('checked', True)
        if isinstance(checked, str): checked = checked.lower() == 'true'
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._set, session_info, eid, checked)
            return ModuleResult(success=True, message=f'复选框 {eid} = {checked}')
        except Exception as e: return ModuleResult(success=False, error=f'设置复选框失败: {str(e)}')

    def _set(self, session_info: dict, eid: str, v: bool):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).selected = v
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSelectComboBoxExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_select_combobox'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        key = context.resolve_value(config.get('key', ''))
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._sel, session_info, eid, key)
            return ModuleResult(success=True, message=f'下拉框 {eid} = {key}')
        except Exception as e: return ModuleResult(success=False, error=f'设置下拉框失败: {str(e)}')

    def _sel(self, session_info: dict, eid: str, key: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).key = str(key)
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapReadGridViewExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_read_gridview'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        var = config.get('saveToVariable', 'sap_table_data')
        if not eid: return ModuleResult(success=False, error='GridView ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            data = await asyncio.get_running_loop().run_in_executor(None, self._read, session_info, eid)
            if var: context.set_variable(var, data)
            return ModuleResult(success=True, message=f'读取 {len(data)} 行', data={'rows': len(data), 'data': data})
        except Exception as e: return ModuleResult(success=False, error=f'读取GridView失败: {str(e)}')

    def _read(self, session_info: dict, eid: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            g = s.findById(eid)
            cols = list(g.ColumnOrder)
            rows = []
            for r in range(g.RowCount):
                rd = {}
                for c in cols:
                    try: rd[c] = g.GetCellValue(r, c)
                    except Exception: rd[c] = ''
                rows.append(rd)
            return rows
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapExportGridViewExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_export_gridview_excel'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        save_path = context.resolve_value(config.get('savePath', 'sap_export.xlsx'))
        if not eid: return ModuleResult(success=False, error='GridView ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._export, session_info, eid, save_path)
            return ModuleResult(success=True, message=f'已导出到: {save_path}', data={'path': save_path})
        except Exception as e: return ModuleResult(success=False, error=f'导出Excel失败: {str(e)}')

    def _export(self, session_info: dict, eid: str, save_path: str):
        pythoncom.CoInitialize()
        try:
            try: import pandas as pd
            except ImportError: raise RuntimeError('请安装 pandas: pip install pandas openpyxl')
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            g = s.findById(eid)
            cols = list(g.ColumnOrder)
            titles = {}
            for c in cols:
                try: titles[c] = g.GetDisplayedColumnTitle(c).strip() or c
                except Exception: titles[c] = c
            rows = []
            for r in range(g.RowCount):
                rd = {}
                for c in cols:
                    try: rd[titles[c]] = g.GetCellValue(r, c)
                    except Exception: rd[titles[c]] = ''
                rows.append(rd)
            pd.DataFrame(rows).to_excel(save_path, index=False)
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSetFocusExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_set_focus'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._focus, session_info, eid)
            return ModuleResult(success=True, message=f'已设置焦点: {eid}')
        except Exception as e: return ModuleResult(success=False, error=f'设置焦点失败: {str(e)}')

    def _focus(self, session_info: dict, eid: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).setFocus()
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapSelectTabExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_select_tab'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        eid = context.resolve_value(config.get('elementId', ''))
        if not eid: return ModuleResult(success=False, error='元素ID不能为空')
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._select_tab, session_info, eid)
            return ModuleResult(success=True, message=f'已选择标签页: {eid}')
        except Exception as e: return ModuleResult(success=False, error=f'选择标签页失败: {str(e)}')

    def _select_tab(self, session_info: dict, eid: str):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(eid).select()
        finally:
            pythoncom.CoUninitialize()


@register_executor
class SapMaximizeWindowExecutor(ModuleExecutor):
    @property
    def module_type(self): return 'sap_maximize_window'

    async def execute(self, config, context):
        sv = config.get('sessionVariable', 'sap_session')
        wnd = to_int(config.get('windowIndex', 0), 0, context)
        try:
            session_info = context.get_variable(sv)
            if not isinstance(session_info, dict):
                raise RuntimeError('SAP 会话变量无效')
            await asyncio.get_running_loop().run_in_executor(None, self._max, session_info, wnd)
            return ModuleResult(success=True, message='窗口已最大化')
        except Exception as e: return ModuleResult(success=False, error=f'最大化窗口失败: {str(e)}')

    def _max(self, session_info: dict, wnd: int):
        pythoncom.CoInitialize()
        try:
            s = _get_active_session(session_info['conn_id'], session_info['session_index'])
            s.findById(f'wnd[{wnd}]').maximize()
        finally:
            pythoncom.CoUninitialize()