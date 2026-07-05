"""独立的浏览器进程 - 使用 async Playwright API"""
import sys
import json
import asyncio
import threading
import queue

# Windows 上使用 ProactorEventLoop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from pathlib import Path

# 读取篡改猴脚本
def load_userscript():
    """加载篡改猴脚本"""
    script_path = Path(__file__).parent.parent.parent / "browser_plugin" / "智能元素定位助手.user.js"
    if script_path.exists():
        try:
            with open(script_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # 移除 UserScript 头部注释
                lines = content.split('\n')
                script_lines = []
                in_header = False
                for line in lines:
                    if line.strip().startswith('// ==UserScript=='):
                        in_header = True
                        continue
                    if line.strip().startswith('// ==/UserScript=='):
                        in_header = False
                        continue
                    if not in_header:
                        script_lines.append(line)
                return '\n'.join(script_lines)
        except Exception as e:
            print(f"[BrowserProcess] 加载篡改猴脚本失败: {e}", file=sys.stderr)
            return None
    return None

# 篡改猴脚本（Alt+X 激活元素选择器）
USERSCRIPT = load_userscript()

# 元素选择器脚本
PICKER_SCRIPT = """(function() {
    if (window.__elementPickerActive) return;
    window.__elementPickerActive = true;
    
    // 清理之前的元素
    ['__picker_box', '__picker_tip', '__picker_style', '__picker_first'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });
    document.querySelectorAll('.__picker_highlight').forEach(function(h) { h.remove(); });
    
    // 高亮框
    var box = document.createElement('div');
    box.id = '__picker_box';
    box.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #3b82f6;background:rgba(59,130,246,0.2);z-index:2147483647;border-radius:4px;display:none;';
    document.body.appendChild(box);
    
    // 第一个选中元素的标记框
    var firstBox = document.createElement('div');
    firstBox.id = '__picker_first';
    firstBox.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #22c55e;background:rgba(34,197,94,0.3);z-index:2147483646;border-radius:4px;display:none;';
    document.body.appendChild(firstBox);
    
    // 提示条
    var tip = document.createElement('div');
    tip.id = '__picker_tip';
    tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1e40af;color:white;padding:10px 20px;border-radius:8px;font-size:14px;z-index:2147483647;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
    document.body.appendChild(tip);
    
    // 闪烁动画样式
    var style = document.createElement('style');
    style.id = '__picker_style';
    style.textContent = '@keyframes pickerBlink{0%,100%{opacity:1}50%{opacity:0.3}}.__picker_highlight{animation:pickerBlink 0.6s infinite;pointer-events:none;position:fixed;border:3px solid #f59e0b;background:rgba(245,158,11,0.3);z-index:2147483646;border-radius:4px;}';
    document.head.appendChild(style);
    
    // 状态
    var highlights = [];
    var firstElement = null;  // 第一个选中的元素
    var altMode = false;
    
    function clearHighlights() {
        highlights.forEach(function(h) { h.remove(); });
        highlights = [];
    }
    
    function highlightElement(el, color) {
        var r = el.getBoundingClientRect();
        var h = document.createElement('div');
        h.className = '__picker_highlight';
        if (color) h.style.borderColor = color;
        h.style.left = (r.left + window.scrollX) + 'px';
        h.style.top = (r.top + window.scrollY) + 'px';
        h.style.width = r.width + 'px';
        h.style.height = r.height + 'px';
        h.style.position = 'absolute';
        document.body.appendChild(h);
        highlights.push(h);
    }
    
    function highlightElements(elements) {
        clearHighlights();
        elements.forEach(function(el) { highlightElement(el); });
    }
    
    // 获取元素的路径选择器
    function getPathSelector(el) {
        if (!el || el === document.body || el === document.documentElement) return [];
        var path = [];
        while (el && el !== document.body && el !== document.documentElement) {
            var tag = el.tagName.toLowerCase();
            var parent = el.parentElement;
            var index = -1;
            var nthChild = -1;
            if (parent) {
                // 计算在所有兄弟元素中的位置（nth-child）
                var allSiblings = Array.from(parent.children);
                nthChild = allSiblings.indexOf(el) + 1;
                
                // 计算在相同标签名兄弟元素中的位置（nth-of-type）
                var siblings = allSiblings.filter(function(c) { return c.tagName === el.tagName; });
                if (siblings.length > 1) {
                    index = siblings.indexOf(el) + 1;
                }
            }
            // 记录 id 和有用的 class
            var id = el.id;
            var classes = Array.from(el.classList || []).filter(function(c) {
                // 过滤掉动态生成的 class（包含数字或特殊字符）
                return c && !/[0-9_-]{4,}|^[0-9]/.test(c) && c.length < 30;
            });
            path.unshift({ tag: tag, index: index, nthChild: nthChild, el: el, id: id, classes: classes });
            el = parent;
        }
        return path;
    }
    
    // 根据两个元素找出相似元素的模式
    function findSimilarPattern(el1, el2) {
        var path1 = getPathSelector(el1);
        var path2 = getPathSelector(el2);
        
        // 找到路径中不同的位置（应该只有索引不同）
        if (path1.length !== path2.length) return null;
        
        var diffIndex = -1;
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].tag !== path2[i].tag) return null;
            if (path1[i].nthChild !== path2[i].nthChild) {
                if (diffIndex >= 0) return null; // 多个位置不同，无法确定模式
                diffIndex = i;
            }
        }
        
        if (diffIndex < 0) return null; // 完全相同
        
        // 找到最近的有 ID 的祖先元素作为起点
        var startIndex = 0;
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].id) {
                startIndex = i;
                break;
            }
        }
        
        // 构建选择器模式（使用 nth-child）
        var selectorParts = [];
        for (var i = startIndex; i < path1.length; i++) {
            var part = path1[i];
            if (part.id && i <= diffIndex) {
                selectorParts.push('#' + part.id);
            } else if (i === diffIndex) {
                // 使用占位符，后续会被替换
                selectorParts.push(part.tag + ':nth-child({index})');
            } else if (part.nthChild > 0) {
                selectorParts.push(part.tag + ':nth-child(' + part.nthChild + ')');
            } else {
                selectorParts.push(part.tag);
            }
        }
        
        var pattern = selectorParts.join(' > ');
        
        // 找出所有匹配的元素（在父元素的所有子元素中查找）
        var parent = path1[diffIndex].el.parentElement;
        var allSiblings = parent ? Array.from(parent.children).filter(function(c) {
            return c.tagName === path1[diffIndex].el.tagName;
        }) : [];
        
        // 获取每个兄弟元素在所有子元素中的 nth-child 索引
        var allChildren = parent ? Array.from(parent.children) : [];
        var indices = allSiblings.map(function(sibling) {
            return allChildren.indexOf(sibling) + 1;
        });
        
        return {
            pattern: pattern,
            elements: allSiblings,
            indices: indices
        };
    }
    
    // 生成简单选择器
    function getSimpleSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + el.id;
        
        var path = getPathSelector(el);
        
        // 找到最近的有 ID 的祖先元素作为起点
        var startIndex = 0;
        for (var i = path.length - 1; i >= 0; i--) {
            if (path[i].id) {
                startIndex = i;
                break;
            }
        }
        
        // 构建选择器（使用 nth-child）
        var parts = [];
        for (var i = startIndex; i < path.length; i++) {
            var p = path[i];
            if (p.id) {
                parts.push('#' + p.id);
            } else if (p.classes.length > 0) {
                // 使用第一个有意义的 class
                var selector = p.tag + '.' + p.classes[0];
                if (p.nthChild > 0) {
                    selector += ':nth-child(' + p.nthChild + ')';
                }
                parts.push(selector);
            } else if (p.nthChild > 0) {
                parts.push(p.tag + ':nth-child(' + p.nthChild + ')');
            } else {
                parts.push(p.tag);
            }
        }
        
        return parts.join(' > ');
    }
    
    // 更新第一个元素的标记
    function updateFirstBox() {
        if (firstElement) {
            var r = firstElement.getBoundingClientRect();
            firstBox.style.left = r.left + 'px';
            firstBox.style.top = r.top + 'px';
            firstBox.style.width = r.width + 'px';
            firstBox.style.height = r.height + 'px';
            firstBox.style.display = 'block';
        } else {
            firstBox.style.display = 'none';
        }
    }
    
    // 重置相似元素选择状态
    function resetAltMode() {
        firstElement = null;
        altMode = false;
        clearHighlights();
        updateFirstBox();
        tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
        tip.style.background = '#1e40af';
    }
    
    // 鼠标移动
    document.addEventListener('mousemove', function(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id && el.id.startsWith('__picker') || el.className === '__picker_highlight') return;
        
        var r = el.getBoundingClientRect();
        box.style.left = r.left + 'px';
        box.style.top = r.top + 'px';
        box.style.width = r.width + 'px';
        box.style.height = r.height + 'px';
        box.style.display = 'block';
        
        if (e.altKey) {
            box.style.borderColor = '#f59e0b';
            box.style.background = 'rgba(245,158,11,0.2)';
        } else {
            box.style.borderColor = '#3b82f6';
            box.style.background = 'rgba(59,130,246,0.2)';
        }
    }, true);
    
    // 点击选择
    document.addEventListener('click', function(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id && el.id.startsWith('__picker') || el.className === '__picker_highlight') return;
        
        if (e.altKey) {
            // Alt+点击：相似元素选择模式
            e.preventDefault();
            e.stopPropagation();
            
            if (!firstElement) {
                // 第一次点击：记录第一个元素
                firstElement = el;
                updateFirstBox();
                tip.textContent = '已选择第一个元素，请点击第二个相似元素';
                tip.style.background = '#d97706';
            } else {
                // 第二次点击：分析并找出所有相似元素
                var result = findSimilarPattern(firstElement, el);
                
                if (result && result.elements.length > 1) {
                    // 成功找到相似元素
                    highlightElements(result.elements);
                    
                    window.__elementPickerSimilar = {
                        pattern: result.pattern,
                        count: result.elements.length,
                        indices: result.indices,
                        minIndex: 1,
                        maxIndex: result.elements.length
                    };
                    
                    tip.textContent = '已选择 ' + result.elements.length + ' 个相似元素';
                    tip.style.background = '#059669';
                    
                    // 3秒后重置
                    setTimeout(function() {
                        resetAltMode();
                    }, 3000);
                } else {
                    // 无法找到相似模式
                    tip.textContent = '无法识别相似元素，请重新选择';
                    tip.style.background = '#dc2626';
                    setTimeout(resetAltMode, 2000);
                }
                
                firstElement = null;
                updateFirstBox();
            }
        } else if (e.ctrlKey) {
            // Ctrl+点击：选择单个元素
            e.preventDefault();
            e.stopPropagation();
            
            resetAltMode();
            var sel = getSimpleSelector(el);
            window.__elementPickerResult = { selector: sel, tagName: el.tagName.toLowerCase() };
            
            // 复制选择器到剪贴板
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(sel).then(function() {
                    tip.textContent = '已选择并复制: ' + sel;
                }).catch(function() {
                    tip.textContent = '已选择: ' + sel;
                });
            } else {
                // 降级方案：使用 execCommand
                var textarea = document.createElement('textarea');
                textarea.value = sel;
                textarea.style.cssText = 'position:fixed;left:-9999px;';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    tip.textContent = '已选择并复制: ' + sel;
                } catch(err) {
                    tip.textContent = '已选择: ' + sel;
                }
                document.body.removeChild(textarea);
            }
            tip.style.background = '#059669';
        }
    }, true);
    
    // 按键监听
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Alt') e.preventDefault();
        if (e.key === 'Escape') resetAltMode();
    }, true);
    
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Alt' && firstElement) {
            // 如果松开Alt但还没选第二个元素，重置
            // 给一点延迟，允许用户快速点击
        }
    }, true);
})();"""

# 命令队列
cmd_queue = queue.Queue()


def stdin_reader():
    """在单独线程中读取 stdin"""
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                cmd_queue.put(line.strip())
            else:
                cmd_queue.put(None)
                break
        except Exception:
            break


async def main():
    """主函数"""
    import os
    from playwright.async_api import async_playwright
    
    # 从环境变量获取浏览器配置
    browser_type = os.environ.get('BROWSER_TYPE', 'msedge')
    executable_path = os.environ.get('BROWSER_EXECUTABLE_PATH', '')
    custom_user_data_dir = os.environ.get('BROWSER_USER_DATA_DIR', '')
    fullscreen = os.environ.get('BROWSER_FULLSCREEN', '0') == '1'
    custom_launch_args = os.environ.get('BROWSER_LAUNCH_ARGS', '')  # 用户自定义启动参数（每行一个）
    
    print(f"[BrowserProcess] Browser type: {browser_type}, executable_path: {executable_path}, user_data_dir: {custom_user_data_dir}, fullscreen: {fullscreen}", file=sys.stderr)
    
    # 确定用户数据目录
    if custom_user_data_dir:
        # 使用自定义目录
        user_data_dir = Path(custom_user_data_dir) / browser_type
    else:
        # 使用默认目录
        user_data_dir = Path(__file__).parent.parent.parent / "browser_data" / browser_type
    
    user_data_dir.mkdir(parents=True, exist_ok=True)
    
    # 清理锁文件
    lock_file = user_data_dir / "SingletonLock"
    if lock_file.exists():
        try: lock_file.unlink()
        except Exception: pass
    
    # 启动 stdin 读取线程
    reader_thread = threading.Thread(target=stdin_reader, daemon=True)
    reader_thread.start()
    
    try:
        playwright = await async_playwright().start()
    except Exception as e:
        print(json.dumps({"status": "error", "error": f"Playwright 启动失败: {str(e)}"}), flush=True)
        return
    
    print(json.dumps({"status": "playwright_started"}), flush=True)
    
    context = None
    page = None
    
    try:
        # 根据浏览器类型选择浏览器引擎
        if browser_type == 'firefox':
            browser_engine = playwright.firefox
        else:
            browser_engine = playwright.chromium
        
        # 当指定了自定义浏览器路径时，使用普通模式（非持久化）
        # 因为持久化模式可能与已运行的浏览器实例冲突
        browser = None  # 用于普通模式
        
        # 构建启动参数
        _default_launch_args = [
            '--disable-blink-features=AutomationControlled',  # 隐藏自动化特征
            '--start-maximized',  # 始终最大化启动
            '--ignore-certificate-errors',  # 忽略证书错误
            '--ignore-ssl-errors',  # 忽略 SSL 错误
            '--disable-features=IsolateOrigins,site-per-process',  # 禁用站点隔离
            '--allow-running-insecure-content',  # 允许运行不安全内容
            '--disable-infobars',  # 禁用信息栏
            '--disable-notifications',  # 禁用通知
        ]
        # 如果用户指定了自定义启动参数，与默认参数合并；用户参数优先
        if custom_launch_args:
            user_args = [arg.strip() for arg in custom_launch_args.split('\n') if arg.strip()]
            if user_args:
                def _flag(a: str) -> str:
                    return a.split('=', 1)[0].strip()
                user_flag_names = {_flag(a) for a in user_args}
                merged = [a for a in _default_launch_args if _flag(a) not in user_flag_names]
                merged.extend(user_args)
                launch_args_list = merged
                print(f"[BrowserProcess] 合并启动参数: 默认 {len(_default_launch_args)} + 用户 {len(user_args)} = {len(launch_args_list)} 个", file=sys.stderr)
            else:
                launch_args_list = _default_launch_args
                print(f"[BrowserProcess] 使用默认启动参数: {len(launch_args_list)} 个", file=sys.stderr)
        else:
            launch_args_list = _default_launch_args
            print(f"[BrowserProcess] 使用默认启动参数: {len(launch_args_list)} 个", file=sys.stderr)

        if executable_path:
            # 使用自定义路径：使用launch_persistent_context实现持久化
            print(f"[BrowserProcess] 使用自定义浏览器路径: {executable_path}", file=sys.stderr)
            print(f"[BrowserProcess] 使用user_data_dir实现持久化: {user_data_dir}", file=sys.stderr)
            
            launch_args = {
                'user_data_dir': str(user_data_dir),
                'headless': False,
                'executable_path': executable_path,
                'args': launch_args_list,
                'no_viewport': True,
                'ignore_https_errors': True,
            }
            
            try:
                context = await browser_engine.launch_persistent_context(**launch_args)
                # 设置默认超时为0（无限超时），让每个操作自己控制超时
                context.set_default_timeout(0)
                context.set_default_navigation_timeout(0)
                browser = None  # 持久化模式下没有单独的browser对象
            except Exception as e:
                error_msg = str(e)
                
                # 详细的错误分类和解决方案
                detailed_error = f"浏览器启动失败: {error_msg}"
                solution = ""
                
                # 检查是否是可执行文件不存在
                if "executable doesn't exist" in error_msg.lower() or "cannot find" in error_msg.lower():
                    detailed_error = f"❌ 浏览器可执行文件不存在\n路径: {executable_path}\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 检查浏览器路径是否正确\n2. 确认该路径下的浏览器可执行文件存在\n3. 尝试使用默认浏览器（不指定自定义路径）"
                
                # 检查是否是权限问题
                elif "permission denied" in error_msg.lower() or "access denied" in error_msg.lower():
                    detailed_error = f"❌ 权限不足，无法启动浏览器\n路径: {executable_path}\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 以管理员身份运行 WebRPA\n2. 检查浏览器文件的权限设置\n3. 确认杀毒软件没有阻止浏览器启动"
                
                # 检查是否是浏览器版本不兼容
                elif "browser version" in error_msg.lower() or "incompatible" in error_msg.lower():
                    detailed_error = f"❌ 浏览器版本不兼容\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 更新浏览器到最新版本\n2. 或者更新 Playwright: pip install --upgrade playwright\n3. 重新安装浏览器驱动: playwright install"
                
                # 其他错误
                else:
                    solution = "\n\n💡 解决方案:\n1. 检查浏览器路径是否正确\n2. 尝试使用默认浏览器（不指定自定义路径）\n3. 重启电脑后重试"
                
                print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                await playwright.stop()
                return
        else:
            # 使用默认路径：持久化模式启动
            launch_args = {
                'user_data_dir': str(user_data_dir),
                'headless': False,  # 独立浏览器进程始终使用有头模式（用于元素选择器等需要可视化的功能）
                'args': launch_args_list,
                'no_viewport': True,  # 使用 no_viewport 让页面自适应窗口大小
                'ignore_https_errors': True,
            }
            
            # 根据浏览器类型设置 channel
            if browser_type in ('msedge', 'chrome'):
                launch_args['channel'] = browser_type
            
            try:
                context = await browser_engine.launch_persistent_context(**launch_args)
            except Exception as e:
                error_msg = str(e)
                
                # 详细的错误分类和解决方案
                detailed_error = ""
                solution = ""
                should_retry = False
                
                # 检查是否是数据目录被占用
                if "user-data-dir" in error_msg.lower() or "already in use" in error_msg.lower() or "Target page, context or browser has been closed" in error_msg:
                    detailed_error = f"❌ 浏览器数据目录被占用\n目录: {user_data_dir}\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 关闭所有 {browser_type} 浏览器窗口（包括后台进程）\n2. 打开任务管理器，结束所有 {browser_type}.exe 进程\n3. 如果问题仍然存在，重启电脑\n4. 或者在浏览器配置中使用自定义数据目录"
                    solution = solution.replace("{browser_type}", browser_type)
                    print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                    await playwright.stop()
                    return
                
                # 检查是否是浏览器驱动未安装
                elif "executable doesn't exist" in error_msg.lower() or "browser is not installed" in error_msg.lower():
                    detailed_error = f"❌ {browser_type} 浏览器驱动未安装\n原始错误: {error_msg}"
                    solution = f"\n\n💡 解决方案:\n1. 运行命令安装浏览器驱动:\n   playwright install {browser_type}\n\n2. 或者安装所有浏览器:\n   playwright install\n\n3. 如果上述命令失败，请检查网络连接\n\n4. 或者切换到其他浏览器类型（在浏览器配置中修改）"
                    print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                    await playwright.stop()
                    return
                
                # 检查是否是权限问题
                elif "permission denied" in error_msg.lower() or "access denied" in error_msg.lower():
                    detailed_error = f"❌ 权限不足，无法访问浏览器数据目录\n目录: {user_data_dir}\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 以管理员身份运行 WebRPA\n2. 检查数据目录的权限设置\n3. 确认杀毒软件没有阻止访问\n4. 尝试使用其他数据目录"
                    print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                    await playwright.stop()
                    return
                
                # 检查是否是端口被占用
                elif "address already in use" in error_msg.lower() or "port" in error_msg.lower():
                    detailed_error = f"❌ 调试端口被占用\n原始错误: {error_msg}"
                    solution = "\n\n💡 解决方案:\n1. 关闭其他正在运行的浏览器自动化程序\n2. 重启电脑释放端口\n3. 检查是否有其他 Playwright/Selenium 程序在运行"
                    print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                    await playwright.stop()
                    return
                
                # 其他未知错误，尝试使用临时目录
                else:
                    should_retry = True
                    detailed_error = f"⚠️ 无法使用共享数据目录，尝试使用临时目录\n原始错误: {error_msg}"
                
                # 如果使用用户数据目录失败，尝试使用临时目录
                if should_retry:
                    print(json.dumps({"warning": detailed_error}), flush=True)
                    try:
                        import tempfile
                        temp_dir = tempfile.mkdtemp(prefix=f"browser_data_{browser_type}_")
                        launch_args['user_data_dir'] = temp_dir
                        print(f"[BrowserProcess] 使用临时目录: {temp_dir}", file=sys.stderr)
                        context = await browser_engine.launch_persistent_context(**launch_args)
                        print(json.dumps({"warning": "⚠️ 注意：使用临时目录，浏览器登录状态不会保存"}), flush=True)
                    except Exception as e2:
                        error_msg2 = str(e2)
                        
                        # 临时目录也失败，给出详细错误
                        if "executable doesn't exist" in error_msg2.lower() or "browser is not installed" in error_msg2.lower():
                            detailed_error = f"❌ {browser_type} 浏览器驱动未安装\n原始错误: {error_msg2}"
                            solution = f"\n\n💡 解决方案:\n1. 运行命令安装浏览器驱动:\n   playwright install {browser_type}\n\n2. 或者安装所有浏览器:\n   playwright install\n\n3. 如果上述命令失败，请检查网络连接\n\n4. 或者切换到其他浏览器类型（在浏览器配置中修改）"
                        else:
                            detailed_error = f"❌ 浏览器启动失败（已尝试临时目录）\n原始错误: {error_msg2}"
                            solution = "\n\n💡 解决方案:\n1. 检查系统资源是否充足（内存、磁盘空间）\n2. 重启电脑后重试\n3. 更新 Playwright: pip install --upgrade playwright\n4. 重新安装浏览器驱动: playwright install\n5. 查看完整错误日志以获取更多信息"
                        
                        print(json.dumps({"status": "error", "error": detailed_error + solution}), flush=True)
                        await playwright.stop()
                        return
        
        # 获取或创建页面
        if context.pages:
            # 关闭所有旧的标签页，只保留一个干净的
            print(f"[BrowserProcess] 发现 {len(context.pages)} 个已有标签页，正在清理...", file=sys.stderr)
            
            # 保留第一个页面，关闭其他所有页面
            page = context.pages[0]
            for old_page in context.pages[1:]:
                try:
                    await old_page.close()
                except Exception:
                    pass
            
            # 将第一个页面导航到空白页
            try:
                await page.goto('about:blank', timeout=5000)
                print(f"[BrowserProcess] 已清理所有旧标签页，浏览器已就绪", file=sys.stderr)
            except Exception:
                pass
        else:
            # 没有页面时创建新页面
            page = await context.new_page()
            print(f"[BrowserProcess] 创建新标签页", file=sys.stderr)
        
        # 注入篡改猴脚本到所有页面
        async def inject_userscript(pg):
            """注入篡改猴脚本"""
            if USERSCRIPT:
                try:
                    await pg.add_init_script(USERSCRIPT)
                    print(f"[BrowserProcess] 已注入篡改猴脚本到页面", file=sys.stderr)
                except Exception as e:
                    print(f"[BrowserProcess] 注入篡改猴脚本失败: {e}", file=sys.stderr)
        
        async def inject_on_navigation(pg):
            """页面导航时重新注入脚本"""
            if USERSCRIPT:
                try:
                    await pg.evaluate(USERSCRIPT)
                    print(f"[BrowserProcess] 页面导航后重新注入篡改猴脚本", file=sys.stderr)
                except Exception as e:
                    print(f"[BrowserProcess] 页面导航后注入失败: {e}", file=sys.stderr)
        
        # 为当前页面注入
        await inject_userscript(page)
        
        # 监听页面导航，重新注入脚本
        page.on("load", lambda: asyncio.create_task(inject_on_navigation(page)))
        
        # 监听新页面并自动注入
        def on_page(new_page):
            asyncio.create_task(inject_userscript(new_page))
            # 为新页面也监听导航事件
            new_page.on("load", lambda: asyncio.create_task(inject_on_navigation(new_page)))
        
        context.on("page", on_page)
        
        # 强制最大化窗口（使用 CDP）
        try:
            # 获取窗口信息
            cdp = await page.context.new_cdp_session(page)
            
            # 先获取当前窗口的 ID
            windows = await cdp.send('Browser.getWindowForTarget')
            window_id = windows.get('windowId')
            
            if window_id:
                # 使用获取到的窗口 ID
                await cdp.send('Browser.setWindowBounds', {
                    'windowId': window_id,
                    'bounds': {'windowState': 'maximized'}
                })
                print(f"[BrowserProcess] 窗口已强制最大化 (windowId={window_id})", file=sys.stderr)
            else:
                print(f"[BrowserProcess] 无法获取窗口ID，尝试使用默认ID", file=sys.stderr)
                # 降级方案：尝试使用 windowId 1
                await cdp.send('Browser.setWindowBounds', {
                    'windowId': 1,
                    'bounds': {'windowState': 'maximized'}
                })
                print(f"[BrowserProcess] 窗口已强制最大化 (使用默认ID)", file=sys.stderr)
                
        except Exception as e:
            print(f"[BrowserProcess] 窗口最大化失败: {e}", file=sys.stderr)
        
        # 确保页面获得焦点
        try:
            await page.bring_to_front()
        except Exception:
            pass
        
        print(json.dumps({"status": "browser_opened"}), flush=True)
        
        # 全局选择器激活标志
        picker_active = False
        
        # 自动注入选择器到新页面的函数
        async def auto_inject_picker(pg):
            """如果选择器处于激活状态，自动注入到新页面"""
            nonlocal picker_active
            if picker_active:
                try:
                    await pg.wait_for_load_state('domcontentloaded', timeout=5000)
                except Exception:
                    pass
                try:
                    await pg.evaluate(PICKER_SCRIPT)
                    print(f"[BrowserProcess] 选择器已自动注入到新页面", file=sys.stderr)
                except Exception as e:
                    print(f"[BrowserProcess] 自动注入选择器失败: {e}", file=sys.stderr)
        
        # 为所有现有页面添加加载监听器
        for pg in context.pages:
            pg.on("load", lambda p=pg: asyncio.create_task(auto_inject_picker(p)))
        
        # 监听新页面创建，自动添加加载监听器
        def on_new_page(new_pg):
            # 为新页面添加加载监听器
            new_pg.on("load", lambda: asyncio.create_task(auto_inject_picker(new_pg)))
            # 如果选择器已激活，立即注入
            if picker_active:
                asyncio.create_task(auto_inject_picker(new_pg))
        
        context.on("page", on_new_page)
        
        # 处理命令
        while True:
            try:
                # 检查浏览器是否还在运行
                if not context.pages:
                    print(json.dumps({"status": "closed", "reason": "no_pages"}), flush=True)
                    break
                
                # 确保使用最新的页面
                page = context.pages[-1]
                
                # 非阻塞获取命令
                try:
                    line = cmd_queue.get(timeout=0.1)
                except queue.Empty:
                    await asyncio.sleep(0.1)
                    continue
                
                if line is None:
                    break
                
                if not line:
                    continue
                
                cmd = json.loads(line)
                action = cmd.get('action')
                result = {"success": True}
                
                if action == 'quit':
                    break
                elif action == 'navigate':
                    url = cmd.get('url', 'about:blank')
                    try:
                        await page.goto(url, timeout=30000)
                        await page.bring_to_front()
                        result["data"] = {"message": "导航成功"}
                    except Exception as nav_err:
                        # 如果导航失败，尝试创建新页面
                        try:
                            page = await context.new_page()
                            await page.goto(url, timeout=30000)
                            await page.bring_to_front()
                            result["data"] = {"message": "导航成功（新页面）"}
                        except Exception as e2:
                            result = {"success": False, "error": str(e2)}
                elif action == 'find_page_by_url':
                    # 查找是否有页面已打开指定URL
                    target_url = cmd.get('url', '')
                    found = False
                    page_index = -1
                    for i, p in enumerate(context.pages):
                        try:
                            current_url = p.url
                            # 比较URL（忽略末尾斜杠和协议差异）
                            def normalize_url(u):
                                u = u.rstrip('/')
                                if u.startswith('http://'):
                                    u = u[7:]
                                elif u.startswith('https://'):
                                    u = u[8:]
                                return u.lower()
                            if normalize_url(current_url) == normalize_url(target_url):
                                found = True
                                page_index = i
                                break
                        except Exception:
                            continue
                    result["data"] = {"found": found, "pageIndex": page_index}
                elif action == 'switch_to_page':
                    # 切换到指定索引的页面
                    page_index = cmd.get('pageIndex', 0)
                    try:
                        if 0 <= page_index < len(context.pages):
                            page = context.pages[page_index]
                            await page.bring_to_front()
                            result["data"] = {"message": "已切换页面"}
                        else:
                            result = {"success": False, "error": "页面索引无效"}
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                elif action == 'start_picker':
                    try:
                        await page.wait_for_load_state('domcontentloaded', timeout=5000)
                    except Exception: pass
                    await page.evaluate(PICKER_SCRIPT)
                    picker_active = True  # 设置全局标志
                    print(f"[BrowserProcess] 选择器已启动，将自动应用到所有页面", file=sys.stderr)
                    result["data"] = {"message": "选择器已启动"}
                elif action == 'stop_picker':
                    picker_active = False  # 清除全局标志
                    # 在所有页面上停止选择器
                    for pg in context.pages:
                        try:
                            await pg.evaluate("""() => {
                                var tip = document.getElementById('__picker_tip');
                                var box = document.getElementById('__picker_box');
                                var firstBox = document.getElementById('__picker_first');
                                var style = document.getElementById('__picker_style');
                                if (tip) tip.remove();
                                if (box) box.remove();
                                if (firstBox) firstBox.remove();
                                if (style) style.remove();
                                document.querySelectorAll('.__picker_highlight').forEach(function(h) { h.remove(); });
                                window.__elementPickerActive = false;
                            }""")
                        except Exception: pass
                    print(f"[BrowserProcess] 选择器已停止", file=sys.stderr)
                    result["data"] = {"message": "选择器已停止"}
                elif action == 'get_selected':
                    data = await page.evaluate("""() => {
                        var r = window.__elementPickerResult;
                        window.__elementPickerResult = null;
                        return r;
                    }""")
                    result["data"] = data
                elif action == 'get_similar':
                    data = await page.evaluate("""() => {
                        var r = window.__elementPickerSimilar;
                        window.__elementPickerSimilar = null;
                        return r;
                    }""")
                    result["data"] = data
                
                print(json.dumps(result), flush=True)
                
            except json.JSONDecodeError:
                continue
            except Exception as e:
                error_msg = str(e)
                # 如果是页面关闭错误，尝试恢复
                if 'closed' in error_msg.lower() or 'Target page' in error_msg:
                    try:
                        if context.pages:
                            page = context.pages[-1]
                        else:
                            page = await context.new_page()
                    except Exception:
                        pass
                print(json.dumps({"success": False, "error": error_msg}), flush=True)
    
    finally:
        if page:
            try: await page.close()
            except Exception: pass
        if context:
            try: await context.close()
            except Exception: pass
        if browser:
            try: await browser.close()
            except Exception: pass
        if playwright:
            try: await playwright.stop()
            except Exception: pass
        print(json.dumps({"status": "closed"}), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
