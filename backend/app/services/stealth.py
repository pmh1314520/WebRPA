"""Playwright 反自动化检测（stealth）统一模块。

目标：尽可能隐藏 WebRPA 内置 Playwright 的自动化特征，躲过绝大多数网站的
自动化检测（navigator.webdriver、无头特征、缺失的 chrome 对象、异常的
plugins/permissions/WebGL/UA 等）。

用法：
- 启动参数：把 STEALTH_LAUNCH_ARGS 合并进浏览器启动 args（merge_stealth_args）。
- 运行时：上下文创建后调用 apply_stealth(context)，用 add_init_script 在每个
  页面/iframe「文档最早期」注入 STEALTH_INIT_SCRIPT（早于站点脚本执行，才拦得住）。

说明：本模块只做「隐藏自动化痕迹」，不改变页面业务行为；所有补丁都用 try/catch
包裹，任一失败都不影响页面正常加载。
"""
from __future__ import annotations

# ============ 启动参数（降低浏览器层面的自动化指纹）============
STEALTH_LAUNCH_ARGS = [
    "--disable-blink-features=AutomationControlled",   # 关键：去掉 navigator.webdriver 的 blink 特征
    "--disable-features=IsolateOrigins,site-per-process,AutomationControlled,Translate,MediaRouter",
    "--disable-infobars",                              # 去掉"Chrome 正受到自动化测试软件的控制"提示条
    "--no-first-run",
    "--no-default-browser-check",
    "--no-service-autorun",
    "--password-store=basic",
    "--use-mock-keychain",
    "--disable-background-networking",
    "--disable-client-side-phishing-detection",
    "--disable-hang-monitor",
    "--disable-prompt-on-repost",
    "--disable-sync",
    "--disable-domain-reliability",
    "--disable-renderer-backgrounding",
    "--disable-back-forward-cache",
    "--metrics-recording-only",
]


def _flag_name(arg: str) -> str:
    return arg.split("=", 1)[0].strip()


def merge_stealth_args(args_list) -> list:
    """把 stealth 启动参数并入现有 args（按 flag 名去重，已有的以现有为准，
    但对 --disable-features 做值合并，避免互相覆盖）。返回新列表。"""
    args_list = list(args_list or [])
    existing = {_flag_name(a): i for i, a in enumerate(args_list)}

    # --disable-features 需要合并值而不是二选一
    def _merge_disable_features():
        vals = []
        for a in args_list + STEALTH_LAUNCH_ARGS:
            if _flag_name(a) == "--disable-features" and "=" in a:
                vals.extend(v.strip() for v in a.split("=", 1)[1].split(",") if v.strip())
        # 去重保序
        seen = set()
        merged = []
        for v in vals:
            if v not in seen:
                seen.add(v)
                merged.append(v)
        return "--disable-features=" + ",".join(merged) if merged else None

    df = _merge_disable_features()
    # 移除所有旧的 --disable-features，稍后统一加合并后的
    args_list = [a for a in args_list if _flag_name(a) != "--disable-features"]
    existing = {_flag_name(a): i for i, a in enumerate(args_list)}

    for a in STEALTH_LAUNCH_ARGS:
        fn = _flag_name(a)
        if fn == "--disable-features":
            continue
        if fn not in existing:
            args_list.append(a)
            existing[fn] = len(args_list) - 1
    if df:
        args_list.append(df)
    return args_list


