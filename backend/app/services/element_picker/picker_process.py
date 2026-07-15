"""独立的元素选择器进程"""
import sys
import json
import asyncio
from pathlib import Path

# Windows 上使用 ProactorEventLoop
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 元素选择器脚本
PICKER_SCRIPT = """(function() {
    if (window.__elementPickerActive) return;
    window.__elementPickerActive = true;
    
    ['__picker_box', '__picker_tip', '__picker_style', '__picker_first'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    });
    document.querySelectorAll('.__picker_highlight').forEach(function(h) { h.remove(); });
    
    var box = document.createElement('div');
    box.id = '__picker_box';
    box.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #3b82f6;background:rgba(59,130,246,0.2);z-index:2147483647;border-radius:4px;display:none;';
    document.body.appendChild(box);
    
    var firstBox = document.createElement('div');
    firstBox.id = '__picker_first';
    firstBox.style.cssText = 'position:fixed;pointer-events:none;border:3px solid #22c55e;background:rgba(34,197,94,0.3);z-index:2147483646;border-radius:4px;display:none;';
    document.body.appendChild(firstBox);
    
    var tip = document.createElement('div');
    tip.id = '__picker_tip';
    tip.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:#1e40af;color:white;padding:10px 20px;border-radius:8px;font-size:14px;z-index:2147483647;font-family:sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
    document.body.appendChild(tip);
    
    var style = document.createElement('style');
    style.id = '__picker_style';
    style.textContent = '@keyframes pickerBlink{0%,100%{opacity:1}50%{opacity:0.3}}.__picker_highlight{animation:pickerBlink 0.6s infinite;pointer-events:none;position:fixed;border:3px solid #f59e0b;background:rgba(245,158,11,0.3);z-index:2147483646;border-radius:4px;}';
    document.head.appendChild(style);
    
    var highlights = [];
    var firstElement = null;
    
    function clearHighlights() {
        highlights.forEach(function(h) { h.remove(); });
        highlights = [];
    }
    
    function highlightElement(el) {
        var r = el.getBoundingClientRect();
        var h = document.createElement('div');
        h.className = '__picker_highlight';
        h.style.left = (r.left + window.scrollX) + 'px';
        h.style.top = (r.top + window.scrollY) + 'px';
        h.style.width = r.width + 'px';
        h.style.height = r.height + 'px';
        h.style.position = 'absolute';
        document.body.appendChild(h);
        highlights.push(h);
    }
    
    function getPathSelector(el) {
        if (!el || el === document.body || el === document.documentElement) return [];
        var path = [];
        while (el && el !== document.body && el !== document.documentElement) {
            var tag = el.tagName.toLowerCase();
            var parent = el.parentElement;
            var index = -1;
            if (parent) {
                var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === el.tagName; });
                if (siblings.length > 1) index = siblings.indexOf(el) + 1;
            }
            // 记录 id 和有用的 class
            var id = el.id;
            var classes = Array.from(el.classList || []).filter(function(c) {
                // 过滤掉动态生成的 class（包含数字或特殊字符）
                return c && !/[0-9_-]{4,}|^[0-9]/.test(c) && c.length < 30;
            });
            path.unshift({ tag: tag, index: index, el: el, id: id, classes: classes });
            el = parent;
        }
        return path;
    }
    
    function findSimilarPattern(el1, el2) {
        var path1 = getPathSelector(el1);
        var path2 = getPathSelector(el2);
        if (path1.length !== path2.length) return null;
        
        var diffIndex = -1;
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].tag !== path2[i].tag) return null;
            if (path1[i].index !== path2[i].index) {
                if (diffIndex >= 0) return null;
                diffIndex = i;
            }
        }
        if (diffIndex < 0) return null;
        
        var selectorParts = [];
        var startIndex = 0;
        // 从有 ID 的元素开始
        for (var i = 0; i < path1.length; i++) {
            if (path1[i].id) {
                startIndex = i;
                break;
            }
        }
        
        for (var i = startIndex; i < path1.length; i++) {
            var part = path1[i];
            if (part.id && i <= diffIndex) {
                selectorParts.push('#' + CSS.escape(part.id));
            } else if (i === diffIndex) {
                selectorParts.push(part.tag + ':nth-child({index})');
            } else if (part.index > 0) {
                selectorParts.push(part.tag + ':nth-child(' + part.index + ')');
            } else {
                selectorParts.push(part.tag);
            }
        }
        
        var parent = path1[diffIndex].el.parentElement;
        var allSiblings = parent ? Array.from(parent.children).filter(function(c) {
            return c.tagName === path1[diffIndex].el.tagName;
        }) : [];
        
        return {
            pattern: selectorParts.join(' > '),
            elements: allSiblings,
            indices: allSiblings.map(function(_, i) { return i + 1; })
        };
    }
    
    function getSimpleSelector(el) {
        if (!el || el === document.body) return 'body';
        if (el.id) return '#' + CSS.escape(el.id);
        
        var path = getPathSelector(el);
        
        // 找到最近的有 ID 的祖先元素作为起点
        var startIndex = 0;
        for (var i = path.length - 1; i >= 0; i--) {
            if (path[i].id) {
                startIndex = i;
                break;
            }
        }
        
        // 构建选择器
        var parts = [];
        for (var i = startIndex; i < path.length; i++) {
            var p = path[i];
            if (p.id) {
                parts.push('#' + CSS.escape(p.id));
            } else if (p.classes.length > 0) {
                // 使用第一个有意义的 class
                var selector = p.tag + '.' + p.classes[0];
                // 检查是否唯一
                if (p.index > 0) {
                    selector += ':nth-child(' + p.index + ')';
                }
                parts.push(selector);
            } else if (p.index > 0) {
                parts.push(p.tag + ':nth-child(' + p.index + ')');
            } else {
                parts.push(p.tag);
            }
        }
        
        return parts.join(' > ');
    }
    
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
    
    function resetAltMode() {
        firstElement = null;
        clearHighlights();
        updateFirstBox();
        tip.textContent = 'Ctrl+点击选择元素 | 按住Alt点击两个相似元素';
        tip.style.background = '#1e40af';
    }
    
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
    
    document.addEventListener('click', function(e) {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || el.id && el.id.startsWith('__picker') || el.className === '__picker_highlight') return;
        
        if (e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            if (!firstElement) {
                firstElement = el;
                updateFirstBox();
                tip.textContent = '已选择第一个元素，请点击第二个相似元素';
                tip.style.background = '#d97706';
            } else {
                var result = findSimilarPattern(firstElement, el);
                if (result && result.elements.length > 1) {
                    clearHighlights();
                    result.elements.forEach(function(e) { highlightElement(e); });
                    window.__elementPickerSimilar = {
                        pattern: result.pattern,
                        count: result.elements.length,
                        indices: result.indices,
                        minIndex: 1,
                        maxIndex: result.elements.length
                    };
                    tip.textContent = '已选择 ' + result.elements.length + ' 个相似元素';
                    tip.style.background = '#059669';
                    setTimeout(resetAltMode, 3000);
                } else {
                    tip.textContent = '无法识别相似元素，请重新选择';
                    tip.style.background = '#dc2626';
                    setTimeout(resetAltMode, 2000);
                }
                firstElement = null;
                updateFirstBox();
            }
        } else if (e.ctrlKey) {
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
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Alt') e.preventDefault();
        if (e.key === 'Escape') resetAltMode();
    }, true);
})();"""


