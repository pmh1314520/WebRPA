# -*- coding: utf-8 -*-
"""网页智能录制器（Smart Recorder）

在浏览器页面注入监听脚本，捕获点击/输入/选择/勾选/滚动/按键/导航，计算稳定 CSS 选择器，
写入页面 sessionStorage 缓冲区；后端轮询时**排空 context 内所有页面**的缓冲并按时间合并，
因此跨页面跳转、新标签页/弹窗都能持续录制。

为什么用 sessionStorage 而非 expose_binding：
- expose_binding 的函数不保证注入到"当前已加载的文档"，会导致当前页录不到（实测回归）；
- sessionStorage 在当前已加载页面始终可用，最稳。
"""

import re

# 录制注入脚本：监听交互，computeSelector 生成稳定选择器，写入 sessionStorage
# 关键设计：事件监听器**只挂一次**（listenersAttached 守卫，永不重复挂），
# 录制开关由 __webrpaRecorderDisabled 在 pushEvent 内部判断，避免反复注入导致重复事件。
RECORDER_SCRIPT = r"""(function () {
  var KEY = '__webrpa_rec';
  function recording() { return !window.__webrpaRecorderDisabled; }

  function pushEvent(ev) {
    if (!recording()) return;
    try {
      var arr = JSON.parse(sessionStorage.getItem(KEY) || '[]');
      var last = arr.length ? arr[arr.length - 1] : null;
      if (ev.type === 'input' && last && last.type === 'input' && last.selector === ev.selector) {
        arr[arr.length - 1] = ev;
      } else if (ev.type === 'dblclick') {
        // 双击前浏览器会先派发两次单击，移除紧邻的同选择器单击，避免重复录入
        var removed = 0;
        while (arr.length && removed < 2) {
          var l = arr[arr.length - 1];
          if (l && l.type === 'click' && l.selector === ev.selector) { arr.pop(); removed++; }
          else break;
        }
        arr.push(ev);
      } else if (ev.type === 'navigate' && last && last.type === 'navigate' && last.url === ev.url) {
        // 跳过重复导航
      } else {
        arr.push(ev);
      }
      sessionStorage.setItem(KEY, JSON.stringify(arr));
    } catch (e) {}
  }

  function cssEsc(s) {
    if (window.CSS && CSS.escape) { try { return CSS.escape(s); } catch (e) {} }
    return String(s).replace(/([^\w-])/g, '\\$1');
  }
  function attrEsc(s) { return String(s).replace(/(["\\])/g, '\\$1'); }
  function uniqueOK(sel) { try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; } }

  // id 是否为框架生成的不稳定值（React useId ":r1:"、hash、纯数字序号等）
  function isBadId(id) {
    if (!id) return true;
    if (!/^[A-Za-z][\w-]*$/.test(id)) return true;   // 含非法字符（如 :r1:、含空格）
    if (id.length > 40) return true;
    if (/[0-9a-f]{8,}/i.test(id)) return true;        // 长十六进制 / hash
    if (/\d{5,}/.test(id)) return true;               // 连续多位数字序号
    if (/^(ember|ext-|mui-|radix-|headlessui-|react-aria-)/i.test(id)) return true;
    return false;
  }
  // class 是否稳定（排除 CSS Module / CSS-in-JS / hash 生成的垃圾类名）
  function isStableClass(c) {
    if (!c || c.length > 30) return false;
    if (/^[0-9]/.test(c)) return false;
    if (/[0-9a-f]{6,}/i.test(c)) return false;        // 含 hash 片段
    if (/\d{3,}/.test(c)) return false;
    if (/--|__[a-z0-9]{4,}/.test(c)) return false;    // CSS Module / BEM 生成后缀
    if (/^(css|sc|jsx|jss|makeStyles|emotion)[-_]?/i.test(c)) return false; // CSS-in-JS 前缀
    return true;
  }
  function stableClasses(el) {
    if (!el.className || typeof el.className !== 'string') return [];
    return el.className.split(/\s+/).filter(isStableClass);
  }
  function nthOfType(el) {
    var p = el.parentElement; if (!p) return 0;
    var same = Array.prototype.filter.call(p.children, function (c) { return c.tagName === el.tagName; });
    if (same.length <= 1) return 0;
    return same.indexOf(el) + 1;
  }
  // 元素自身的稳定唯一属性选择器；按稳定性从高到低尝试，找不到返回 ''
  function attrSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    var tag = el.tagName.toLowerCase();
    if (el.id && !isBadId(el.id)) {
      var sid = '#' + cssEsc(el.id);
      if (uniqueOK(sid)) return sid;
    }
    var testAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-test-id', 'data-id'];
    for (var i = 0; i < testAttrs.length; i++) {
      var tv = el.getAttribute && el.getAttribute(testAttrs[i]);
      if (tv) { var st = '[' + testAttrs[i] + '="' + attrEsc(tv) + '"]'; if (uniqueOK(st)) return st; }
    }
    var nm = el.getAttribute && el.getAttribute('name');
    if (nm) { var sn = tag + '[name="' + attrEsc(nm) + '"]'; if (uniqueOK(sn)) return sn; }
    var al = el.getAttribute && el.getAttribute('aria-label');
    if (al && al.length <= 50) { var sa = tag + '[aria-label="' + attrEsc(al) + '"]'; if (uniqueOK(sa)) return sa; }
    var ph = el.getAttribute && el.getAttribute('placeholder');
    if (ph && ph.length <= 50) { var sp = '[placeholder="' + attrEsc(ph) + '"]'; if (uniqueOK(sp)) return sp; }
    if (tag === 'a') {
      var href = el.getAttribute('href');
      if (href && href !== '#' && href.length <= 80) { var sh = 'a[href="' + attrEsc(href) + '"]'; if (uniqueOK(sh)) return sh; }
    }
    return '';
  }
  function segmentFor(el) {
    var seg = el.tagName.toLowerCase();
    var cls = stableClasses(el);
    if (cls.length) { seg += '.' + cls.slice(0, 2).join('.'); }
    else { var n = nthOfType(el); if (n > 0) seg += ':nth-of-type(' + n + ')'; }
    return seg;
  }
  function computeSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    // 1) 元素自身的稳定唯一属性（#id / data-* / name / aria-label / placeholder / a[href]）
    var direct = attrSelector(el);
    if (direct) return direct;
    // 2) 就近稳定祖先锚定 + 短相对路径（抗页面结构变化）
    var anchorSel = '', anchor = null, p = el.parentElement, hops = 0;
    while (p && p !== document.body && p !== document.documentElement && hops < 10) {
      var as = attrSelector(p);
      if (as) { anchorSel = as; anchor = p; break; }
      p = p.parentElement; hops++;
    }
    var parts = [], cur = el, stop = anchor || document.body, depth = 0;
    while (cur && cur.nodeType === 1 && cur !== stop && cur !== document.body && cur !== document.documentElement && depth < 6) {
      parts.unshift(segmentFor(cur));
      cur = cur.parentElement; depth++;
    }
    var rel = parts.join(' > ');
    if (anchorSel) {
      var full = rel ? anchorSel + ' > ' + rel : anchorSel;
      if (uniqueOK(full)) return full;
      var loose = rel ? anchorSel + ' ' + rel : anchorSel;  // 放宽为后代组合，抗中间层增删
      if (uniqueOK(loose)) return loose;
      return full;
    }
    return rel || el.tagName.toLowerCase();
  }
  // 采集元素提示（供执行器"选择器自愈"锚点重定位；结构对应 base.build_fallback_selectors）
  function collectHints(el) {
    if (!el || el.nodeType !== 1) return null;
    var tag = el.tagName.toLowerCase();
    var attrs = {};
    var wanted = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-id', 'name', 'placeholder', 'aria-label', 'role', 'type', 'href', 'title', 'alt'];
    for (var i = 0; i < wanted.length; i++) {
      var v = el.getAttribute && el.getAttribute(wanted[i]);
      if (v != null && v !== '') attrs[wanted[i]] = String(v).slice(0, 120);
    }
    var isField = (tag === 'input' || tag === 'textarea' || tag === 'select');
    var text = isField ? '' : (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return {
      tag: tag,
      attributes: attrs,
      id: (el.id && !isBadId(el.id)) ? el.id : '',
      name: (el.getAttribute && el.getAttribute('name')) || '',
      className: stableClasses(el).slice(0, 3).join(' '),
      placeholder: (el.getAttribute && el.getAttribute('placeholder')) || '',
      ariaLabel: (el.getAttribute && el.getAttribute('aria-label')) || '',
      testid: (el.getAttribute && (el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-cy') || el.getAttribute('data-qa') || el.getAttribute('data-id'))) || '',
      text: text
    };
  }

  // 从点击目标向上查找最近的"语义可点击元素"（按钮/链接/角色控件），
  // 避免录到按钮内部的 <span>/<svg> 图标 —— 这类内部元素往往无稳定选择器。
  function clickableTarget(el) {
    var CLICKABLE = { a: 1, button: 1, summary: 1, label: 1 };
    var ROLES = { button: 1, link: 1, menuitem: 1, menuitemcheckbox: 1, menuitemradio: 1, tab: 1, option: 1, checkbox: 1, radio: 1, 'switch': 1 };
    var cur = el, hops = 0;
    while (cur && cur.nodeType === 1 && cur !== document.body && hops < 5) {
      var tag = cur.tagName.toLowerCase();
      if (CLICKABLE[tag]) return cur;
      if (tag === 'input') {
        var t = (cur.type || '').toLowerCase();
        if (t === 'button' || t === 'submit' || t === 'reset' || t === 'checkbox' || t === 'radio') return cur;
      }
      var role = cur.getAttribute && cur.getAttribute('role');
      if (role && ROLES[role.toLowerCase()]) return cur;
      if (cur.hasAttribute && (cur.hasAttribute('onclick') || cur.getAttribute('tabindex') === '0')) return cur;
      cur = cur.parentElement; hops++;
    }
    return el;  // 找不到语义祖先则回退原元素
  }
  // 优先取无障碍/标题文本作为节点名称，兜底 innerText/value
  function bestText(el) {
    var t = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title'))) || el.innerText || el.value || '';
    return String(t).replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  // 忠实优先：录用户实际点击的元素；仅当该元素无法生成"唯一稳定"选择器时，
  // 才回退到最近的语义可点击祖先（点击效果等价——事件会向上冒泡，同时选择器更稳）。
  function resolveClickable(raw) {
    var sel = computeSelector(raw);
    if (uniqueOK(sel)) return { el: raw, selector: sel };
    var alt = clickableTarget(raw);
    if (alt && alt !== raw) {
      var altSel = computeSelector(alt);
      if (uniqueOK(altSel)) return { el: alt, selector: altSel };
    }
    return { el: raw, selector: sel };
  }
  // 向上查找 draggable 祖先（HTML5 拖拽的拖动源常在祖先上）
  function draggableTarget(el) {
    var cur = el, hops = 0;
    while (cur && cur.nodeType === 1 && cur !== document.body && hops < 4) {
      if (cur.getAttribute && cur.getAttribute('draggable') === 'true') return cur;
      cur = cur.parentElement; hops++;
    }
    return el;
  }
  function ensureBadge() {
    try {
      // 角标只在顶层窗口显示；iframe（含跨域）内不注入，避免污染子框架
      try { if (window.top !== window.self) return; } catch (e) { return; }
      if (recording()) {
        if (!document.getElementById('__webrpa_rec_badge')) {
          var badge = document.createElement('div');
          badge.id = '__webrpa_rec_badge';
          badge.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:#dc2626;color:#fff;padding:6px 12px;border-radius:999px;font:600 12px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:none;display:flex;align-items:center;gap:6px;';
          badge.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#fff;display:inline-block;animation:wrpaBlink 1s infinite;"></span>WebRPA 录制中';
          var st = document.createElement('style'); st.textContent = '@keyframes wrpaBlink{0%,100%{opacity:1}50%{opacity:.25}}';
          (document.head || document.documentElement).appendChild(st);
          (document.body || document.documentElement).appendChild(badge);
        }
      } else {
        var b = document.getElementById('__webrpa_rec_badge'); if (b) b.remove();
      }
    } catch (e) {}
  }

  // 事件监听器只挂一次（永不重复）
  if (!window.__webrpaRecorderListenersAttached) {
    window.__webrpaRecorderListenersAttached = true;

    // 拖拽状态（供 click 抑制、去重使用）
    var __md = null;                 // mousedown 起点 {el,x,y,dragging}
    var __suppressClickUntil = 0;    // 拖拽结束后短时间内抑制误触发的 click
    var __htmlDragActive = false;    // HTML5 原生拖拽进行中（避免与 mouse 版重复）

    document.addEventListener('click', function (e) {
      if (e.button && e.button !== 0) return;   // 只录左键，忽略右键/中键（右键菜单等原生行为不录）
      if (Date.now() < __suppressClickUntil) return;  // 拖拽刚结束，抑制误触 click
      var raw = e.target; if (!raw || raw.id === '__webrpa_rec_badge') return;
      var r = resolveClickable(raw), el = r.el;
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'option') return;
      if (tag === 'select') return;  // 原生下拉的选择由 change 事件（select）负责，点击不另录
      // 原生勾选控件的点击由 change 事件（check）负责，避免重复录
      var t0 = (el.type || '').toLowerCase();
      if (tag === 'input' && (t0 === 'checkbox' || t0 === 'radio')) return;
      if (tag === 'label') {
        try {
          var ctrl = el.control || (el.htmlFor ? document.getElementById(el.htmlFor) : null);
          if (ctrl) { var ct = (ctrl.type || '').toLowerCase(); if (ct === 'checkbox' || ct === 'radio') return; }
        } catch (_) {}
      }
      pushEvent({ type: 'click', selector: r.selector, hints: collectHints(el), tag: tag,
        text: bestText(el), url: location.href, ts: Date.now() });
    }, true);

    document.addEventListener('dblclick', function (e) {
      if (e.button && e.button !== 0) return;
      var raw = e.target; if (!raw || raw.id === '__webrpa_rec_badge') return;
      var r = resolveClickable(raw), el = r.el;
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'option') return;
      pushEvent({ type: 'dblclick', selector: r.selector, hints: collectHints(el), tag: tag,
        text: bestText(el), url: location.href, ts: Date.now() });
    }, true);

    document.addEventListener('change', function (e) {
      var el = e.target; if (!el) return;
      var tag = (el.tagName || '').toLowerCase(), t = (el.type || '').toLowerCase();
      if (t === 'file') {
        // 浏览器安全禁止读取真实路径，无法回放原文件；仍生成"上传文件"占位节点（含选择器+文件名提示），用户只需补填路径
        var fn = '';
        try { if (el.files && el.files.length) fn = el.files[0].name; } catch (_) {}
        pushEvent({ type: 'upload', selector: computeSelector(el), hints: collectHints(el), fileName: fn, url: location.href, ts: Date.now() });
        return;
      }
      if (tag === 'select') {
        if (el.multiple) {
          // 多选下拉：忠实记录所有选中项，避免只录首个导致回放不等价
          var vals = [], txts = [];
          for (var oi = 0; oi < el.options.length; oi++) {
            if (el.options[oi].selected) { vals.push(el.options[oi].value); txts.push(el.options[oi].text); }
          }
          pushEvent({ type: 'select', selector: computeSelector(el), hints: collectHints(el), value: el.value, values: vals, text: txts.join(', '), url: location.href, ts: Date.now() });
        } else {
          var opt = el.options[el.selectedIndex];
          pushEvent({ type: 'select', selector: computeSelector(el), hints: collectHints(el), value: el.value, text: opt ? opt.text : '', url: location.href, ts: Date.now() });
        }
      } else if (tag === 'input' || tag === 'textarea') {
        if (t === 'checkbox' || t === 'radio') pushEvent({ type: 'check', selector: computeSelector(el), hints: collectHints(el), value: !!el.checked, url: location.href, ts: Date.now() });
        else pushEvent({ type: 'input', selector: computeSelector(el), hints: collectHints(el), value: el.value, sensitive: (t === 'password'), url: location.href, ts: Date.now() });
      } else if (el.isContentEditable) {
        pushEvent({ type: 'input', selector: computeSelector(el), hints: collectHints(el), value: el.innerText, url: location.href, ts: Date.now() });
      }
    }, true);

    document.addEventListener('input', function (e) {
      var el = e.target; if (!el) return;
      var tag = (el.tagName || '').toLowerCase(), t = (el.type || '').toLowerCase();
      if (t === 'file') return;
      if ((tag === 'input' && t !== 'checkbox' && t !== 'radio') || tag === 'textarea')
        pushEvent({ type: 'input', selector: computeSelector(el), hints: collectHints(el), value: el.value, sensitive: (t === 'password'), url: location.href, ts: Date.now() });
      else if (el.isContentEditable)
        pushEvent({ type: 'input', selector: computeSelector(el), hints: collectHints(el), value: el.innerText, url: location.href, ts: Date.now() });
    }, true);

    document.addEventListener('keydown', function (e) {
      var k = e.key;
      var special = ['Enter','Tab','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace','Delete','Home','End','PageUp','PageDown'];
      var combo = e.ctrlKey || e.altKey || e.metaKey;
      if (special.indexOf(k) === -1 && !combo) return;
      if (k === 'Control' || k === 'Alt' || k === 'Meta' || k === 'Shift') return;
      // 编辑框内的方向/删除键属于打字过程本身，不单独录（Enter/Tab/Escape 与组合键仍录，含语义）
      var ed = false;
      try { var a = e.target, atag = (a && a.tagName || '').toLowerCase(); ed = (atag === 'input' || atag === 'textarea' || (a && a.isContentEditable)); } catch (_) {}
      var editKeys = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Backspace','Delete','Home','End','PageUp','PageDown'];
      if (ed && !combo && editKeys.indexOf(k) !== -1) return;
      var seq = (e.ctrlKey ? 'Control+' : '') + (e.altKey ? 'Alt+' : '') + (e.metaKey ? 'Meta+' : '') + (e.shiftKey && combo ? 'Shift+' : '') + k;
      // 在输入类元素上按键时记录其选择器：回放定位到该元素再按键，忠实还原按键作用目标
      var kt = null;
      if (ed) { try { kt = computeSelector(e.target); } catch (_) {} }
      pushEvent({ type: 'keypress', key: seq, selector: kt, url: location.href, ts: Date.now() });
    }, true);

    // 拖拽录制（自定义拖拽/滑块/排序）：mousedown→move 超阈值→mouseup 生成 drag 事件
    document.addEventListener('mousedown', function (e) {
      if (e.button && e.button !== 0) return;
      var raw = e.target; if (!raw || raw.id === '__webrpa_rec_badge') { __md = null; return; }
      __md = { el: raw, x: e.clientX, y: e.clientY, dragging: false };
    }, true);
    document.addEventListener('mousemove', function (e) {
      if (!__md || __md.dragging) return;
      var dx = e.clientX - __md.x, dy = e.clientY - __md.y;
      if (dx * dx + dy * dy > 64) __md.dragging = true;   // 位移 > 8px 判定为拖拽
    }, true);
    document.addEventListener('mouseup', function (e) {
      var md = __md; __md = null;
      if (!md || !md.dragging) return;          // 普通点击交给 click 处理
      if (__htmlDragActive) return;             // HTML5 拖拽已由 drop 记录，避免重复
      var srcEl = draggableTarget(md.el), tgtEl = e.target;
      if (!srcEl || !tgtEl) return;
      __suppressClickUntil = Date.now() + 400;  // 抑制拖拽尾随的 click
      pushEvent({ type: 'drag', selector: computeSelector(srcEl), targetSelector: computeSelector(tgtEl),
        hints: collectHints(srcEl), targetHints: collectHints(tgtEl), text: bestText(srcEl), url: location.href, ts: Date.now() });
    }, true);

    // HTML5 原生拖拽（draggable=true + drop 目标）
    document.addEventListener('dragstart', function (e) {
      __htmlDragActive = true;
      __md = { el: draggableTarget(e.target), x: 0, y: 0, dragging: true };
    }, true);
    document.addEventListener('dragend', function () {
      setTimeout(function () { __htmlDragActive = false; }, 50);
      __md = null;
    }, true);
    document.addEventListener('drop', function (e) {
      var md = __md;
      if (!md || !md.el) { __htmlDragActive = false; return; }
      var srcEl = md.el, tgtEl = e.target;
      __suppressClickUntil = Date.now() + 400;
      pushEvent({ type: 'drag', selector: computeSelector(srcEl), targetSelector: computeSelector(tgtEl),
        hints: collectHints(srcEl), targetHints: collectHints(tgtEl), text: bestText(srcEl), url: location.href, ts: Date.now() });
    }, true);
  }

  // 每次脚本执行（页面加载/手动注入）：刷新角标 + 记录一次导航
  ensureBadge();
  pushEvent({ type: 'navigate', url: location.href, ts: Date.now() });
})();"""