# ============ 反检测注入脚本（在每个文档最早期运行，早于站点脚本）============
STEALTH_INIT_SCRIPT = r"""
(() => {
  'use strict';
  try {
    if (window.__webrpaStealthApplied) return;
    Object.defineProperty(window, '__webrpaStealthApplied', { value: true, enumerable: false, configurable: false });
  } catch (e) { if (window.__webrpaStealthApplied) return; window.__webrpaStealthApplied = true; }

  // ---------- 让被改写的函数/属性在 toString 时仍显示为 [native code] ----------
  // 很多检测脚本靠 fn.toString() 是否含 [native code] 来判断有没有被 hook。
  const _natives = new WeakMap();
  const _origToString = Function.prototype.toString;
  function markNative(fn, name) {
    try { _natives.set(fn, name || (fn && fn.name) || ''); } catch (e) {}
    return fn;
  }
  const _toStringProxy = new Proxy(_origToString, {
    apply(target, thisArg, args) {
      try {
        if (thisArg && _natives.has(thisArg)) {
          const nm = _natives.get(thisArg);
          return 'function ' + nm + '() { [native code] }';
        }
      } catch (e) {}
      return Reflect.apply(target, thisArg, args);
    }
  });
  try { Function.prototype.toString = _toStringProxy; markNative(_toStringProxy, 'toString'); } catch (e) {}

  // 安全 defineProperty getter，并把 getter 标记为 native
  function defineGetter(obj, prop, getter, name) {
    try {
      markNative(getter, name || ('get ' + prop));
      Object.defineProperty(obj, prop, { get: getter, configurable: true, enumerable: true });
    } catch (e) {}
  }

  // ---------- navigator.webdriver = false ----------
  try {
    // 删掉实例属性后在原型上重定义，确保 in 检测与取值都为 false
    try { delete Object.getPrototypeOf(navigator).webdriver; } catch (e) {}
    defineGetter(Navigator.prototype, 'webdriver', function () { return false; }, 'get webdriver');
  } catch (e) {}
  try { defineGetter(navigator, 'webdriver', function () { return false; }, 'get webdriver'); } catch (e) {}

  // ---------- window.chrome（真实 Chrome 才有；无头/自动化常缺失）----------
  try {
    if (!window.chrome) {
      window.chrome = {};
    }
    const chrome = window.chrome;
    if (!chrome.runtime) {
      chrome.runtime = {
        id: undefined,
        connect: markNative(function connect() { return { onMessage: { addListener: markNative(function addListener() {}, 'addListener') }, postMessage: markNative(function postMessage() {}, 'postMessage'), disconnect: markNative(function disconnect() {}, 'disconnect') }; }, 'connect'),
        sendMessage: markNative(function sendMessage() {}, 'sendMessage'),
        onMessage: { addListener: markNative(function addListener() {}, 'addListener'), removeListener: markNative(function removeListener() {}, 'removeListener') },
        onConnect: { addListener: markNative(function addListener() {}, 'addListener') },
        PlatformOs: { MAC: 'mac', WIN: 'win', ANDROID: 'android', CROS: 'cros', LINUX: 'linux', OPENBSD: 'openbsd' },
      };
    }
    if (!chrome.app) {
      chrome.app = {
        isInstalled: false,
        InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
        RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
        getDetails: markNative(function getDetails() { return null; }, 'getDetails'),
        getIsInstalled: markNative(function getIsInstalled() { return false; }, 'getIsInstalled'),
      };
    }
    if (!chrome.csi) chrome.csi = markNative(function csi() { return { startE: Date.now(), onloadT: Date.now(), pageT: Date.now(), tran: 15 }; }, 'csi');
    if (!chrome.loadTimes) chrome.loadTimes = markNative(function loadTimes() {
      return { commitLoadTime: Date.now() / 1000, connectionInfo: 'h2', finishDocumentLoadTime: Date.now() / 1000,
        finishLoadTime: Date.now() / 1000, firstPaintAfterLoadTime: 0, firstPaintTime: Date.now() / 1000,
        navigationType: 'Other', npnNegotiatedProtocol: 'h2', requestTime: Date.now() / 1000,
        startLoadTime: Date.now() / 1000, wasAlternateProtocolAvailable: false, wasFetchedViaSpdy: true, wasNpnNegotiated: true };
    }, 'loadTimes');
  } catch (e) {}
"""