async def main():
    """主函数"""
    from playwright.async_api import async_playwright
    
    # 读取启动参数
    url = sys.argv[1] if len(sys.argv) > 1 else "about:blank"
    browser_type = sys.argv[2] if len(sys.argv) > 2 else "msedge"  # 接收浏览器类型参数
    
    # 使用与自动化浏览器相同的用户数据目录（按浏览器类型分子目录）
    user_data_dir_base = Path(__file__).parent.parent.parent.parent / "browser_data"
    user_data_dir = user_data_dir_base / browser_type  # 为不同浏览器类型使用不同的数据目录
    user_data_dir.mkdir(parents=True, exist_ok=True)
    
    # 清理锁文件
    lock_file = user_data_dir / "SingletonLock"
    if lock_file.exists():
        try:
            lock_file.unlink()
        except Exception:
            pass
    
    playwright = await async_playwright().start()
    print(json.dumps({"status": "started"}), flush=True)
    
    context = None
    page = None
    
    try:
        # 启动浏览器（元素选择器必须使用有头模式，因为需要用户交互）
        try:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(user_data_dir),
                headless=False,  # 元素选择器必须有头模式
                channel='msedge',
                args=[
                    '--start-maximized',
                    '--disable-blink-features=AutomationControlled',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--allow-running-insecure-content',
                    '--disable-infobars',
                    '--disable-notifications',
                ],
                no_viewport=True,  # 使用 no_viewport 让页面自适应窗口大小
                ignore_https_errors=True,
            )
        except Exception:
            import tempfile
            temp_dir = tempfile.mkdtemp(prefix="picker_data_")
            context = await playwright.chromium.launch_persistent_context(
                user_data_dir=temp_dir,
                headless=False,  # 元素选择器必须有头模式
                channel='msedge',
                args=[
                    '--start-maximized',
                    '--disable-blink-features=AutomationControlled',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--allow-running-insecure-content',
                    '--disable-infobars',
                    '--disable-notifications',
                ],
                no_viewport=True,  # 使用 no_viewport 让页面自适应窗口大小
                ignore_https_errors=True,
            )
        
        # 关闭所有已有的页面（之前的历史页面）
        existing_pages = context.pages[:]
        for old_page in existing_pages:
            try:
                await old_page.close()
            except Exception:
                pass
        
        # 创建新页面
        page = await context.new_page()
        
        # 导航到URL
        if url and url != "about:blank":
            await page.goto(url, timeout=30000)
        
        # 确保页面获得焦点
        await page.bring_to_front()
        
        # 注入脚本函数
        async def inject_script(pg):
            try:
                await pg.evaluate(PICKER_SCRIPT)
            except Exception:
                pass
        
        # 监听新页面
        context.on("page", lambda p: asyncio.create_task(inject_on_load(p)))
        
        async def inject_on_load(pg):
            try:
                await pg.wait_for_load_state("domcontentloaded")
                await inject_script(pg)
            except Exception:
                pass
        
        # 注入脚本到当前页面
        await inject_script(page)
        
        # 监听页面导航
        page.on("load", lambda: asyncio.create_task(inject_script(page)))
        
        print(json.dumps({"status": "ready"}), flush=True)
        
        # 主循环：读取命令并检查选择结果
        import threading
        import queue
        
        cmd_queue = queue.Queue()
        
        def stdin_reader():
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
        
        reader_thread = threading.Thread(target=stdin_reader, daemon=True)
        reader_thread.start()
        
        while True:
            # 检查命令
            try:
                line = cmd_queue.get(timeout=0.1)
                if line is None:
                    break
                if line:
                    cmd = json.loads(line)
                    if cmd.get('action') == 'quit':
                        break
                    elif cmd.get('action') == 'get_selected':
                        data = await page.evaluate("() => { var r = window.__elementPickerResult; window.__elementPickerResult = null; return r; }")
                        print(json.dumps({"type": "selected", "data": data}), flush=True)
                    elif cmd.get('action') == 'get_similar':
                        data = await page.evaluate("() => { var r = window.__elementPickerSimilar; window.__elementPickerSimilar = null; return r; }")
                        print(json.dumps({"type": "similar", "data": data}), flush=True)
            except queue.Empty:
                pass
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(json.dumps({"error": str(e)}), flush=True)
            
            await asyncio.sleep(0.1)
    
    finally:
        if context:
            try:
                await context.close()
            except Exception:
                pass
        if playwright:
            try:
                await playwright.stop()
            except Exception:
                pass
        print(json.dumps({"status": "closed"}), flush=True)


if __name__ == '__main__':
    asyncio.run(main())