_DRAIN_JS = """() => {
  try {
    var arr = JSON.parse(sessionStorage.getItem('__webrpa_rec') || '[]');
    sessionStorage.setItem('__webrpa_rec', '[]');
    return arr;
  } catch (e) { return []; }
}"""


# 模块级状态
_recorder_active = False
_recorder_init_registered = False
_init_context = None


async def _inject_all_pages(ctx):
    """对 context 内所有页面**及其全部 frame（含 iframe）**注入录制脚本。
    脚本内部自带"监听器只挂一次"守卫，重复注入安全（仅刷新角标 + 补一条 navigate）。
    对已加载的 iframe 直接 evaluate（add_init_script 只对之后加载的 frame 生效）。"""
    injected = 0
    for pg in ctx.pages:
        try:
            frames = list(pg.frames)
        except Exception:
            frames = [pg]
        for f in frames:
            try:
                await f.evaluate(RECORDER_SCRIPT)
                injected += 1
            except Exception:
                pass
    return injected


async def start_recorder() -> dict:
    """开始录制：注册 init_script（新页面自动注入）+ 立即对现有页面注入，清空各页缓冲。"""
    global _recorder_active, _recorder_init_registered, _init_context
    from app.services import browser_engine

    ctx = browser_engine.get_context()
    if ctx is None:
        return {"success": False, "error": "没有活跃浏览器，请先打开网页"}

    # context 变化（浏览器重启）需要重新注册 init_script
    if _init_context is not ctx:
        _recorder_init_registered = False
        _init_context = ctx

    if not _recorder_init_registered:
        try:
            await ctx.add_init_script(RECORDER_SCRIPT)
            _recorder_init_registered = True
        except Exception as e:
            print(f"[recorder] 注册 init_script 失败：{e}")

    # 解除禁用 + 清空各页缓冲（init_script 只影响新页面，现有页面/frame 需直接 evaluate 解除禁用）
    try:
        await ctx.add_init_script("window.__webrpaRecorderDisabled = false;")
    except Exception:
        pass
    for pg in ctx.pages:
        try:
            frames = list(pg.frames)
        except Exception:
            frames = [pg]
        for f in frames:
            try:
                await f.evaluate("() => { window.__webrpaRecorderDisabled = false; try { sessionStorage.setItem('__webrpa_rec','[]'); } catch(e){} }")
            except Exception:
                pass

    _recorder_active = True
    injected = await _inject_all_pages(ctx)
    return {"success": True, "data": {"message": f"录制已开始（覆盖 {injected} 个页面）"}}