STEALTH_INIT_SCRIPT += r"""
  // ---------- permissions.query：Notifications 状态与 Notification.permission 保持一致 ----------
  try {
    const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
    if (originalQuery) {
      const patched = function query(parameters) {
        try {
          if (parameters && parameters.name === 'notifications') {
            return Promise.resolve({ state: (typeof Notification !== 'undefined' ? Notification.permission : 'default'), onchange: null });
          }
        } catch (e) {}
        return originalQuery.apply(window.navigator.permissions, arguments);
      };
      markNative(patched, 'query');
      window.navigator.permissions.query = patched;
    }
  } catch (e) {}

  // ---------- navigator.plugins / mimeTypes：伪造成真实 Chrome 的 PDF 插件集合 ----------
  try {
    const mimeData = [
      { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
      { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    ];
    const pluginData = [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    ];
    function makeMime(m) {
      const mt = Object.create(MimeType.prototype);
      defineGetter(mt, 'type', function () { return m.type; }, 'get type');
      defineGetter(mt, 'suffixes', function () { return m.suffixes; }, 'get suffixes');
      defineGetter(mt, 'description', function () { return m.description; }, 'get description');
      return mt;
    }
    const mimes = mimeData.map(makeMime);
    const mimeTypesArr = Object.create(MimeTypeArray.prototype);
    mimes.forEach((mt, i) => { mimeTypesArr[i] = mt; mimeTypesArr[mt.type] = mt; });
    defineGetter(mimeTypesArr, 'length', function () { return mimes.length; }, 'get length');
    mimeTypesArr.item = markNative(function item(i) { return mimes[i] || null; }, 'item');
    mimeTypesArr.namedItem = markNative(function namedItem(n) { return mimeTypesArr[n] || null; }, 'namedItem');

    const plugins = pluginData.map((p) => {
      const pl = Object.create(Plugin.prototype);
      defineGetter(pl, 'name', function () { return p.name; }, 'get name');
      defineGetter(pl, 'filename', function () { return p.filename; }, 'get filename');
      defineGetter(pl, 'description', function () { return p.description; }, 'get description');
      defineGetter(pl, 'length', function () { return mimes.length; }, 'get length');
      mimes.forEach((mt, i) => { pl[i] = mt; });
      pl.item = markNative(function item(i) { return mimes[i] || null; }, 'item');
      pl.namedItem = markNative(function namedItem(n) { return mimeTypesArr[n] || null; }, 'namedItem');
      return pl;
    });
    const pluginArr = Object.create(PluginArray.prototype);
    plugins.forEach((pl, i) => { pluginArr[i] = pl; pluginArr[pl.name] = pl; });
    defineGetter(pluginArr, 'length', function () { return plugins.length; }, 'get length');
    pluginArr.item = markNative(function item(i) { return plugins[i] || null; }, 'item');
    pluginArr.namedItem = markNative(function namedItem(n) { return pluginArr[n] || null; }, 'namedItem');
    pluginArr.refresh = markNative(function refresh() {}, 'refresh');
    mimes.forEach((mt) => { try { Object.defineProperty(mt, 'enabledPlugin', { get: function () { return plugins[0]; }, configurable: true }); } catch (e) {} });

    defineGetter(Navigator.prototype, 'plugins', function () { return pluginArr; }, 'get plugins');
    defineGetter(Navigator.prototype, 'mimeTypes', function () { return mimeTypesArr; }, 'get mimeTypes');
  } catch (e) {}

  // ---------- languages / platform / vendor / 硬件参数 ----------
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : ['zh-CN', 'zh', 'en'];
    defineGetter(Navigator.prototype, 'languages', function () { return Object.freeze(langs.slice()); }, 'get languages');
  } catch (e) {}
  try { if (!navigator.platform || navigator.platform === '') defineGetter(Navigator.prototype, 'platform', function () { return 'Win32'; }, 'get platform'); } catch (e) {}
  try { if (!navigator.vendor) defineGetter(Navigator.prototype, 'vendor', function () { return 'Google Inc.'; }, 'get vendor'); } catch (e) {}
  try { if (!navigator.hardwareConcurrency || navigator.hardwareConcurrency < 2) defineGetter(Navigator.prototype, 'hardwareConcurrency', function () { return 8; }, 'get hardwareConcurrency'); } catch (e) {}
  try { if (!('deviceMemory' in navigator) || !navigator.deviceMemory) defineGetter(Navigator.prototype, 'deviceMemory', function () { return 8; }, 'get deviceMemory'); } catch (e) {}
  try { defineGetter(Navigator.prototype, 'maxTouchPoints', function () { return 0; }, 'get maxTouchPoints'); } catch (e) {}
"""

