// ==UserScript==
// @name         智能元素定位助手
// @namespace    https://github.com/leekHotline/element-helper
// @version      2.0.0
// @description  按Alt+X激活元素选择模式
// @author       leekHotline
// @match        *://*/*
// @grant        none
// @license      MIT
// @supportURL   https://github.com/leekHotline/element-helper/issues
// @downloadURL https://update.greasyfork.org/scripts/558328/%E6%99%BA%E8%83%BD%E5%85%83%E7%B4%A0%E5%AE%9A%E4%BD%8D%E5%8A%A9%E6%89%8B.user.js
// @updateURL https://update.greasyfork.org/scripts/558328/%E6%99%BA%E8%83%BD%E5%85%83%E7%B4%A0%E5%AE%9A%E4%BD%8D%E5%8A%A9%E6%89%8B.meta.js
// ==/UserScript==

(function() {
    'use strict';

    // ========== config.js ==========
    /**
     * 配置和工具模块
     */
    const ElementHelper = {
        // 配置
        config: {
            panelId: 'element-info-panel-' + Math.random().toString(36).substr(2, 9),
            notificationClass: 'element-helper-notification',
            hotkey: { alt: true, shift: false, key: 'X' }
        },
    
        // 状态
        state: {
            isSelectionMode: false,
            selectedElement: null
        },
    
        // 工具方法
        utils: {
            // 判断是否是自己的元素
            isOwnElement(element) {
                if (!element) return false;
                const { panelId, notificationClass } = ElementHelper.config;
                
                // 快速检查 - 检查元素本身
                if (element.id === panelId) return true;
                if (element.classList?.contains(notificationClass)) return true;
                
                // 检查特殊标记属性(最快的方式)
                if (element.hasAttribute?.('data-element-helper')) return true;
                
                // 检查父级元素(使用closest更高效)
                if (element.closest?.('#' + panelId)) return true;
                if (element.closest?.('.' + notificationClass)) return true;
                if (element.closest?.('[data-element-helper]')) return true;
                
                return false;
            },
    
            // 复制到剪贴板
            copyToClipboard(text, button) {
                const showSuccess = () => {
                    const originalText = button.textContent;
                    button.textContent = '✓';
                    button.style.background = '#28a745';
                    setTimeout(() => {
                        button.textContent = originalText;
                        button.style.background = '#007bff';
                    }, 1000);
                };
    
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(showSuccess).catch(() => {
                        this.fallbackCopy(text);
                        showSuccess();
                    });
                } else {
                    this.fallbackCopy(text);
                    showSuccess();
                }
            },
    
            // 降级复制方案
            fallbackCopy(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            },
    
            // 获取完整路径
            getFullPath(element) {
                const path = [];
                while (element?.nodeType === Node.ELEMENT_NODE) {
                    let selector = element.tagName.toLowerCase();
                    if (element.id) {
                        // 用 CSS.escape 转义 id 里的特殊字符（如 $ . : 等），否则 querySelector 语法报错
                        path.unshift('#' + (window.CSS && CSS.escape ? CSS.escape(element.id) : element.id));
                        break;
                    }
                    let nth = 1;
                    let sibling = element;
                    while (sibling = sibling.previousElementSibling) {
                        if (sibling.tagName === element.tagName) nth++;
                    }
                    if (nth > 1) selector += `:nth-of-type(${nth})`;
                    path.unshift(selector);
                    element = element.parentNode;
                }
                return path.join(' > ');
            }
        }
    };

    // ========== ui.js ==========
    /**
     * UI模块 - 面板和通知
     */
    ElementHelper.ui = {
        // 收集的选择器列表
        collectedSelectors: [],
    
        // 拖拽状态
        dragState: {
            isDragging: false,
            startX: 0,
            startY: 0,
            panelX: 0,
            panelY: 0
        },
    
        // 显示通知
        showNotification(message) {
            const { notificationClass } = ElementHelper.config;
            
            document.querySelectorAll('.' + notificationClass).forEach(n => n.remove());
    
            if (!document.getElementById('element-helper-styles')) {
                const style = document.createElement('style');
                style.id = 'element-helper-styles';
                style.textContent = `
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                `;
                document.head.appendChild(style);
            }
    
            const notification = document.createElement('div');
            notification.className = notificationClass;
            notification.textContent = message;
            notification.setAttribute('data-element-helper', 'true');
            notification.style.cssText = `
                position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
                background: linear-gradient(135deg, #007bff, #0056b3);
                cursor: default; color: white; padding: 10px 20px; border-radius: 6px;
                z-index: 2147483647; font-size: 12px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                box-shadow: 0 4px 15px rgba(0,123,255,0.4);
                animation: slideDown 0.3s ease;
                pointer-events: none;
            `;
    
            document.body.appendChild(notification);
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s';
                setTimeout(() => notification.remove(), 300);
            }, 2500);
        },
    
        // 显示元素信息面板
        showPanel(info) {
            const { panelId } = ElementHelper.config;
            const self = this;
    
            document.getElementById(panelId)?.remove();
    
            const panel = document.createElement('div');
            panel.id = panelId;
            panel.setAttribute('data-element-helper', 'true');
            panel.style.cssText = `
                position: fixed; top: 15px; right: 15px;
                background: #ffffff; border: 2px solid #007bff;
                border-radius: 8px; padding: 10px;
                width: 340px; max-height: 70vh; overflow-y: auto;
                z-index: 2147483647; box-shadow: 0 6px 24px rgba(0,0,0,0.25);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
                font-size: 11px; line-height: 1.4; color: #333;
                cursor: default !important; user-select: none;
                pointer-events: auto;
            `;
    
            panel.innerHTML = this._buildPanelHTML(info);
            document.body.appendChild(panel);
    
            // 初始化拖拽
            this._initDrag(panel);
    
            // 绑定关闭按钮
            panel.querySelector('#close-panel-btn').onclick = (e) => {
                e.stopPropagation();
                panel.remove();
            };
    
            // 绑定复制按钮
            panel.querySelectorAll('.copy-btn').forEach(btn => {
                btn.onclick = function(e) {
                    e.stopPropagation();
                    const text = this.dataset.copy;
                    ElementHelper.utils.copyToClipboard(text, this);
                    const selectorInput = panel.querySelector('#selector-input');
                    if (selectorInput && (text.startsWith('.') || text.startsWith('#') || text.startsWith('['))) {
                        selectorInput.value = text;
                    }
                };
            });
    
            // 绑定添加按钮
            panel.querySelector('#add-selector-btn').onclick = (e) => {
                e.stopPropagation();
                const nameInput = panel.querySelector('#name-input');
                const selectorInput = panel.querySelector('#selector-input');
                const name = nameInput.value.trim();
                const selector = selectorInput.value.trim();
                
                if (name && selector) {
                    self.collectedSelectors.push({ name, selector });
                    self._updateCollectedList(panel);
                    nameInput.value = '';
                    selectorInput.value = '';
                    self.showNotification(`✅ 已添加: ${name}`);
                } else {
                    self.showNotification('⚠️ 请填写名称和选择器');
                }
            };
    
            // 绑定导出按钮
            panel.querySelector('#export-btn').onclick = (e) => {
                e.stopPropagation();
                self._exportSelectors();
            };
    
            // 绑定清空按钮
            panel.querySelector('#clear-btn').onclick = (e) => {
                e.stopPropagation();
                self.collectedSelectors = [];
                self._updateCollectedList(panel);
                self.showNotification('🗑️ 已清空');
            };
    
            // 绑定打印按钮
            panel.querySelector('#print-btn').onclick = (e) => {
                e.stopPropagation();
                const selectorInput = panel.querySelector('#selector-input');
                const selector = selectorInput.value.trim();
                if (selector) {
                    ElementHelper.core.printSelectorText(selector);
                    self.showNotification('📋 已打印到控制台');
                } else {
                    self.showNotification('⚠️ 请先填写选择器');
                }
            };
    
            // 更新已收集列表
            this._updateCollectedList(panel);
        },
    
        // 初始化拖拽功能
        _initDrag(panel) {
            const header = panel.querySelector('#panel-header');
            const self = this;
    
            header.addEventListener('mousedown', (e) => {
                // 如果点击的是按钮，不触发拖拽
                if (e.target.tagName === 'BUTTON') return;
                
                self.dragState.isDragging = true;
                self.dragState.startX = e.clientX;
                self.dragState.startY = e.clientY;
                
                const rect = panel.getBoundingClientRect();
                self.dragState.panelX = rect.left;
                self.dragState.panelY = rect.top;
                
                header.style.cursor = 'grabbing';
                e.preventDefault();
            });
    
            document.addEventListener('mousemove', (e) => {
                if (!self.dragState.isDragging) return;
                
                const dx = e.clientX - self.dragState.startX;
                const dy = e.clientY - self.dragState.startY;
                
                let newX = self.dragState.panelX + dx;
                let newY = self.dragState.panelY + dy;
                
                // 边界限制
                newX = Math.max(0, Math.min(newX, window.innerWidth - panel.offsetWidth));
                newY = Math.max(0, Math.min(newY, window.innerHeight - 50));
                
                panel.style.left = newX + 'px';
                panel.style.top = newY + 'px';
                panel.style.right = 'auto';
            });
    
            document.addEventListener('mouseup', () => {
                if (self.dragState.isDragging) {
                    self.dragState.isDragging = false;
                    header.style.cursor = 'grab';
                }
            });
        },
    
        // 更新已收集列表
        _updateCollectedList(panel) {
            const listContainer = panel.querySelector('#collected-list');
            if (!listContainer) return;
    
            if (this.collectedSelectors.length === 0) {
                listContainer.innerHTML = '<div style="color:#999;text-align:center;padding:8px;font-size:11px;">暂无数据</div>';
                return;
            }
    
            let html = '';
            this.collectedSelectors.forEach((item, index) => {
                html += `
                    <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:4px 6px;background:#f8f9fa;border-radius:3px;margin:3px 0;font-size:10px;">
                        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <strong>${item.name}</strong>: <code>${item.selector}</code>
                        </span>
                        <button class="remove-item-btn" data-index="${index}" style="
                            background:#dc3545;color:white;border:none;border-radius:2px;
                            padding:1px 5px;cursor:pointer;font-size:10px;margin-left:5px;">✕</button>
                    </div>
                `;
            });
            listContainer.innerHTML = html;
    
            listContainer.querySelectorAll('.remove-item-btn').forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.index);
                    this.collectedSelectors.splice(index, 1);
                    this._updateCollectedList(panel);
                };
            });
        },
    
        // 导出选择器
        _exportSelectors() {
            if (this.collectedSelectors.length === 0) {
                this.showNotification('⚠️ 没有可导出的数据');
                return;
            }
    
            const maxNameLen = Math.max(...this.collectedSelectors.map(item => item.name.length));
            
            let text = '名称' + ' '.repeat(maxNameLen - 2) + '    选择器\n';
            text += '-'.repeat(maxNameLen + 30) + '\n';
            
            this.collectedSelectors.forEach(item => {
                const padding = ' '.repeat(maxNameLen - item.name.length);
                text += `${item.name}${padding}    ${item.selector}\n`;
            });
    
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('📋 已复制到剪贴板');
                console.log('%c=== 导出的选择器 ===', 'font-size:14px;font-weight:bold;color:#007bff;');
                console.log(text);
            }).catch(() => {
                ElementHelper.utils.fallbackCopy(text);
                this.showNotification('📋 已复制到剪贴板');
                console.log(text);
            });
        },
    
        // 构建面板HTML
        _buildPanelHTML(info) {
            const copyBtn = (text) => `<button class="copy-btn" data-copy="${text.replace(/"/g, '&quot;')}" 
                style="margin-left:5px;padding:1px 6px;background:#007bff;color:white;
                border:none;border-radius:2px;cursor:pointer;font-size:10px;">复制</button>`;
    
            let html = `
                <div id="panel-header" style="display:flex;justify-content:space-between;align-items:center;
                    margin-bottom:8px;cursor:grab;padding:2px 0;border-bottom:1px solid #eee;">
                    <h3 style="margin:0;color:#007bff;font-size:13px;">📋 元素信息 <span style="font-size:10px;color:#999;font-weight:normal;">可拖拽</span></h3>
                    <button id="close-panel-btn" style="background:#dc3545;color:white;border:none;
                        border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">✕</button>
                </div>
                <p style="margin:4px 0;"><strong>标签:</strong> <code>&lt;${info.tag}&gt;</code></p>
                <p style="margin:4px 0;"><strong>ID:</strong> <code>${info.id || '无'}</code> ${info.id ? copyBtn('#' + (window.CSS && CSS.escape ? CSS.escape(info.id) : info.id)) : ''}</p>
                <p style="margin:4px 0;"><strong>类名:</strong> <code style="font-size:10px;">${info.classes || '无'}</code></p>
                <p style="margin:4px 0;"><strong>文本:</strong> <span style="font-size:10px;">${info.text ? info.text.substring(0, 50) + '...' : '无'}</span></p>
                ${info.href ? `<p style="margin:4px 0;"><strong>链接:</strong> <code style="word-break:break-all;font-size:10px;">${info.href.substring(0, 40)}...</code></p>` : ''}
                <div style="background:#f1f3f5;padding:6px;border-radius:4px;margin:6px 0;word-break:break-all;">
                    <strong style="font-size:10px;">路径:</strong>
                    <code style="font-size:9px;">${info.fullPath}</code>${copyBtn(info.fullPath)}
                </div>
                <h4 style="color:#28a745;margin:10px 0 6px;font-size:12px;">🎯 推荐选择器</h4>
            `;
    
            info.selectors.slice(0, 5).forEach(selector => {
                let count = 0;
                try { count = document.querySelectorAll(selector).length; } catch(e) {}
                const isUnique = count === 1;
                html += `
                    <div style="margin:4px 0;padding:6px;background:${isUnique ? '#d4edda' : '#f8f9fa'};
                        border-radius:4px;border-left:2px solid ${isUnique ? '#28a745' : '#6c757d'};
                        display:flex;justify-content:space-between;align-items:center;">
                        <div style="flex:1;overflow:hidden;">
                            <code style="font-weight:bold;font-size:10px;">${selector}</code>
                            <span style="color:${isUnique ? '#28a745' : '#666'};margin-left:5px;font-size:10px;">
                                ${isUnique ? '✓唯一' : `(${count})`}
                            </span>
                        </div>
                        <button class="copy-btn" data-copy="${selector.replace(/"/g, '&quot;')}" 
                            style="padding:2px 6px;background:#007bff;color:white;border:none;
                            border-radius:3px;cursor:pointer;font-size:10px;">复制</button>
                    </div>
                `;
            });
    
            if (info.selectors.length > 0) {
                const code = `document.querySelector("${info.selectors[0]}")`;
                html += `
                    <div style="background:#2d2d2d;color:#f8f8f2;padding:8px;border-radius:4px;margin-top:8px;position:relative;">
                        <code style="font-size:10px;">${code}</code>
                        <button class="copy-btn" data-copy='${code}' style="position:absolute;right:5px;top:5px;
                            padding:2px 5px;background:#007bff;color:white;border:none;
                            border-radius:2px;cursor:pointer;font-size:9px;">复制</button>
                    </div>
                `;
            }
    
            html += `
                <h4 style="color:#fd7e14;margin:12px 0 6px;font-size:12px;">📝 收集选择器</h4>
                <div style="background:#fff3cd;padding:8px;border-radius:4px;border:1px solid #ffc107;">
                    <div style="margin-bottom:5px;">
                        <input type="text" id="name-input" placeholder="名称" style="
                            width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:3px;
                            font-size:11px;box-sizing:border-box;">
                    </div>
                    <div style="margin-bottom:5px;">
                        <input type="text" id="selector-input" placeholder="选择器（点复制自动填充）" style="
                            width:100%;padding:4px 6px;border:1px solid #ddd;border-radius:3px;
                            font-size:11px;box-sizing:border-box;">
                    </div>
                    <div style="display:flex;gap:5px;">
                        <button id="add-selector-btn" style="flex:1;padding:5px;background:#28a745;color:white;
                            border:none;border-radius:3px;cursor:pointer;font-size:10px;">➕ 添加</button>
                        <button id="print-btn" style="flex:1;padding:5px;background:#17a2b8;color:white;
                            border:none;border-radius:3px;cursor:pointer;font-size:10px;">🖨️ 打印</button>
                    </div>
                </div>
                <h4 style="color:#6c757d;margin:10px 0 5px;font-size:11px;">📦 已收集 (${this.collectedSelectors.length})</h4>
                <div id="collected-list" style="background:#f8f9fa;padding:5px;border-radius:4px;
                    max-height:100px;overflow-y:auto;">
                </div>
                <div style="display:flex;gap:5px;margin-top:8px;">
                    <button id="export-btn" style="flex:1;padding:6px;background:#007bff;color:white;
                        border:none;border-radius:3px;cursor:pointer;font-size:11px;font-weight:bold;">📤 导出</button>
                    <button id="clear-btn" style="padding:6px 10px;background:#6c757d;color:white;
                        border:none;border-radius:3px;cursor:pointer;font-size:11px;">🗑️</button>
                </div>
            `;
    
            return html;
        }
    };

    // ========== core.js ==========
    /**
     * 核心模块 - 选择和分析逻辑
     */
    ElementHelper.core = {
        // 事件处理器（需要保存引用以便移除）
        handlers: {
            mouseover: null,
            mouseout: null,
            click: null,
            prevent: null
        },
    
        // 初始化
        init() {
            this._bindHandlers();
            this._bindHotkey();
        },
    
        // 打印选择器匹配元素的文本
        printSelectorText(selector) {
            try {
                const elements = document.querySelectorAll(selector);
                
                if (elements.length === 0) {
                    console.log(`%c未找到匹配 "${selector}" 的元素`, 'color:#dc3545;');
                    return;
                }
                
                console.log(`%c=== 选择器: ${selector} ===`, 'font-size:14px;font-weight:bold;color:#17a2b8;');
                console.log(`找到 ${elements.length} 个元素:`);
                elements.forEach((el, i) => {
                    const text = el.textContent.trim().substring(0, 200);
                    console.log(`[${i}]`, text || '(空)');
                });
            } catch (e) {
                console.log(`%c选择器无效: ${selector}`, 'color:#dc3545;');
            }
        },
    
        // 绑定处理器
        _bindHandlers() {
            const { isOwnElement } = ElementHelper.utils;
            const state = ElementHelper.state;
    
            // 强力拦截器 - 阻止所有默认行为
            this.handlers.prevent = (e) => {
                // 严格过滤插件自己的元素
                if (isOwnElement(e.target)) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            };
    
            this.handlers.mouseover = (e) => {
                // 严格过滤插件自己的元素
                if (isOwnElement(e.target)) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return;
                }
                if (state.selectedElement && state.selectedElement !== e.target) {
                    state.selectedElement.style.outline = '';
                }
                state.selectedElement = e.target;
                state.selectedElement.style.outline = '2px solid #ff4444';
                state.selectedElement.style.outlineOffset = '-2px';
            };
    
            this.handlers.mouseout = (e) => {
                // 严格过滤插件自己的元素
                if (isOwnElement(e.target)) {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return;
                }
                if (state.selectedElement === e.target) {
                    state.selectedElement.style.outline = '';
                }
            };
    
            // 强力点击拦截
            this.handlers.click = (e) => {
                // 严格过滤插件自己的元素
                if (isOwnElement(e.target)) {
                    // 允许插件UI内部的点击事件正常工作
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.analyzeElement(e.target);
                return false;
            };
        },
    
        // 绑定快捷键
        _bindHotkey() {
            const { hotkey } = ElementHelper.config;
            window.addEventListener('keydown', (e) => {
                // Alt+X 切换模式
                if (e.altKey === hotkey.alt && e.shiftKey === hotkey.shift && e.key.toUpperCase() === hotkey.key) {
                    e.preventDefault();
                    this.toggleMode();
                }
                // ESC 也可以关闭
                if (e.key === 'Escape' && ElementHelper.state.isSelectionMode) {
                    this.disableMode();
                    ElementHelper.state.isSelectionMode = false;
                }
            });
        },
    
        // 切换模式
        toggleMode() {
            ElementHelper.state.isSelectionMode = !ElementHelper.state.isSelectionMode;
            if (ElementHelper.state.isSelectionMode) {
                this.enableMode();
            } else {
                this.disableMode();
            }
        },
    
        // 启用选择模式
        enableMode() {
            document.body.style.cursor = 'crosshair';

            // 自动关闭 WebRPA 普通元素选择器，避免两个选择器在浏览器里叠加干扰
            try {
                window.__elementPickerDisabled = true;
                ['__picker_box', '__picker_tip', '__picker_first_box', '__picker_selected_box'].forEach(function(id) {
                    var el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                });
                var sims = document.querySelectorAll('.__picker_similar_box');
                for (var i = 0; i < sims.length; i++) { try { sims[i].remove(); } catch (e) {} }
            } catch (e) {}

            // 使用 window 级别监听，更早拦截事件，避免与其他脚本冲突
            window.addEventListener('click', this.handlers.click, true);
            window.addEventListener('mouseover', this.handlers.mouseover, true);
            window.addEventListener('mouseout', this.handlers.mouseout, true);
            window.addEventListener('mousedown', this.handlers.prevent, true);
            window.addEventListener('mouseup', this.handlers.prevent, true);
            window.addEventListener('auxclick', this.handlers.prevent, true);
            window.addEventListener('contextmenu', this.handlers.prevent, true);
            
            this._blockLinks(true);
            
            ElementHelper.ui.showNotification('🔍 元素选择模式已开启，点击选择元素，按 ESC 或 Alt+X 关闭');
        },
    
        // 禁用选择模式
        disableMode() {
            document.body.style.cursor = '';
            
            window.removeEventListener('click', this.handlers.click, true);
            window.removeEventListener('mouseover', this.handlers.mouseover, true);
            window.removeEventListener('mouseout', this.handlers.mouseout, true);
            window.removeEventListener('mousedown', this.handlers.prevent, true);
            window.removeEventListener('mouseup', this.handlers.prevent, true);
            window.removeEventListener('auxclick', this.handlers.prevent, true);
            window.removeEventListener('contextmenu', this.handlers.prevent, true);
            
            this._blockLinks(false);
    
            if (ElementHelper.state.selectedElement) {
                ElementHelper.state.selectedElement.style.outline = '';
                ElementHelper.state.selectedElement = null;
            }
            // 高级选择器关闭后，恢复普通元素选择器的可用状态（用户若之前启动过它，可继续使用）
            try { window.__elementPickerDisabled = false; } catch (e) {}
            ElementHelper.ui.showNotification('✅ 元素选择模式已关闭');
        },
    
        // 阻止/恢复链接跳转
        _blockLinks(block) {
            if (block) {
                if (!document.getElementById('element-helper-block-links')) {
                    const style = document.createElement('style');
                    style.id = 'element-helper-block-links';
                    style.textContent = `a[href] { pointer-events: auto !important; }`;
                    document.head.appendChild(style);
                }
            } else {
                document.getElementById('element-helper-block-links')?.remove();
            }
        },
    
        // 分析元素
        analyzeElement(element) {
            const info = {
                tag: element.tagName.toLowerCase(),
                id: element.id,
                classes: typeof element.className === 'string' ? element.className : '',
                text: (element.textContent || '').trim().substring(0, 100),
                href: element.href || element.getAttribute('href') || element.closest('a')?.href || '',
                attributes: [],
                selectors: [],
                fullPath: ElementHelper.utils.getFullPath(element)
            };
    
            // 收集data-属性
            for (let attr of element.attributes) {
                if (attr.name.startsWith('data-')) {
                    info.attributes.push({ name: attr.name, value: attr.value });
                }
            }
    
            // 生成选择器
            if (info.id) {
                info.selectors.push(`#${CSS.escape(info.id)}`);
            }
    
            if (info.classes) {
                const classes = info.classes.split(/\s+/).filter(c => c.trim() && !c.includes(':'));
                classes.slice(0, 3).forEach(c => {
                    info.selectors.push(`.${CSS.escape(c)}`);
                });
                if (classes.length > 1) {
                    info.selectors.push('.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.'));
                }
                if (classes.length > 0) {
                    info.selectors.push(`${info.tag}.${CSS.escape(classes[0])}`);
                }
            }
    
            info.attributes.forEach(attr => {
                info.selectors.push(`[${attr.name}="${CSS.escape(attr.value)}"]`);
            });
    
            // 去重
            info.selectors = [...new Set(info.selectors)];
    
            // 控制台输出
            console.clear();
            console.log('%c=== 元素分析结果 ===', 'font-size:16px;font-weight:bold;color:#007bff;');
            console.log('标签:', info.tag);
            console.log('ID:', info.id || '无');
            console.log('类名:', info.classes || '无');
            console.log('链接:', info.href || '无');
            console.log('完整路径:', info.fullPath);
            console.log('%c=== 推荐选择器 ===', 'font-size:14px;font-weight:bold;color:#28a745;');
            info.selectors.forEach((s, i) => {
                try {
                    console.log(`${i + 1}. ${s} (匹配${document.querySelectorAll(s).length}个)`);
                } catch (e) {
                    console.log(`${i + 1}. ${s} (选择器无效)`);
                }
            });
    
            ElementHelper.ui.showPanel(info);
        }
    };
    
    // 初始化
    ElementHelper.core.init();


})();