async def _frame_meta(pg, f, child_frames) -> dict:
    """构造 frame 定位元数据，供 generateNodes 生成 switch_iframe 节点。
    优先级：selector(iframe#id / iframe[name] / iframe[src]) > name/id > index。"""
    try:
        if f is pg.main_frame:
            return {"main": True}
    except Exception:
        pass
    meta = {"main": False, "index": -1, "name": "", "selector": ""}
    try:
        meta["index"] = child_frames.index(f)
    except (ValueError, Exception):
        meta["index"] = -1
    try:
        meta["name"] = f.name or ""
    except Exception:
        meta["name"] = ""
    # 是否为主文档的直接子 iframe（selector 定位只在主页面查找，仅对直接子 frame 可靠；
    # 更深层嵌套 frame 依赖 name/index —— switch_iframe 会做全 frame 扁平查找，任意深度均可命中）
    is_direct = False
    try:
        is_direct = (f.parent_frame is pg.main_frame)
    except Exception:
        is_direct = False
    # 取 <iframe> 元素属性构造定位
    try:
        fe = await f.frame_element()
        fid = await fe.get_attribute("id")
        fnm = await fe.get_attribute("name")
        fsrc = await fe.get_attribute("src")
        if is_direct:
            if fid and re.match(r"^[A-Za-z][\w-]*$", fid):
                meta["selector"] = "iframe#" + fid
            elif fnm:
                meta["selector"] = 'iframe[name="%s"]' % fnm.replace('"', '\\"')
            elif fsrc and len(fsrc) <= 200:
                meta["selector"] = 'iframe[src="%s"]' % fsrc.replace('"', '\\"')
        # switch_iframe 的 name 定位同时支持 name 与 id，对嵌套 frame 也有效
        if not meta["name"]:
            meta["name"] = fnm or fid or ""
    except Exception:
        pass
    return meta