STEALTH_INIT_SCRIPT += r"""
  // ---------- WebGL 厂商/型号伪装（无头 Chromium 默认 SwiftShader，是明显破绽）----------
  try {
    const spoofGL = function (proto) {
      if (!proto || !proto.getParameter) return;
      const orig = proto.getParameter;
      const patched = function getParameter(p) {
        // UNMASKED_VENDOR_WEBGL = 37445, UNMASKED_RENDERER_WEBGL = 37446
        if (p === 37445) return 'Google Inc. (Intel)';
        if (p === 37446) return 'ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
        return orig.apply(this, arguments);
      };
      markNative(patched, 'getParameter');
      proto.getParameter = patched;
    };
    if (typeof WebGLRenderingContext !== 'undefined') spoofGL(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== 'undefined') spoofGL(WebGL2RenderingContext.prototype);
  } catch (e) {}

  // ---------- User-Agent 去掉 "Headless"（无头模式默认 UA 含 HeadlessChrome，是明显破绽）----------
  try {
    const cleanUA = function (s) { return (s || '').replace(/Headless/gi, ''); };
    if (/Headless/i.test(navigator.userAgent)) {
      defineGetter(Navigator.prototype, 'userAgent', function () { return cleanUA(navigator.userAgent); }, 'get userAgent');
    }
    if (navigator.appVersion && /Headless/i.test(navigator.appVersion)) {
      defineGetter(Navigator.prototype, 'appVersion', function () { return cleanUA(navigator.appVersion); }, 'get appVersion');
    }
  } catch (e) {}

  // ---------- userAgentData：去掉 Headless、补齐 brands ----------
  try {
    if (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) {
      const brands = navigator.userAgentData.brands
        .filter((b) => b && !/Headless/i.test(b.brand))
        .map((b) => ({ brand: (b.brand || '').replace(/Headless/gi, ''), version: b.version }));
      if (brands.length) {
        const uad = navigator.userAgentData;
        try { Object.defineProperty(uad, 'brands', { get: markNative(function () { return brands.slice(); }, 'get brands'), configurable: true }); } catch (e) {}
      }
    }
  } catch (e) {}

  // ---------- 无头模式下 outerWidth/outerHeight 常为 0；screen 尺寸异常 ----------
  try {
    if (window.outerWidth === 0) window.outerWidth = window.innerWidth || (screen && screen.availWidth) || 1280;
    if (window.outerHeight === 0) window.outerHeight = (window.innerHeight ? window.innerHeight + 88 : (screen && screen.availHeight) || 800);
  } catch (e) {}

  // ---------- navigator.connection（真实浏览器一般存在）----------
  try {
    if (!navigator.connection) {
      const conn = { effectiveType: '4g', rtt: 50, downlink: 10, saveData: false, onchange: null,
        addEventListener: markNative(function addEventListener() {}, 'addEventListener'),
        removeEventListener: markNative(function removeEventListener() {}, 'removeEventListener') };
      defineGetter(Navigator.prototype, 'connection', function () { return conn; }, 'get connection');
    }
  } catch (e) {}

  // ---------- mediaDevices.enumerateDevices：无头/自动化常返回空，补最小设备集 ----------
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const origEnum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      const patched = function enumerateDevices() {
        return origEnum().then((list) => {
          if (list && list.length) return list;
          return [
            { deviceId: 'default', kind: 'audioinput', label: '', groupId: 'g1' },
            { deviceId: 'default', kind: 'audiooutput', label: '', groupId: 'g1' },
            { deviceId: 'default', kind: 'videoinput', label: '', groupId: 'g2' },
          ];
        }).catch(() => []);
      };
      markNative(patched, 'enumerateDevices');
      navigator.mediaDevices.enumerateDevices = patched;
    }
  } catch (e) {}

  // ---------- 清理 chromedriver 残留全局变量（cdc_ / $cdc_ / __webdriver / __selenium 等）----------
  try {
    for (const k of Object.keys(window)) {
      if (/^\$?cdc_|^[$_]{0,2}(webdriver|selenium|driver)_?/i.test(k) || /^__(webdriver|selenium|nightmare|fxdriver)/i.test(k)) {
        try { delete window[k]; } catch (e) {}
      }
    }
    ['__webdriver_evaluate', '__selenium_evaluate', '__webdriver_script_function', '__webdriver_script_func',
     '__webdriver_script_fn', '__fxdriver_evaluate', '__driver_unwrapped', '__webdriver_unwrapped',
     '__driver_evaluate', '__selenium_unwrapped', '__fxdriver_unwrapped', '_Selenium_IDE_Recorder',
     '_selenium', 'calledSelenium', '$chrome_asyncScriptInfo', '__$webdriverAsyncExecutor'].forEach((k) => {
      try { delete window[k]; } catch (e) {}
      try { delete document[k]; } catch (e) {}
    });
  } catch (e) {}

  // ---------- getBattery（部分环境缺失）----------
  try {
    if (navigator.getBattery === undefined) {
      const patched = function getBattery() {
        return Promise.resolve({ charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1.0,
          addEventListener: markNative(function () {}, 'addEventListener'), removeEventListener: markNative(function () {}, 'removeEventListener') });
      };
      markNative(patched, 'getBattery');
      try { Navigator.prototype.getBattery = patched; } catch (e) {}
    }
  } catch (e) {}

})();
"""


async def apply_stealth(context) -> bool:
    """给浏览器上下文注册反检测 init_script（对所有当前及未来的页面/iframe 生效）。

    正常流程下每个 context 只在创建时调用一次；即便偶发重复注册也无害——
    脚本内有 window.__webrpaStealthApplied 幂等守卫，同一文档不会重复执行。
    best-effort：失败不抛出，不影响浏览器启动。
    """
    if context is None:
        return False
    try:
        await context.add_init_script(STEALTH_INIT_SCRIPT)
        return True
    except Exception as e:
        try:
            print(f"[stealth] 注册反检测脚本失败: {e}")
        except Exception:
            pass
        return False