async def _drain_all(ctx) -> list:
    """排空 context 内所有页面**及其全部 frame（含跨域 iframe）**的 sessionStorage 缓冲，
    给每个事件打上 frame 定位标记 `_frame`，最后按时间排序合并。"""
    merged = []
    for pg in ctx.pages:
        try:
            main_frame = pg.main_frame
        except Exception:
            main_frame = None
        try:
            frames = list(pg.frames)
        except Exception:
            frames = [pg]
        child_frames = [f for f in frames if f is not main_frame]
        for f in frames:
            try:
                arr = await f.evaluate(_DRAIN_JS)
            except Exception:
                arr = None
            if not arr:
                continue
            try:
                fmeta = await _frame_meta(pg, f, child_frames)
            except Exception:
                fmeta = {"main": True}
            for ev in arr:
                if isinstance(ev, dict):
                    ev["_frame"] = fmeta
                    merged.append(ev)
    merged.sort(key=lambda e: e.get("ts", 0) if isinstance(e, dict) else 0)
    return merged


async def stop_recorder() -> dict:
    """停止录制：禁用监听、移除角标，返回剩余事件。"""
    global _recorder_active
    from app.services import browser_engine

    ctx = browser_engine.get_context()
    remaining = []
    if ctx is not None:
        remaining = await _drain_all(ctx)
        for pg in ctx.pages:
            try:
                frames = list(pg.frames)
            except Exception:
                frames = [pg]
            for f in frames:
                try:
                    await f.evaluate("""() => {
                        window.__webrpaRecorderActive = false;
                        window.__webrpaRecorderDisabled = true;
                        var b = document.getElementById('__webrpa_rec_badge');
                        if (b) b.remove();
                    }""")
                except Exception:
                    pass
        try:
            await ctx.add_init_script("window.__webrpaRecorderDisabled = true;")
        except Exception:
            pass

    _recorder_active = False
    return {"success": True, "data": {"events": remaining}}


async def drain_recorder_events() -> dict:
    """排空所有页面录制缓冲（实时轮询调用）。
    新页面/新标签页由 add_init_script 自动注入，无需在此重复注入（避免重复 navigate 事件）。"""
    from app.services import browser_engine

    ctx = browser_engine.get_context()
    if ctx is None:
        return {"success": True, "data": []}
    if not _recorder_active:
        return {"success": True, "data": []}
    data = await _drain_all(ctx)
    return {"success": True, "data": data}


def is_recorder_active() -> bool:
    return _recorder_active
