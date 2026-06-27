<template>
  <div class="app-root">
    <!-- 顶部品牌横幅 -->
    <header class="brand-bar" data-tauri-drag-region>
      <div class="brand-bar-bg"></div>
      <div class="brand-content">
        <div class="brand-left">
          <div class="brand-logo">
            <span class="brand-letter brand-letter-1">W</span>
            <span class="brand-letter brand-letter-2">e</span>
            <span class="brand-letter brand-letter-3">b</span>
            <span class="brand-pill">
              <span class="brand-letter">R</span>
              <span class="brand-letter">P</span>
              <span class="brand-letter">A</span>
            </span>
          </div>
          <div class="brand-meta">
            <div class="brand-title">控制中心</div>
            <div class="brand-version">
              <span class="version-dot"></span>
              <span>v{{ version }}</span>
              <span class="version-sep">·</span>
              <span class="version-tag">网页机器人流程自动化平台</span>
            </div>
          </div>
        </div>
        <div class="window-controls">
          <button class="win-btn" @click="minimize" aria-label="最小化到托盘" title="最小化到系统托盘">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>
          </button>
          <button class="win-btn win-btn-close" @click="closeApp" aria-label="关闭">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- 主体 -->
    <main class="page">
      <!-- 状态条 -->
      <section class="status-strip">
        <div class="status-strip-left">
          <div class="big-status" :class="bigStatusClass">
            <span class="big-status-icon">
              <svg v-if="backendRunning && frontendRunning" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else-if="backendRunning || frontendRunning" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5"/>
                <path d="M8 12h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
            </span>
            <div class="big-status-text">
              <span class="big-status-title">{{ overallStatusText }}</span>
              <span class="big-status-sub">{{ overallStatusSub }}</span>
            </div>
          </div>
        </div>
        <div class="status-strip-right">
          <button class="chip-btn" @click="checkUpdate" :disabled="checking">
            <svg :class="{ rotating: checking }" viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>{{ checking ? '检查中…' : '检查更新' }}</span>
          </button>
          <button class="chip-btn" @click="showConfigModal = true">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>设置</span>
          </button>
          <button class="chip-btn" @click="openGithub">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M12 0c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2 1-.3 2-.4 3-.4s2 .1 3 .4c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.8-1.6 8.2-6.1 8.2-11.4 0-6.6-5.4-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </button>
          <button class="chip-btn chip-btn-pink" @click="showSponsor">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>支持作者</span>
          </button>
        </div>
      </section>


      <!-- 更新通知 -->
      <transition name="fade-slide">
        <section v-if="updateInfo && updateInfo.has_update" class="update-banner">
          <div class="update-banner-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="update-banner-text">
            <div class="update-banner-title">发现新版本 <strong>v{{ updateInfo.latest_version }}</strong></div>
            <div class="update-banner-sub">{{ updateInfo.release_date }} · 点击下载查看更新内容</div>
          </div>
          <div class="update-banner-actions">
            <button class="link-btn" @click="downloadWithMirror">加速下载</button>
            <button class="cta-btn" @click="downloadUpdate">
              <span>立即更新</span>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </section>
      </transition>

      <!-- 主控制卡 -->
      <section class="hero-card">
        <div class="hero-deco"></div>
        <div class="hero-row">
          <div class="hero-info">
            <div class="hero-tag-row">
              <span class="hero-tag">
                <span class="hero-tag-dot"></span>
                <span>本地运行</span>
              </span>
              <span class="hero-tag hero-tag-warm">免费 · 开源 · 无广告</span>
            </div>
            <h1 class="hero-title">
              一键启动你的<span class="hero-highlight">自动化工作站</span>
            </h1>
            <p class="hero-sub">点击启动后将自动拉起后端 API 服务和前端 Web 编辑器，并在浏览器中打开</p>
          </div>
          <div class="hero-cta">
            <button
              v-if="!backendRunning || !frontendRunning"
              class="cta-primary"
              @click="startServices"
              :disabled="starting || startLocked || stopping"
            >
              <span class="cta-glow"></span>
              <svg v-if="!isStarting" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else class="rotating" viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
                  stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>{{ isStarting ? '启动中…' : '启动 WebRPA' }}</span>
            </button>
            <button v-else class="cta-success" @click="openBrowser">
              <span class="cta-glow"></span>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"
                  stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <span>打开 WebRPA 编辑器</span>
            </button>
            <button v-if="backendRunning && frontendRunning" class="cta-agent" @click="openAssistantAgent" title="把小助手作为系统级 Agent 在独立窗口打开">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <rect x="4" y="8" width="16" height="11" rx="3"/>
                <path d="M12 8V4"/><circle cx="12" cy="3" r="1.4" fill="currentColor" stroke="none"/>
                <circle cx="9" cy="13" r="1.3" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="13" r="1.3" fill="currentColor" stroke="none"/>
                <path d="M9.5 16.5h5"/><path d="M2.5 12v3"/><path d="M21.5 12v3"/>
              </svg>
              <span>Agent</span>
            </button>
            <button
              class="cta-stop"
              @click="stopServices"
              :disabled="stopping || (!backendRunning && !frontendRunning)"
            >
              <svg v-if="stopping" class="rotating" viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
                  stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1"/>
              </svg>
              <span>{{ stopping ? '停止中…' : '停止' }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 服务卡片网格 -->
      <section class="service-grid">
        <div class="service-card" :class="{ active: backendRunning }">
          <div class="service-card-inner">
            <div class="service-icon service-icon-blue">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <rect x="3" y="3" width="18" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
                <rect x="3" y="14" width="18" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="7" cy="6.5" r="0.8" fill="currentColor"/>
                <circle cx="7" cy="17.5" r="0.8" fill="currentColor"/>
                <path d="M11 6.5h7M11 17.5h7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="service-text">
              <div class="service-name">后端 API 服务</div>
              <div class="service-meta">
                <span class="service-state-dot" :class="{ on: backendRunning, starting: !backendRunning && isStarting }"></span>
                <span class="service-state-text">{{ backendStateText }}</span>
                <span class="service-divider">·</span>
                <code class="service-port">{{ configForm.backend.host }}:{{ configForm.backend.port }}</code>
              </div>
            </div>
            <button class="service-action" @click="openBackendLog">查看日志</button>
          </div>
          <div class="service-progress" v-if="backendRunning"></div>
        </div>

        <div class="service-card" :class="{ active: frontendRunning }">
          <div class="service-card-inner">
            <div class="service-icon service-icon-purple">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="service-text">
              <div class="service-name">前端 Web 编辑器</div>
              <div class="service-meta">
                <span class="service-state-dot" :class="{ on: frontendRunning, starting: !frontendRunning && isStarting }"></span>
                <span class="service-state-text">{{ frontendStateText }}</span>
                <span class="service-divider">·</span>
                <code class="service-port">{{ configForm.frontend.host }}:{{ configForm.frontend.port }}</code>
              </div>
            </div>
            <button class="service-action" @click="openFrontendLog">查看日志</button>
          </div>
          <div class="service-progress" v-if="frontendRunning"></div>
        </div>
      </section>

      <!-- 信息卡（隐私 + 提示） -->
      <section class="info-row">
        <div class="info-card info-card-green">
          <div class="info-icon-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="info-content">
            <div class="info-title">数据安全</div>
            <div class="info-text">API Key、密码、Token 等敏感配置仅保存在浏览器本地</div>
          </div>
        </div>
        <div class="info-card info-card-blue">
          <div class="info-icon-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="info-content">
            <div class="info-title">默认端口</div>
            <div class="info-text">后端 5241、前端 5921；可通过设置修改实现多开</div>
          </div>
        </div>
        <div class="info-card info-card-pink" @click="showSponsor" style="cursor: pointer">
          <div class="info-icon-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div class="info-content">
            <div class="info-title">独立开发 · 为爱发电</div>
            <div class="info-text">如果它帮到了你，欢迎扫码请作者喝杯咖啡 ☕</div>
          </div>
        </div>
      </section>

      <!-- 底部 -->
      <footer class="footer-bar">
        <span class="footer-copyright">© {{ currentYear }} 青云制作_彭明航 版权所有</span>
        <span class="footer-separator"></span>
        <a class="footer-link" @click="openGithub">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align: -1px; margin-right: 3px">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.467-2.38 1.236-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          GitHub 仓库
        </a>
        <span class="footer-dot">·</span>
        <a class="footer-link footer-bilibili" @click="openBilibili">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align: -1px; margin-right: 3px">
            <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.789 1.894v7.52c.018.764.28 1.395.789 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.789-1.893v-7.52c-.018-.765-.28-1.396-.789-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.387-.947.258-.257.574-.386.946-.386z"/>
          </svg>
          B站主页
        </a>
        <span class="footer-dot">·</span>
        <span class="qq-wrapper" @mouseenter="showQQAnswer = true" @mouseleave="showQQAnswer = false">
          <a class="footer-link footer-qq" @click="joinQQGroup">
            <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align: -1px; margin-right: 3px">
              <path d="M21.395 15.035a39.548 39.548 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.527 4.692 17.247 0 12 0S4.473 4.692 4.473 9.24c0 .274.013.804.014.836l-1.08 2.695a39.547 39.547 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.378.646-.301.778.339.58 5.821.37 7.482.184 1.66.186 7.142.396 7.481-.184.077-.132.134-.458-.3-.778-.483-.356-1.234-.647-1.846-.835 1.638-1.384 2.394-3.302 2.394-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673z"/>
            </svg>
            QQ 群 {{ qqGroupNumber }}
          </a>
          <transition name="qq-answer">
            <div v-if="showQQAnswer" class="qq-answer-tip" @click.stop="copyQQAnswer">
              <span class="qq-answer-label">入群答案</span>
              <span class="qq-answer-value">{{ qqAnswer }}</span>
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" class="qq-answer-copy-icon">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
              </svg>
            </div>
          </transition>
        </span>
        <span class="footer-dot">·</span>
        <a class="footer-link footer-heart" @click="showSponsor">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="vertical-align: -1px; margin-right: 3px">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          支持作者
        </a>
      </footer>
    </main>


    <!-- 赞助弹窗 -->
    <transition name="modal">
      <div v-if="showSponsorModal" class="modal-mask" @click="showSponsorModal = false">
        <div class="modal-shell" @click.stop>
          <div class="modal-banner sponsor-banner">
            <div class="modal-banner-pattern"></div>
            <div class="modal-banner-content">
              <div class="modal-banner-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div class="modal-banner-text">
                <div class="modal-banner-title">支持 WebRPA 持续开发</div>
                <div class="modal-banner-sub">独立学生开发者 · 个人使用完全免费 · 为爱发电</div>
              </div>
            </div>
            <button class="modal-close" @click="showSponsorModal = false">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="sponsor-msg">
              <p>嗨 <span class="emoji">👋</span>，能看到这里说明 WebRPA 已经为你解决了一些问题。</p>
              <p>WebRPA 由独立学生开发者开发并维护，<strong>个人使用完全免费</strong>，没有任何广告或付费墙。</p>
              <div class="sponsor-highlight">
                <span class="sponsor-highlight-bar"></span>
                <span>如果它真的让你的工作变得轻松了一点点，希望你能请作者喝杯咖啡，让这个项目能继续走下去。</span>
              </div>
              <p class="sponsor-thanks">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>每一位赞助者的名称（无论金额多少）我都会手动依次添加到下个版本的 README 文档中以表感谢！</span>
              </p>
            </div>

            <div class="qr-wrap">
              <div class="qr-card qr-card-wechat" @click="enlargedQr = wechatQr">
                <div class="qr-frame">
                  <img :src="wechatQr" alt="微信" />
                </div>
              </div>
              <div class="qr-card qr-card-alipay" @click="enlargedQr = alipayQr">
                <div class="qr-frame">
                  <img :src="alipayQr" alt="支付宝" />
                </div>
              </div>
            </div>

            <button class="ifdian-btn" @click="openIfdian">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              <span>您也可以通过"爱发电"平台持续支持 WebRPA 的开发工作</span>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" style="margin-left:auto">
                <path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>

            <div class="sponsor-note">
              <div class="note-line">
                <span class="note-tag">备注</span>
                <span>赞助时请备注名称，这样能更方便我收录到下个版本的 README 文档中</span>
              </div>
              <div class="note-line">
                <span class="note-tag">联系</span>
                <span>若您对 WebRPA 有任何疑问，可以添加开发者的 QQ：2124691573</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 关闭赞助提示的二次确认（祈求挽留）弹窗 -->
    <transition name="modal">
      <div v-if="showSponsorFarewellModal" class="modal-mask" @click="keepSponsorOn">
        <div class="modal-shell modal-shell-narrow" @click.stop>
          <div class="modal-banner farewell-banner">
            <div class="modal-banner-pattern"></div>
            <div class="modal-banner-content">
              <div class="modal-banner-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div class="modal-banner-text">
                <div class="modal-banner-title">真的要关闭赞助提示吗？</div>
                <div class="modal-banner-sub">在你点掉之前，请再给我一分钟说几句心里话</div>
              </div>
            </div>
            <button class="modal-close" @click="keepSponsorOn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="farewell-msg">
              <p>我是 WebRPA 背后的那位<strong>独立学生开发者</strong>，一个人一边上学、一边把这么大的一个开源项目造了出来，真的很不容易。</p>
              <p>这个软件<strong>个人使用完全免费</strong>，没有广告、没有付费墙，每一个功能都是我熬了无数的夜才做出来的。它能继续走下去，靠的就是像您这样愿意停下来看一眼的人。</p>
              <div class="farewell-highlight">
                <span class="farewell-highlight-bar"></span>
                <span>关掉赞助弹窗当然没问题，但我也怕从此你就忘了我还在为爱发电。如果 WebRPA 帮到过你，哪怕只是请我喝杯咖啡，对我都是莫大的鼓励。</span>
              </div>
              <p class="farewell-beg">这是我最后小小的恳求 🙏 —— 要不，先去看一眼赞助页面？哪怕只是看看也好。</p>
            </div>
            <div class="farewell-actions">
              <button class="farewell-btn farewell-btn-primary" @click="gotoSponsorFromFarewell">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>好，去支持一下作者</span>
              </button>
              <button class="farewell-btn farewell-btn-keep" @click="keepSponsorOn">再想想，先留着吧</button>
              <button class="farewell-btn farewell-btn-ghost" @click="confirmDisableSponsor">仍然关闭提示</button>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 接单广告弹窗 -->
    <transition name="modal">
      <div v-if="showHire" class="modal-mask" @click="showHire = false">
        <div class="modal-shell" @click.stop>
          <div class="modal-banner hire-banner">
            <div class="modal-banner-content">
              <div class="modal-banner-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
              <div class="modal-banner-text">
                <div class="modal-banner-title">把开发需求交给作者</div>
                <div class="modal-banner-sub">微信小程序 · 网站 · 桌面应用 · 自动化脚本</div>
              </div>
            </div>
            <button class="modal-close" @click="showHire = false">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p class="hire-intro">您有以下开发需求？欢迎把项目交给作者承接，专业全栈开发、价格公道、按时交付：</p>
            <div class="hire-grid">
              <div class="hire-item">
                <span class="hire-ic hire-ic-green">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M9.5 4C5.36 4 2 6.86 2 10.38c0 1.98 1.07 3.75 2.75 4.94L4 18l2.6-1.36c.9.26 1.87.4 2.9.4.27 0 .53-.01.8-.03a5.4 5.4 0 0 1-.2-1.45c0-3.16 3.06-5.6 6.7-5.6.3 0 .59.02.88.06C16.97 6.36 13.6 4 9.5 4Zm-2.4 3.1a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Zm4.9 0a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z"/>
                    <path d="M22 15.5c0-2.8-2.74-5.06-6.12-5.06-3.38 0-6.13 2.26-6.13 5.06s2.75 5.07 6.13 5.07c.7 0 1.38-.1 2.01-.28L20 21.5l-.5-1.86C21.04 18.67 22 17.18 22 15.5Zm-8.13-1.3a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z"/>
                  </svg>
                </span>
                <div class="hire-item-text">
                  <div class="hire-item-title">微信小程序全栈开发</div>
                  <div class="hire-item-sub">前后端一体，从设计到上线</div>
                </div>
              </div>
              <div class="hire-item">
                <span class="hire-ic hire-ic-blue">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
                  </svg>
                </span>
                <div class="hire-item-text">
                  <div class="hire-item-title">网站全栈开发</div>
                  <div class="hire-item-sub">官网 / 后台 / Web 应用</div>
                </div>
              </div>
              <div class="hire-item">
                <span class="hire-ic hire-ic-indigo">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="12" rx="1.5"/>
                    <path d="M8 20h8M12 16v4"/>
                  </svg>
                </span>
                <div class="hire-item-text">
                  <div class="hire-item-title">Windows 桌面应用开发</div>
                  <div class="hire-item-sub">工具软件 / 自动化客户端</div>
                </div>
              </div>
              <div class="hire-item">
                <span class="hire-ic hire-ic-cyan">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m7 8-4 4 4 4M17 8l4 4-4 4M14 4l-4 16"/>
                  </svg>
                </span>
                <div class="hire-item-text">
                  <div class="hire-item-title">自动化脚本开发</div>
                  <div class="hire-item-sub">RPA / 爬虫 / 批处理</div>
                </div>
              </div>
            </div>
            <div class="hire-contact">
              <div class="hire-contact-row" @click="copyContact('wechat')">
                <span class="hire-contact-ic hire-contact-ic-wechat">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M9.5 4C5.36 4 2 6.86 2 10.38c0 1.98 1.07 3.75 2.75 4.94L4 18l2.6-1.36c.9.26 1.87.4 2.9.4.27 0 .53-.01.8-.03a5.4 5.4 0 0 1-.2-1.45c0-3.16 3.06-5.6 6.7-5.6.3 0 .59.02.88.06C16.97 6.36 13.6 4 9.5 4Zm-2.4 3.1a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Zm4.9 0a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9Z"/>
                    <path d="M22 15.5c0-2.8-2.74-5.06-6.12-5.06-3.38 0-6.13 2.26-6.13 5.06s2.75 5.07 6.13 5.07c.7 0 1.38-.1 2.01-.28L20 21.5l-.5-1.86C21.04 18.67 22 17.18 22 15.5Zm-8.13-1.3a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Zm4 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6Z"/>
                  </svg>
                </span>
                <span class="hire-contact-label">微信</span>
                <code class="hire-contact-value">QyPmh20061026</code>
                <button class="hire-copy-btn">复制</button>
              </div>
              <div class="hire-contact-row" @click="copyContact('qq')">
                <span class="hire-contact-ic hire-contact-ic-qq">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 2c2.7 0 4.9 2.3 5.1 5.2.06.8.5 1.5.9 2.2.7 1.2 1.4 2.4 1.4 4.3 0 1.3-.4 2.2-.9 2.2-.4 0-.8-.6-1.1-1.5-.2.9-.6 1.7-1.1 2.4.6.3 1 .7 1 1.2 0 .9-1.9 1.6-4.3 1.7l-.9.02h-.2l-.9-.02C9.7 21.4 7.8 20.7 7.8 19.8c0-.5.4-.9 1-1.2-.5-.7-.9-1.5-1.1-2.4-.3.9-.7 1.5-1.1 1.5-.5 0-.9-.9-.9-2.2 0-1.9.7-3.1 1.4-4.3.4-.7.84-1.4.9-2.2C8.1 4.3 9.3 2 12 2Z"/>
                  </svg>
                </span>
                <span class="hire-contact-label">QQ</span>
                <code class="hire-contact-value">2124691573</code>
                <button class="hire-copy-btn">复制</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 二维码放大查看 -->
    <transition name="modal">
      <div v-if="enlargedQr" class="qr-zoom-mask" @click="enlargedQr = ''">
        <img :src="enlargedQr" class="qr-zoom-img" @click.stop />
        <button class="qr-zoom-close" @click="enlargedQr = ''">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </transition>

    <!-- 设置弹窗 -->
    <transition name="modal">
      <div v-if="showConfigModal" class="modal-mask" @click="cancelConfig">
        <div class="modal-shell modal-shell-config" @click.stop>
          <div class="modal-banner config-banner">
            <div class="modal-banner-pattern"></div>
            <div class="modal-banner-content">
              <div class="modal-banner-icon">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white">
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" stroke-width="2"/>
                </svg>
              </div>
              <div class="modal-banner-text">
                <div class="modal-banner-title">启动器设置</div>
                <div class="modal-banner-sub">服务监听地址和端口</div>
              </div>
            </div>
            <button class="modal-close" @click="cancelConfig">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div class="cfg-block">
              <div class="cfg-block-head">
                <span class="cfg-block-icon cfg-block-icon-indigo">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>
                  </svg>
                </span>
                <span class="cfg-block-title">界面语言 / Language</span>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">显示语言</div>
                  <div class="cfg-toggle-sub">切换启动器中英文；Agent 独立窗口语言会跟随此设置</div>
                </div>
                <div class="lang-seg">
                  <button class="lang-seg-btn" :class="{ on: uiLang === 'zh' }" @click="setUiLang('zh')">中文</button>
                  <button class="lang-seg-btn" :class="{ on: uiLang === 'en' }" @click="setUiLang('en')">English</button>
                </div>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">主题色</div>
                  <div class="cfg-toggle-sub">默认 / 暗色（护眼深色）/ 灰色（灰度专注），切换即时生效</div>
                </div>
                <div class="lang-seg">
                  <button class="lang-seg-btn" :class="{ on: uiTheme === 'default' }" @click="setUiTheme('default')">默认</button>
                  <button class="lang-seg-btn" :class="{ on: uiTheme === 'dark' }" @click="setUiTheme('dark')">暗色</button>
                  <button class="lang-seg-btn" :class="{ on: uiTheme === 'gray' }" @click="setUiTheme('gray')">灰色</button>
                </div>
              </div>
            </div>
            <div class="cfg-block">
              <div class="cfg-block-head">
                <span class="cfg-block-icon cfg-block-icon-blue">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <rect x="3" y="3" width="18" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
                    <rect x="3" y="14" width="18" height="7" rx="2" stroke="currentColor" stroke-width="2"/>
                    <circle cx="7" cy="6.5" r="0.8" fill="currentColor"/>
                    <circle cx="7" cy="17.5" r="0.8" fill="currentColor"/>
                  </svg>
                </span>
                <span class="cfg-block-title">后端服务</span>
              </div>
              <div class="cfg-row">
                <label>监听地址</label>
                <div class="custom-select" :class="{ open: backendHostOpen }" @click.stop="backendHostOpen = !backendHostOpen" tabindex="0" @blur="backendHostOpen = false">
                  <span class="custom-select-value">{{ configForm.backend.host === '127.0.0.1' ? '127.0.0.1（仅本机）' : '0.0.0.0（允许局域网访问）' }}</span>
                  <svg class="custom-select-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <div class="custom-select-dropdown" v-if="backendHostOpen">
                    <div class="custom-select-option" :class="{ active: configForm.backend.host === '127.0.0.1' }" @click.stop="configForm.backend.host = '127.0.0.1'; backendHostOpen = false">127.0.0.1（仅本机）</div>
                    <div class="custom-select-option" :class="{ active: configForm.backend.host === '0.0.0.0' }" @click.stop="configForm.backend.host = '0.0.0.0'; backendHostOpen = false">0.0.0.0（允许局域网访问）</div>
                  </div>
                </div>
              </div>
              <div class="cfg-row">
                <label>端口号</label>
                <input type="number" v-model.number="configForm.backend.port" class="cfg-input" min="1024" max="65535" placeholder="5241"/>
              </div>
            </div>

            <div class="cfg-block">
              <div class="cfg-block-head">
                <span class="cfg-block-icon cfg-block-icon-purple">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                    <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span class="cfg-block-title">前端服务</span>
              </div>
              <div class="cfg-row">
                <label>监听地址</label>
                <div class="custom-select" :class="{ open: frontendHostOpen }" @click.stop="frontendHostOpen = !frontendHostOpen" tabindex="0" @blur="frontendHostOpen = false">
                  <span class="custom-select-value">{{ configForm.frontend.host === '127.0.0.1' ? '127.0.0.1（仅本机）' : '0.0.0.0（允许局域网访问）' }}</span>
                  <svg class="custom-select-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none"><polyline points="6 9 12 15 18 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  <div class="custom-select-dropdown" v-if="frontendHostOpen">
                    <div class="custom-select-option" :class="{ active: configForm.frontend.host === '127.0.0.1' }" @click.stop="configForm.frontend.host = '127.0.0.1'; frontendHostOpen = false">127.0.0.1（仅本机）</div>
                    <div class="custom-select-option" :class="{ active: configForm.frontend.host === '0.0.0.0' }" @click.stop="configForm.frontend.host = '0.0.0.0'; frontendHostOpen = false">0.0.0.0（允许局域网访问）</div>
                  </div>
                </div>
              </div>
              <div class="cfg-row">
                <label>端口号</label>
                <input type="number" v-model.number="configForm.frontend.port" class="cfg-input" min="1024" max="65535" placeholder="5921"/>
              </div>
            </div>

            <div class="cfg-block">
              <div class="cfg-block-head">
                <span class="cfg-block-icon cfg-block-icon-indigo">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </span>
                <span class="cfg-block-title">启动器偏好</span>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">开机自启动</div>
                  <div class="cfg-toggle-sub">开机登录 Windows 后自动启动 WebRPA 启动器（可配合下方"自动启动服务"实现开机即用）</div>
                </div>
                <label class="cfg-switch" :class="{ on: autoLaunchOnBoot }">
                  <input type="checkbox" v-model="autoLaunchOnBoot" />
                  <span class="cfg-switch-track"><span class="cfg-switch-thumb"></span></span>
                </label>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">自动启动前后端服务</div>
                  <div class="cfg-toggle-sub">打开启动器后立即拉起 API 与编辑器，无需点击启动按钮</div>
                </div>
                <label class="cfg-switch" :class="{ on: autoStartServices }">
                  <input type="checkbox" v-model="autoStartServices" />
                  <span class="cfg-switch-track"><span class="cfg-switch-thumb"></span></span>
                </label>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">启动时自动隐藏到托盘</div>
                  <div class="cfg-toggle-sub">启动器开启后不显示主窗口，直接最小化到系统托盘，可随时点击托盘图标唤出</div>
                </div>
                <label class="cfg-switch" :class="{ on: startHiddenToTray }">
                  <input type="checkbox" v-model="startHiddenToTray" />
                  <span class="cfg-switch-track"><span class="cfg-switch-thumb"></span></span>
                </label>
              </div>
              <div class="cfg-row cfg-row-toggle">
                <div class="cfg-toggle-text">
                  <div class="cfg-toggle-title">启动时弹出赞助提示</div>
                  <div class="cfg-toggle-sub">关闭后不再每次启动都弹窗，仍可通过右上角"支持作者"打开</div>
                </div>
                <label class="cfg-switch" :class="{ on: showSponsorOnStartup }">
                  <input type="checkbox" :checked="showSponsorOnStartup" @change="onSponsorToggle" />
                  <span class="cfg-switch-track"><span class="cfg-switch-thumb"></span></span>
                </label>
              </div>
            </div>

            <div class="cfg-tips">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8h.01M11 12h1v4h1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              修改端口后需要重启服务才能生效
            </div>

            <div class="cfg-actions" v-if="autoSaveStatus === 'invalid'">
              <div class="autosave-status">
                <span class="autosave-invalid">端口需在 1024-65535 且前后端不同，未保存</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- 关闭中遮罩 -->
    <transition name="closing">
      <div v-if="closing" class="closing-mask">
        <div class="closing-card">
          <div class="closing-spinner">
            <span class="closing-spinner-ring"></span>
            <span class="closing-spinner-ring"></span>
            <span class="closing-spinner-ring"></span>
          </div>
          <div class="closing-title">正在关闭 WebRPA 启动器</div>
          <div class="closing-sub">{{ closingMessage }}</div>
          <div class="closing-progress">
            <span class="closing-progress-bar"></span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 右下角浮动：外包开发入口 -->
    <button class="hire-fab" @click="showHire = true" data-tip="外包开发 · 找作者接需求">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
      <span>外包开发</span>
    </button>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast-${toast.type}`">
        <span class="toast-icon">
          <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" width="14" height="14" fill="none">
            <path d="M5 12l5 5L20 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" width="14" height="14" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </transition>
  </div>
</template>


<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import wechatQr from './assets/wechat-qr.png'
import alipayQr from './assets/alipay-qr.jpg'

const version = ref('')
const checking = ref(false)
const updateInfo = ref(null)
const starting = ref(false)
// 停止过程中（点击停止 → 确认完全停止前），用于显示“停止中”反馈
const stopping = ref(false)
// 启动后的最小锁定（10 秒内即使发生异常也不让"启动"按钮恢复可点，避免慢电脑上用户误以为失败而重复点击）
const startLocked = ref(false)
let startLockTimer = null
const backendRunning = ref(false)
const frontendRunning = ref(false)
const showSponsorModal = ref(false)
// 关闭"启动时弹出赞助提示"开关时的二次确认（祈求挽留）弹窗
const showSponsorFarewellModal = ref(false)
const showHire = ref(false)
const enlargedQr = ref('')
const showConfigModal = ref(false)
// 界面语言（与 i18n.js 联动；Agent 窗口语言跟随）
const uiLang = ref('zh')
const setUiLang = (l) => {
  uiLang.value = l
  try { if (window.__setLauncherLang) window.__setLauncherLang(l) } catch (e) {}
  // 若 Agent 窗口已打开，实时同步其语言（窗口没开则后端命令为空操作，不会弹窗）
  try { invoke('sync_assistant_agent_lang', { lang: l }) } catch (e) {}
}
// 界面主题（默认/暗色/灰色，Dark Reader 式滤镜挂在 <html> 上；持久化 localStorage）
const THEME_KEY = 'webrpa.launcher.theme'
const uiTheme = ref('default')
const applyTheme = (t) => {
  try {
    const el = document.documentElement
    if (t === 'default') el.removeAttribute('data-webrpa-theme')
    else el.setAttribute('data-webrpa-theme', t)
  } catch (e) {}
}
const setUiTheme = (t) => {
  uiTheme.value = t
  try { localStorage.setItem(THEME_KEY, t) } catch (e) {}
  applyTheme(t)
}
// 是否在启动器启动时自动弹出赞助提示（持久化在 localStorage，默认开启）
// 注意：使用带版本号的新 key。旧版启动器很多用户已手动关闭（旧 key 存了 '0'），
// 从本版本起改用新 key，等于"忘掉"旧版关闭数据，所有用户重新默认开启；
// 除非用户在新版本里再次手动关闭，才会写入新 key 的 '0'。
const SPONSOR_AUTO_KEY = 'webrpa.launcher.sponsorAutoShow.v2'
const SPONSOR_AUTO_KEY_LEGACY = 'webrpa.launcher.sponsorAutoShow'
try { localStorage.removeItem(SPONSOR_AUTO_KEY_LEGACY) } catch {}
const showSponsorOnStartup = ref(
  (() => {
    try {
      const v = localStorage.getItem(SPONSOR_AUTO_KEY)
      return v === null ? true : v === '1'
    } catch { return true }
  })()
)
watch(showSponsorOnStartup, (v) => {
  try { localStorage.setItem(SPONSOR_AUTO_KEY, v ? '1' : '0') } catch {}
})

// 是否在启动器启动时自动拉起前后端服务（默认关闭）
const AUTO_START_KEY = 'webrpa.launcher.autoStartServices'
const autoStartServices = ref(
  (() => {
    try {
      const v = localStorage.getItem(AUTO_START_KEY)
      return v === '1'
    } catch { return false }
  })()
)
watch(autoStartServices, (v) => {
  try { localStorage.setItem(AUTO_START_KEY, v ? '1' : '0') } catch {}
})

// 开机自启动（调用 Rust 端 autostart 插件，真实写入系统启动项）
const autoLaunchOnBoot = ref(false)
// 标记初始读取阶段，避免读取到当前状态后又触发 watch 反向写入
let suppressAutoLaunchWrite = false
watch(autoLaunchOnBoot, async (v) => {
  if (suppressAutoLaunchWrite) return
  try {
    await invoke('set_autostart', { enable: v })
    showToast(v ? '已开启开机自启动' : '已关闭开机自启动', 'success')
  } catch (e) {
    showToast(`设置开机自启动失败: ${e}`, 'error')
    // 失败时回滚开关状态
    suppressAutoLaunchWrite = true
    autoLaunchOnBoot.value = !v
    setTimeout(() => { suppressAutoLaunchWrite = false }, 0)
  }
})

// 启动时自动隐藏到托盘（调用 Rust 端 set_start_hidden，持久化到 launcher_settings.json）
const startHiddenToTray = ref(false)
let suppressStartHiddenWrite = false
watch(startHiddenToTray, async (v) => {
  if (suppressStartHiddenWrite) return
  try {
    await invoke('set_start_hidden', { enable: v })
    showToast(v ? '已开启：启动时自动隐藏到托盘' : '已关闭：启动时显示主窗口', 'success')
  } catch (e) {
    showToast(`设置启动隐藏失败: ${e}`, 'error')
    // 失败时回滚开关状态
    suppressStartHiddenWrite = true
    startHiddenToTray.value = !v
    setTimeout(() => { suppressStartHiddenWrite = false }, 0)
  }
})
const saving = ref(false)
// 自动保存状态：idle / saving / saved / invalid
const autoSaveStatus = ref('idle')
let autoSaveTimer = null
let suppressAutoSave = false
const closing = ref(false)
const closingMessage = ref('正在关闭服务，请稍候…')
const statusCheckInterval = ref(null)

// 动态年份
const currentYear = new Date().getFullYear()
// QQ 技术交流群号
const qqGroupNumber = '115069513'
// QQ 群入群答案（悬停 QQ 群号时浮现，点击可复制）
const qqAnswer = '青云制作_彭明航'
const showQQAnswer = ref(false)

const configForm = ref({
  backend: { host: '0.0.0.0', port: 5241, reload: false },
  frontend: { host: '0.0.0.0', port: 5921 },
})

// 自定义下拉框状态
const backendHostOpen = ref(false)
const frontendHostOpen = ref(false)

const toast = ref({ show: false, type: 'info', message: '' })
let toastTimer = null
const showToast = (message, type = 'info', duration = 2500) => {
  toast.value = { show: true, type, message }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, duration)
}

const overallStatusText = computed(() => {
  if (stopping.value) return '停止中'
  if (backendRunning.value && frontendRunning.value) return '全部就绪'
  if (isStarting.value) return '启动中'
  if (backendRunning.value || frontendRunning.value) return '部分运行'
  return '未启动'
})
const overallStatusSub = computed(() => {
  if (stopping.value) return '正在停止后端与前端服务，请稍候…'
  if (backendRunning.value && frontendRunning.value) return '后端和前端服务均已运行'
  if (isStarting.value) {
    if (frontendRunning.value && !backendRunning.value) return '前端已就绪，后端正在启动中（首次启动较慢，请耐心等待）'
    if (backendRunning.value && !frontendRunning.value) return '后端已就绪，前端正在启动中…'
    return '正在启动后端与前端服务，请稍候…'
  }
  if (backendRunning.value && !frontendRunning.value) return '前端服务尚未运行'
  if (!backendRunning.value && frontendRunning.value) return '后端服务尚未运行'
  return '点击下方按钮启动 WebRPA'
})
const bigStatusClass = computed(() => {
  if (stopping.value) return 'status-warn'
  if (backendRunning.value && frontendRunning.value) return 'status-success'
  if (isStarting.value) return 'status-warn'
  if (backendRunning.value || frontendRunning.value) return 'status-warn'
  return 'status-idle'
})
// 是否处于启动过程中（启动中 或 10 秒最小锁定内）
const isStarting = computed(() => starting.value || startLocked.value)
// 单个服务的状态文案：运行中 / 停止中 / 启动中 / 未启动
const backendStateText = computed(() => stopping.value && backendRunning.value ? '停止中' : (backendRunning.value ? '运行中' : (isStarting.value ? '启动中' : '未启动')))
const frontendStateText = computed(() => stopping.value && frontendRunning.value ? '停止中' : (frontendRunning.value ? '运行中' : (isStarting.value ? '启动中' : '未启动')))

// 标题栏控制
const minimize = async () => {
  // 最小化到系统托盘：隐藏窗口，可通过托盘图标或菜单恢复
  try { await getCurrentWindow().hide() } catch (e) { console.error(e) }
}
const closeApp = async () => {
  // 防止重复点击
  if (closing.value) return
  closing.value = true
  closingMessage.value = '正在关闭后端与前端服务…'
  try {
    // 停止服务（这一步可能耗时 1-3 秒）
    await invoke('stop_services')
    closingMessage.value = '服务已停止，正在退出启动器…'
  } catch (err) {
    console.error('stop_services 出错:', err)
    closingMessage.value = '正在退出启动器…'
  }
  // 给用户一个能看见提示的最短停留时间，避免一闪而过
  await new Promise((r) => setTimeout(r, 350))
  try {
    await getCurrentWindow().close()
  } catch (e) {
    console.error(e)
    // 关闭失败时回退状态
    closing.value = false
  }
}

// 服务状态轮询
const checkServiceStatus = async () => {
  try {
    const [backend, frontend] = await invoke('check_service_status')
    backendRunning.value = backend
    frontendRunning.value = frontend
  } catch (error) {
    console.error('检查服务状态失败:', error)
  }
}
const startStatusCheck = () => {
  if (statusCheckInterval.value) clearInterval(statusCheckInterval.value)
  statusCheckInterval.value = setInterval(checkServiceStatus, 3000)
}
const stopStatusCheck = () => {
  if (statusCheckInterval.value) {
    clearInterval(statusCheckInterval.value)
    statusCheckInterval.value = null
  }
}

const checkUpdate = async () => {
  if (checking.value) return
  checking.value = true
  try {
    // 版本号无效时先重新读取，避免用 "?" 去比较导致误报"有新版本"
    if (!version.value || version.value === '?') {
      try { version.value = await invoke('get_version') } catch {}
    }
    if (!version.value || version.value === '?') {
      showToast('暂时无法读取本地版本，请稍后重试', 'info')
      return
    }
    const result = await invoke('check_update', { currentVersion: version.value })
    updateInfo.value = result
    if (!result.has_update) showToast('当前已是最新版本', 'success')
  } catch (error) {
    showToast(`检查更新失败: ${error}`, 'error')
  } finally {
    checking.value = false
  }
}

const downloadUpdate = () => {
  if (updateInfo.value?.update_url) invoke('open_browser', { url: updateInfo.value.update_url })
}
const downloadWithMirror = () => {
  if (updateInfo.value?.latest_version) {
    const v = updateInfo.value.latest_version
    const mirrorUrl = `https://ghfile.geekertao.top/github.com/pmh1314520/WebRPA/releases/download/v${v}/WebRPA-${v}-FullVersion.7z`
    invoke('open_browser', { url: mirrorUrl })
    showToast('已打开加速下载，下载后解压覆盖原目录', 'info', 3500)
  }
}

async function waitFor(predicate, maxIter, intervalMs, beforeCheck) {
  for (let i = 0; i < maxIter; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    if (beforeCheck) await beforeCheck()
    if (predicate()) return true
  }
  return false
}

const startServices = async () => {
  starting.value = true
  // 启动后至少锁定 10 秒，期间按钮保持"启动中"不可点，避免慢电脑上用户误以为失败而重复点击
  startLocked.value = true
  if (startLockTimer) clearTimeout(startLockTimer)
  startLockTimer = setTimeout(() => { startLocked.value = false }, 10000)
  try {
    await checkServiceStatus()
    const needBackend = !backendRunning.value
    const needFrontend = !frontendRunning.value
    if (!needBackend && !needFrontend) {
      showToast('所有服务都已在运行', 'info')
      return
    }
    // 并行启动后端与前端（两者相互独立），把启动时间从「串行相加」压成「并行取最大」
    if (needBackend) await invoke('start_backend')
    if (needFrontend) await invoke('start_frontend')

    // 并行等待两者就绪；轮询间隔 200ms，更快感知端口就绪（600 次 × 200ms = 120s 超时）
    const waits = []
    if (needBackend) waits.push(waitFor(() => backendRunning.value, 600, 200, checkServiceStatus).then((ok) => ({ name: '后端', ok })))
    if (needFrontend) waits.push(waitFor(() => frontendRunning.value, 600, 200, checkServiceStatus).then((ok) => ({ name: '前端', ok })))
    const results = await Promise.all(waits)
    const failed = results.find((r) => !r.ok)
    if (failed) throw new Error(`${failed.name}启动超时（120 秒），请检查${failed.name}日志`)

    await checkServiceStatus()
    if (backendRunning.value && frontendRunning.value) {
      showToast('服务启动成功，正在打开浏览器…', 'success')
      setTimeout(openBrowser, 200)
    }
  } catch (error) {
    const msg = typeof error === 'string' ? error : String(error?.message || error)
    showToast(msg, 'error', 4500)
    await checkServiceStatus()
  } finally {
    starting.value = false
  }
}

const stopServices = async () => {
  if (stopping.value) return
  stopping.value = true
  try {
    await invoke('stop_services')
    // 轮询确认确实已停止，期间界面持续显示“停止中”，避免“卡住无反应突然就停了”
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 400))
      await checkServiceStatus()
      if (!backendRunning.value && !frontendRunning.value) break
    }
    showToast('服务已停止', 'info')
  } catch (error) {
    showToast(`停止失败: ${error}`, 'error')
    await checkServiceStatus()
  } finally {
    stopping.value = false
  }
}

const openBrowser = async () => {
  try {
    const config = await invoke('read_config')
    const url = `http://localhost:${config.frontend.port}?backend_port=${config.backend.port}`
    await invoke('open_browser', { url })
  } catch (error) {
    showToast(`打开浏览器失败: ${error}`, 'error')
  }
}

// 打开小助手「独立原生窗口 / 系统级 Agent」（Tauri 原生窗口，支持置顶/拖动/贴边隐藏）
const openAssistantAgent = async () => {
  try {
    // 用实时权威语言（i18n.js 的 curLang），避免 uiLang ref 偶发不同步导致 Agent 语言传错
    let lang = uiLang.value
    try { if (window.__getLauncherLang) lang = window.__getLauncherLang() } catch (e) {}
    await invoke('open_assistant_agent_window', { lang })
  } catch (error) {
    showToast(`打开小助手失败: ${error}`, 'error')
  }
}

const openGithub = () => invoke('open_browser', { url: 'https://github.com/pmh1314520/WebRPA' })
const openBilibili = () => invoke('open_browser', { url: 'https://space.bilibili.com/1102546347' })
const openIfdian = () => invoke('open_browser', { url: 'https://ifdian.net/a/qypmh' })
const copyQQGroup = async () => {
  try {
    await navigator.clipboard.writeText(qqGroupNumber)
    showToast(`已复制 QQ 群号 ${qqGroupNumber}`, 'success')
  } catch {
    showToast(`QQ 群号：${qqGroupNumber}`, 'info', 4000)
  }
}
const joinQQGroup = () => {
  invoke('open_browser', { url: 'https://qm.qq.com/q/gPLP62XomA' })
}
const copyQQAnswer = async () => {
  try {
    await navigator.clipboard.writeText(qqAnswer)
    showToast(`已复制入群答案：${qqAnswer}`, 'success')
  } catch {
    showToast(`入群答案：${qqAnswer}`, 'info', 4000)
  }
}
const showSponsor = () => { showSponsorModal.value = true }

// 赞助开关切换：开启直接生效；关闭时先弹挽留弹窗，由用户确认才真正关闭
const onSponsorToggle = (e) => {
  const checked = e && e.target ? e.target.checked : false
  if (checked) {
    showSponsorOnStartup.value = true
  } else {
    // 暂不关闭，先把开关视觉恢复为开
    if (e && e.target) e.target.checked = true
    // 关闭设置弹窗，避免挽留弹窗被设置弹窗盖在下一层
    showConfigModal.value = false
    showSponsorFarewellModal.value = true
  }
}
// 挽留：保持开启（什么都不改，仅关闭弹窗）
const keepSponsorOn = () => { showSponsorFarewellModal.value = false }
// 挽留：去赞助页面
const gotoSponsorFromFarewell = () => {
  showSponsorFarewellModal.value = false
  showSponsorModal.value = true
}
// 挽留：用户坚持关闭，真正写入 false
const confirmDisableSponsor = () => {
  showSponsorFarewellModal.value = false
  showSponsorOnStartup.value = false
}

// 复制接单联系方式
const copyContact = async (kind) => {
  const map = { wechat: 'QyPmh20061026', qq: '2124691573' }
  const label = { wechat: '微信号', qq: 'QQ' }
  try {
    await navigator.clipboard.writeText(map[kind])
    showToast(`已复制${label[kind]}：${map[kind]}`, 'success')
  } catch {
    showToast('复制失败，请手动复制', 'error')
  }
}
const showLicense = () => invoke('open_browser', { url: 'https://github.com/pmh1314520/WebRPA/blob/main/LICENSE' })

const loadConfig = async () => {
  try {
    const config = await invoke('read_config')
    const parsed = JSON.parse(JSON.stringify(config))
    suppressAutoSave = true   // 加载赋值不触发自动保存
    configForm.value = parsed
    // 等本次响应式更新的 watch 回调跑完后再放开
    setTimeout(() => { suppressAutoSave = false }, 0)
  } catch (error) { console.error('加载配置失败:', error) }
}

// 校验配置是否合法（端口范围 / 不冲突）
const validateConfig = () => {
  const b = configForm.value.backend?.port
  const f = configForm.value.frontend?.port
  if (b < 1024 || b > 65535 || f < 1024 || f > 65535) return false
  if (b === f) return false
  return true
}

// 静默持久化（用于实时自动保存，不弹成功提示、不关闭弹窗）
const persistConfig = async () => {
  if (!validateConfig()) { autoSaveStatus.value = 'invalid'; return }
  autoSaveStatus.value = 'saving'
  try {
    await invoke('save_config', { config: configForm.value })
    autoSaveStatus.value = 'saved'
  } catch (error) {
    console.error('自动保存失败:', error)
    autoSaveStatus.value = 'idle'
  }
}

// 深度监听配置表单，改动后防抖 500ms 实时自动保存
watch(configForm, () => {
  if (suppressAutoSave) return
  autoSaveStatus.value = 'saving'
  if (autoSaveTimer) clearTimeout(autoSaveTimer)
  autoSaveTimer = setTimeout(() => { persistConfig() }, 500)
}, { deep: true })

const saveConfiguration = async () => {
  saving.value = true
  try {
    if (configForm.value.backend.port < 1024 || configForm.value.backend.port > 65535) {
      showToast('后端端口必须在 1024-65535', 'error'); return
    }
    if (configForm.value.frontend.port < 1024 || configForm.value.frontend.port > 65535) {
      showToast('前端端口必须在 1024-65535', 'error'); return
    }
    if (configForm.value.backend.port === configForm.value.frontend.port) {
      showToast('后端和前端端口不能相同', 'error'); return
    }
    await invoke('save_config', { config: configForm.value })
    showToast('配置已保存', 'success')
    showConfigModal.value = false
    if (backendRunning.value || frontendRunning.value) {
      showToast('服务运行中，重启后才会应用新配置', 'info', 3500)
    }
  } catch (error) {
    showToast(`保存失败: ${error}`, 'error')
  } finally {
    saving.value = false
  }
}

const cancelConfig = () => { showConfigModal.value = false }
const openBackendLog = async () => {
  try { await invoke('open_backend_log') } catch (e) { showToast(`打开后端日志失败: ${e}`, 'error') }
}
const openFrontendLog = async () => {
  try { await invoke('open_frontend_log') } catch (e) { showToast(`打开前端日志失败: ${e}`, 'error') }
}

onMounted(async () => {
  try { uiLang.value = (window.__getLauncherLang && window.__getLauncherLang()) || 'zh' } catch (e) {}
  try { const t = localStorage.getItem(THEME_KEY); uiTheme.value = (t === 'dark' || t === 'gray') ? t : 'default'; applyTheme(uiTheme.value) } catch (e) {}
  try { version.value = await invoke('get_version') } catch { version.value = '?' }
  // 防御：版本号偶发读取为空/失败时重试几次（路径问题已在 Rust 端用 exe 目录修复，
  // 这里再兜底，避免左上角短暂显示 v?，以及据此误判"非最新版"）
  if (!version.value || version.value === '?') {
    for (let i = 0; i < 5 && (!version.value || version.value === '?'); i++) {
      await new Promise((r) => setTimeout(r, 400))
      try { version.value = await invoke('get_version') } catch {}
    }
  }
  await loadConfig()
  // 读取系统真实的开机自启动状态，同步到开关（避免触发反向写入）
  try {
    const enabled = await invoke('get_autostart')
    suppressAutoLaunchWrite = true
    autoLaunchOnBoot.value = !!enabled
    setTimeout(() => { suppressAutoLaunchWrite = false }, 0)
  } catch (e) { console.error('读取开机自启动状态失败:', e) }
  // 读取"启动时自动隐藏到托盘"设置，同步到开关（避免触发反向写入）
  try {
    const hidden = await invoke('get_start_hidden')
    suppressStartHiddenWrite = true
    startHiddenToTray.value = !!hidden
    setTimeout(() => { suppressStartHiddenWrite = false }, 0)
  } catch (e) { console.error('读取启动隐藏设置失败:', e) }
  await checkServiceStatus()
  startStatusCheck()
  setTimeout(checkUpdate, 1500)
  if (showSponsorOnStartup.value) {
    setTimeout(() => { showSponsorModal.value = true }, 800)
  }
  if (autoStartServices.value) {
    // 给状态检查 + 弹窗一点时间，再去自动启动
    setTimeout(() => {
      // 已经全部在跑就不再触发，避免提示"所有服务都已在运行"打扰用户
      if (!backendRunning.value || !frontendRunning.value) {
        startServices()
      }
    }, 1200)
  }
})

onUnmounted(() => {
  stopStatusCheck()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>


<style>
/* ============================================================
   WebRPA 启动器 v3 - 现代化彩色专业版
   非 scoped，确保所有样式无遮挡可控
   ============================================================ */
:root {
  --c-bg-base: #f4f6fb;
  --c-bg-deep: linear-gradient(140deg, #f7f8ff 0%, #f0f4fb 100%);
  --c-card: #ffffff;
  --c-border: #e5e8ef;
  --c-border-soft: #eef0f6;

  --c-text-1: #0b1426;
  --c-text-2: #2a3245;
  --c-text-3: #5b6478;
  --c-text-4: #8a93a6;
  --c-text-5: #b8bfd0;

  --c-blue-50:  #eff6ff;
  --c-blue-100: #dbeafe;
  --c-blue-200: #bfdbfe;
  --c-blue-500: #3b82f6;
  --c-blue-600: #2563eb;
  --c-blue-700: #1d4ed8;

  --c-purple-50:  #f5f3ff;
  --c-purple-100: #ede9fe;
  --c-purple-500: #8b5cf6;
  --c-purple-600: #7c3aed;
  --c-purple-700: #6d28d9;

  --c-green-50:  #ecfdf5;
  --c-green-100: #d1fae5;
  --c-green-500: #10b981;
  --c-green-600: #059669;
  --c-green-700: #047857;

  --c-orange-50: #fff7ed;
  --c-orange-500: #f97316;
  --c-orange-600: #ea580c;

  --c-pink-50:  #fdf2f8;
  --c-pink-100: #fce7f3;
  --c-pink-500: #ec4899;
  --c-pink-600: #db2777;
  --c-pink-700: #be185d;

  --c-red-50: #fef2f2;
  --c-red-500: #ef4444;
  --c-red-600: #dc2626;

  --c-yellow-50: #fefce8;
  --c-yellow-500: #eab308;

  --shadow-1: 0 1px 3px rgba(11, 20, 38, 0.06), 0 1px 2px rgba(11, 20, 38, 0.04);
  --shadow-2: 0 4px 14px rgba(11, 20, 38, 0.08), 0 1px 3px rgba(11, 20, 38, 0.04);
  --shadow-3: 0 10px 30px rgba(11, 20, 38, 0.12), 0 2px 6px rgba(11, 20, 38, 0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 13px;
  color: var(--c-text-2);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-root {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--c-bg-base);
  overflow: hidden;
  user-select: none;
}

/* ============================================================
   顶部品牌横幅
   ============================================================ */
.brand-bar {
  position: relative;
  height: 64px;
  flex-shrink: 0;
  overflow: hidden;
  z-index: 2;
}
.brand-bar-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 620px 220px at 18% 120%, rgba(59, 130, 246, 0.35), transparent 70%),
    linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%);
}
.brand-bar-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='white' stroke-opacity='0.05' stroke-width='1'%3E%3Cpath d='M0 30h60M30 0v60'/%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.brand-content {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px 0 20px;
  -webkit-app-region: drag;
}
.brand-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

/* WebRPA 艺术字 LOGO */
.brand-logo {
  display: inline-flex;
  align-items: baseline;
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.01em;
  font-style: italic;
  /* 斜体字母的右上角会突出 em-box，给一点右侧呼吸空间避免被切 */
  padding-right: 4px;
  overflow: visible;
}
.brand-letter {
  display: inline-block;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  /* 单独给斜体字母右侧留出尖角空间，否则 W → e → b 之间会有切角错觉 */
  padding-right: 1px;
}
.brand-letter-1, .brand-letter-2, .brand-letter-3 {
  background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.brand-pill {
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 10px 3px 9px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  overflow: visible;
}
.brand-pill .brand-letter {
  background: linear-gradient(135deg, #1d4ed8, #2563eb);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  text-shadow: none;
  font-size: 18px;
  /* pill 内的字母也给一点右 padding，否则 P 的尖角和 A 的右上角会顶到 pill 边 */
  padding-right: 2px;
}
.brand-pill .brand-letter:last-child {
  padding-right: 0;
}

.brand-meta {
  border-left: 1px solid rgba(255, 255, 255, 0.25);
  padding-left: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.brand-title {
  font-size: 13px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}
.brand-version {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
}
.version-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.25);
}
.version-sep { color: rgba(255, 255, 255, 0.4); }
.version-tag { font-weight: 400; }

.window-controls {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}
.win-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: background 150ms, transform 100ms;
}
.win-btn:hover { background: rgba(255, 255, 255, 0.22); }
.win-btn:active { transform: scale(0.95); }
.win-btn-close:hover { background: #dc2626; border-color: #b91c1c; }

/* ============================================================
   主体页面
   ============================================================ */
.page {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--c-bg-deep);
}
.page::-webkit-scrollbar { width: 8px; }
.page::-webkit-scrollbar-track { background: transparent; }
.page::-webkit-scrollbar-thumb {
  background: rgba(11, 20, 38, 0.15);
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.page::-webkit-scrollbar-thumb:hover { background: rgba(11, 20, 38, 0.25); background-clip: content-box; }

/* ============================================================
   状态条
   ============================================================ */
.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.status-strip-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
/* 英文模式：按钮文案更长，收紧字号/内边距并允许换行，避免被挤出屏幕点不到 */
html.lang-en .status-strip-right { gap: 5px; }
html.lang-en .chip-btn { padding: 6px 8px; font-size: 11.5px; }
html.lang-en .chip-btn svg { width: 13px; height: 13px; }
.status-strip-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

.big-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 10px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  box-shadow: var(--shadow-1);
  transition: border-color 200ms, box-shadow 200ms;
}
.big-status-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.big-status-text { display: flex; flex-direction: column; gap: 2px; line-height: 1.2; }
.big-status-title { font-size: 13.5px; font-weight: 700; color: var(--c-text-1); }
.big-status-sub { font-size: 11px; color: var(--c-text-4); }

.status-idle .big-status-icon { background: var(--c-blue-50); color: var(--c-blue-600); }
.status-warn { border-color: #fed7aa; }
.status-warn .big-status-icon { background: var(--c-orange-50); color: var(--c-orange-600); }
.status-success { border-color: var(--c-green-100); background: linear-gradient(135deg, #ffffff, var(--c-green-50)); }
.status-success .big-status-icon {
  background: linear-gradient(135deg, var(--c-green-500), var(--c-green-600));
  color: white;
  box-shadow: 0 3px 8px rgba(16, 185, 129, 0.3);
}
.status-success .big-status-title { color: var(--c-green-700); }

/* chip 按钮 */
.chip-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-2);
  cursor: pointer;
  transition: border-color 150ms, color 150ms, background 150ms, transform 100ms;
}
.chip-btn:hover:not(:disabled) {
  border-color: var(--c-blue-500);
  color: var(--c-blue-600);
  background: var(--c-blue-50);
}
.chip-btn:active:not(:disabled) { transform: translateY(1px); }
.chip-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.chip-btn svg { color: currentColor; }

.chip-btn-pink {
  background: linear-gradient(135deg, #ec4899, #db2777);
  color: white;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(219, 39, 119, 0.35);
}
.chip-btn-pink:hover:not(:disabled) {
  background: linear-gradient(135deg, #db2777, #be185d);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(219, 39, 119, 0.5);
  transform: translateY(-1px);
}

.rotating { animation: rotate-360 1s linear infinite; }
@keyframes rotate-360 { to { transform: rotate(360deg); } }


/* ============================================================
   更新通知
   ============================================================ */
.update-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 1px solid #fed7aa;
  border-radius: 10px;
  box-shadow: var(--shadow-1);
}
.update-banner-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.35);
}
.update-banner-text { flex: 1; min-width: 0; }
.update-banner-title { font-size: 13.5px; font-weight: 700; color: #7c2d12; line-height: 1.3; }
.update-banner-title strong { color: #c2410c; }
.update-banner-sub { font-size: 11.5px; color: #9a3412; margin-top: 2px; }
.update-banner-actions { display: flex; gap: 6px; flex-shrink: 0; }

.link-btn {
  background: transparent;
  border: none;
  color: var(--c-orange-600);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 120ms;
}
.link-btn:hover { background: rgba(234, 88, 12, 0.1); }

.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.4);
  transition: transform 120ms, box-shadow 120ms;
}
.cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(234, 88, 12, 0.5); }

/* ============================================================
   主控制卡
   ============================================================ */
.hero-card {
  position: relative;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: 14px;
  padding: 22px 24px;
  box-shadow: var(--shadow-2);
  overflow: hidden;
}
.hero-deco {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 60%);
  pointer-events: none;
}
.hero-deco::after {
  content: '';
  position: absolute;
  top: 100px;
  right: 100px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.1) 0%, transparent 60%);
}
.hero-row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.hero-info { flex: 1; min-width: 0; }
.hero-tag-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.hero-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  background: var(--c-blue-50);
  color: var(--c-blue-700);
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--c-blue-100);
}
.hero-tag-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c-blue-500);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  animation: hero-tag-pulse 2s ease-in-out infinite;
}
@keyframes hero-tag-pulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.05); }
}
.hero-tag-warm {
  background: var(--c-pink-50);
  color: var(--c-pink-700);
  border-color: var(--c-pink-100);
}
.hero-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--c-text-1);
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin-bottom: 6px;
}
.hero-highlight {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-left: 4px;
}
.hero-sub {
  font-size: 12.5px;
  color: var(--c-text-3);
  line-height: 1.5;
}

.hero-cta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* CTA 主按钮（启动） */
.cta-primary,
.cta-success {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 11px 22px;
  border: none;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 700;
  color: white;
  cursor: pointer;
  overflow: hidden;
  transition: transform 150ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 200ms;
  letter-spacing: 0.01em;
}
.cta-primary {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  box-shadow:
    0 4px 12px rgba(37, 99, 235, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.cta-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 8px 22px rgba(37, 99, 235, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.cta-primary:active:not(:disabled) { transform: translateY(0); }
.cta-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.cta-success {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  box-shadow:
    0 4px 12px rgba(16, 185, 129, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}
.cta-success:hover {
  transform: translateY(-2px);
  box-shadow:
    0 8px 22px rgba(16, 185, 129, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.cta-success:active { transform: translateY(0); }

.cta-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 50%);
  animation: cta-glow-rotate 4s linear infinite;
  pointer-events: none;
}
@keyframes cta-glow-rotate { to { transform: rotate(360deg); } }

.cta-stop {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 11px 14px;
  background: var(--c-card);
  color: var(--c-red-600);
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms, border-color 150ms, transform 100ms;
}
.cta-stop:hover:not(:disabled) {
  background: var(--c-red-50);
  border-color: var(--c-red-500);
}
.cta-stop:active:not(:disabled) { transform: translateY(1px); }
.cta-stop:disabled { opacity: 0.4; cursor: not-allowed; }

/* 小助手 Agent 按钮 */
.cta-agent {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 11px 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 150ms, transform 100ms;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28);
}
.cta-agent:hover { filter: brightness(1.06); }
.cta-agent:active { transform: translateY(1px); }

/* 语言切换分段控件（设置内） */
.lang-seg { display: inline-flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.lang-seg-btn { padding: 6px 12px; font-size: 12px; font-weight: 600; background: #fff; color: #6b7280; border: none; cursor: pointer; transition: background 150ms, color 150ms; }
.lang-seg-btn:hover { background: #f3f4f6; }
.lang-seg-btn.on { background: #2563eb; color: #fff; }

/* ============================================================
   服务卡片
   ============================================================ */
.service-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.service-card {
  position: relative;
  background: var(--c-card);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 200ms, box-shadow 200ms, transform 150ms;
}
.service-card:hover {
  border-color: var(--c-blue-200);
  box-shadow: var(--shadow-1);
  transform: translateY(-1px);
}
.service-card.active {
  background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%);
  border-color: var(--c-green-100);
}
.service-card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.service-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}
.service-icon-blue {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 3px 8px rgba(37, 99, 235, 0.3);
}
.service-icon-purple {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  box-shadow: 0 3px 8px rgba(2, 132, 199, 0.3);
}
.service-text { flex: 1; min-width: 0; }
.service-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--c-text-1);
  margin-bottom: 4px;
}
.service-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--c-text-4);
}
.service-state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-text-5);
  flex-shrink: 0;
}
.service-state-dot.on {
  background: var(--c-green-500);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
  animation: dot-pulse 1.6s ease-in-out infinite;
}
@keyframes dot-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2); }
  50% { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0.05); }
}
/* 启动中：琥珀色脉冲，提示服务正在启动 */
.service-state-dot.starting {
  background: var(--c-amber-500, #f59e0b);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  animation: dot-pulse-amber 1.1s ease-in-out infinite;
}
@keyframes dot-pulse-amber {
  0%, 100% { box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.25); }
  50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.05); }
}
.service-state-text { font-weight: 600; color: var(--c-text-3); }
.service-card.active .service-state-text { color: var(--c-green-700); }
.service-divider { color: var(--c-text-5); }
.service-port {
  font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace;
  font-size: 11px;
  color: var(--c-text-3);
}

.service-action {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  background: var(--c-bg-base);
  color: var(--c-text-3);
  border: 1px solid var(--c-border);
  border-radius: 6px;
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}
.service-action:hover {
  background: var(--c-blue-50);
  color: var(--c-blue-600);
  border-color: var(--c-blue-200);
}

.service-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--c-green-500), transparent);
  background-size: 200% 100%;
  animation: progress-flow 2.5s ease-in-out infinite;
}
@keyframes progress-flow {
  0% { background-position: -100% 0; }
  100% { background-position: 100% 0; }
}


/* ============================================================
   信息卡（隐私 / 端口 / 赞助）
   ============================================================ */
.info-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}
.info-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid;
  transition: transform 150ms, box-shadow 200ms;
}
.info-card:hover { transform: translateY(-1px); box-shadow: var(--shadow-1); }
.info-card-green {
  background: linear-gradient(135deg, #ffffff, var(--c-green-50));
  border-color: var(--c-green-100);
}
.info-card-blue {
  background: linear-gradient(135deg, #ffffff, var(--c-blue-50));
  border-color: var(--c-blue-100);
}
.info-card-pink {
  background: linear-gradient(135deg, #ffffff, var(--c-pink-50));
  border-color: var(--c-pink-100);
}
.info-icon-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;
}
.info-card-green .info-icon-wrap { background: linear-gradient(135deg, #10b981, #059669); }
.info-card-blue .info-icon-wrap { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.info-card-pink .info-icon-wrap { background: linear-gradient(135deg, #ec4899, #db2777); }
.info-content { flex: 1; min-width: 0; }
.info-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-text-1);
  margin-bottom: 2px;
}
.info-text {
  font-size: 11px;
  color: var(--c-text-3);
  line-height: 1.4;
}


/* ============================================================
   底部
   ============================================================ */
.footer-bar {
  margin-top: auto;
  padding: 6px 4px 2px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--c-text-4);
}
.footer-copyright { font-weight: 500; }
.footer-separator {
  width: 1px;
  height: 12px;
  background: var(--c-border);
  margin: 0 2px;
}
.footer-link {
  color: var(--c-text-3);
  cursor: pointer;
  transition: color 150ms;
}
.footer-link:hover { color: var(--c-blue-600); }
.footer-dot { color: var(--c-text-5); }
.footer-heart {
  color: var(--c-pink-600);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
}
.footer-heart:hover { color: var(--c-pink-700); }
.footer-bilibili {
  display: inline-flex;
  align-items: center;
}
.footer-bilibili:hover { color: #fb7299; }
.footer-qq {
  display: inline-flex;
  align-items: center;
}
.footer-qq:hover { color: #12b7f5; }

/* QQ 入群答案浮窗（悬停 QQ 群号显示，点击复制） */
.qq-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.qq-answer-tip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, #12b7f5 0%, #2086e8 50%, #1a4fc4 100%);
  color: #fff;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  box-shadow:
    0 4px 14px rgba(18, 183, 245, 0.32),
    0 8px 24px rgba(26, 79, 196, 0.18),
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 -1px 0 rgba(26, 79, 196, 0.4) inset;
  z-index: 50;
  user-select: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.qq-answer-tip:hover {
  transform: translateX(-50%) translateY(-1px);
  box-shadow:
    0 6px 18px rgba(18, 183, 245, 0.42),
    0 10px 28px rgba(26, 79, 196, 0.24),
    0 1px 0 rgba(255, 255, 255, 0.22) inset,
    0 -1px 0 rgba(26, 79, 196, 0.45) inset;
}
.qq-answer-tip:active {
  transform: translateX(-50%) translateY(0);
}
.qq-answer-tip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #1a4fc4;
}
.qq-answer-label {
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  font-size: 10px;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 0 rgba(26, 79, 196, 0.18);
}
.qq-answer-value {
  font-weight: 600;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 1px rgba(26, 79, 196, 0.28);
}
.qq-answer-copy-icon {
  opacity: 0.75;
}
.qq-answer-tip:hover .qq-answer-copy-icon {
  opacity: 1;
}

/* 浮现/消失动画 */
.qq-answer-enter-active,
.qq-answer-leave-active {
  transition: opacity 150ms ease, transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.qq-answer-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(4px) scale(0.96);
}
.qq-answer-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(2px) scale(0.98);
}

/* ============================================================
   弹窗（mask 必须不透明）
   ============================================================ */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(11, 20, 38, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-shell {
  background: white;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 25px 60px rgba(11, 20, 38, 0.35),
    0 8px 20px rgba(11, 20, 38, 0.2);
}
.modal-shell-config { max-width: 480px; }


/* 弹窗顶部 banner */
.modal-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px;
  overflow: hidden;
}
.sponsor-banner {
  background:
    radial-gradient(ellipse 400px 200px at 0% 100%, rgba(245, 158, 11, 0.4), transparent 60%),
    radial-gradient(ellipse 400px 200px at 100% 0%, rgba(236, 72, 153, 0.5), transparent 60%),
    linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%);
}
.config-banner {
  background:
    radial-gradient(ellipse 400px 200px at 100% 100%, rgba(59, 130, 246, 0.4), transparent 60%),
    linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%);
}
.modal-banner-pattern {
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill='none' stroke='white' stroke-opacity='0.08' stroke-width='1'%3E%3Cpath d='M0 20h40M20 0v40'/%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.modal-banner-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}
.modal-banner-icon {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
.modal-banner-text { color: white; }
.modal-banner-title {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.modal-banner-sub {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
}
.modal-close {
  position: relative;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 7px;
  color: white;
  cursor: pointer;
  transition: background 150ms, transform 100ms;
}
.modal-close:hover { background: rgba(255, 255, 255, 0.28); }
.modal-close:active { transform: scale(0.95); }

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px 20px;
}
.modal-body::-webkit-scrollbar { width: 6px; }
.modal-body::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 3px; }


.chip-btn-amber {
  border-color: var(--c-blue-200, #bfdbfe);
  background: var(--c-blue-50);
  color: var(--c-blue-700);
}
.chip-btn-amber:hover:not(:disabled) {
  border-color: var(--c-blue-500);
  background: var(--c-blue-100, #dbeafe);
  color: var(--c-blue-700);
}

/* 右下角浮动「外包开发」入口（蓝色主题，与启动器一致） */
.hire-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 15px;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, var(--c-blue-500, #3b82f6), var(--c-blue-600, #2563eb));
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
  transition: transform 0.18s cubic-bezier(0.25,1,0.5,1), box-shadow 0.18s ease, filter 0.18s ease;
}
.hire-fab svg { stroke: #fff; }
.hire-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(37, 99, 235, 0.45);
  filter: brightness(1.04);
}
.hire-fab:active { transform: translateY(0) scale(0.97); }
/* 主题化悬停提示：单行不换行、贴按钮右缘向上展开，绝不越出屏幕或一字一行 */
.hire-fab::after {
  content: attr(data-tip);
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  white-space: nowrap;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.2px;
  color: #fff;
  background: linear-gradient(135deg, #12b7f5 0%, #2086e8 50%, #1a4fc4 100%);
  padding: 5px 9px;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(18,183,245,0.32), 0 8px 24px rgba(26,79,196,0.18);
  opacity: 0;
  transform: translateY(4px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.14s ease, transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
.hire-fab:hover::after {
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* ============================================================
   接单广告弹窗（蓝色主题，与启动器整体一致）
   ============================================================ */
.hire-banner {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 55%, #1d4ed8 100%);
}
.hire-intro {
  font-size: 12.5px;
  color: var(--c-text-2);
  margin: 0 0 14px;
  line-height: 1.6;
}
.hire-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.hire-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 13px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-card);
  transition: transform 150ms, box-shadow 200ms, border-color 150ms;
}
.hire-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.1);
  border-color: var(--c-blue-300, #93c5fd);
}
.hire-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
}
.hire-ic-green { background: #e7f8ee; color: #07c160; }
.hire-ic-blue { background: var(--c-blue-50); color: var(--c-blue-600); }
.hire-ic-indigo { background: #eef2ff; color: #4f46e5; }
.hire-ic-cyan { background: #e0f7fa; color: #0891b2; }
.hire-item-text { min-width: 0; }
.hire-item-title { font-size: 12.5px; font-weight: 700; color: var(--c-text-1); }
.hire-item-sub { font-size: 11px; color: var(--c-text-3); margin-top: 2px; }
.hire-contact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.hire-contact-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--c-bg-base);
  border: 1px solid var(--c-border);
  cursor: pointer;
  transition: transform 120ms, box-shadow 160ms, border-color 160ms;
}
.hire-contact-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
  border-color: var(--c-blue-300, #93c5fd);
}
.hire-contact-ic {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  flex-shrink: 0;
  color: #fff;
}
.hire-contact-ic-wechat { background: #07c160; }
.hire-contact-ic-qq { background: #12b7f5; }
.hire-contact-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--c-text-2);
  width: 34px;
  flex-shrink: 0;
}
.hire-contact-value {
  flex: 1;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text-1);
  font-family: ui-monospace, monospace;
  letter-spacing: 0.5px;
}
.hire-copy-btn {
  padding: 5px 16px;
  border-radius: 7px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 120ms, transform 100ms;
}
.hire-copy-btn:hover { filter: brightness(1.08); }
.hire-copy-btn:active { transform: scale(0.96); }

/* ============================================================
   赞助弹窗内容
   ============================================================ */
.sponsor-msg {
  font-size: 13px;
  color: var(--c-text-2);
  line-height: 1.7;
  margin-bottom: 16px;
}
.sponsor-msg p { margin-bottom: 8px; }
.sponsor-msg strong { color: var(--c-text-1); font-weight: 700; }
.emoji { font-family: 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif; }

.sponsor-highlight {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 10px 12px 10px 14px;
  margin: 12px 0;
  background: linear-gradient(135deg, var(--c-pink-50), #fff1f2);
  border-radius: 8px;
  font-size: 12.5px;
  color: #9f1239;
  font-weight: 500;
  line-height: 1.6;
}
.sponsor-highlight-bar {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: linear-gradient(180deg, #ec4899, #db2777);
  border-radius: 2px;
}

/* ============================================================
   关闭赞助提示挽留弹窗
   ============================================================ */
.modal-shell-narrow { max-width: 440px; }
.farewell-banner {
  background:
    radial-gradient(ellipse 380px 200px at 0% 100%, rgba(245, 158, 11, 0.42), transparent 60%),
    radial-gradient(ellipse 380px 200px at 100% 0%, rgba(236, 72, 153, 0.5), transparent 60%),
    linear-gradient(135deg, #f97316 0%, #ec4899 55%, #be185d 100%);
}
.farewell-msg {
  font-size: 13px;
  color: var(--c-text-2);
  line-height: 1.75;
  margin-bottom: 18px;
}
.farewell-msg p { margin-bottom: 9px; }
.farewell-msg strong { color: var(--c-text-1); font-weight: 700; }
.farewell-highlight {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 11px 13px 11px 15px;
  margin: 12px 0;
  background: linear-gradient(135deg, var(--c-pink-50, #fdf2f8), #fff1f2);
  border-radius: 8px;
  font-size: 12.5px;
  color: #9f1239;
  font-weight: 500;
  line-height: 1.65;
}
.farewell-highlight-bar {
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  background: linear-gradient(180deg, #f59e0b, #db2777);
  border-radius: 2px;
}
.farewell-beg {
  font-size: 13px;
  font-weight: 600;
  color: #be185d;
  margin-top: 10px;
}
.farewell-actions {
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.farewell-btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 120ms, transform 100ms, background 120ms, border-color 120ms;
}
.farewell-btn-primary {
  border: none;
  color: #fff;
  background: linear-gradient(135deg, #f97316, #db2777);
  box-shadow: 0 6px 16px rgba(219, 39, 119, 0.32);
}
.farewell-btn-primary:hover { filter: brightness(1.06); }
.farewell-btn-primary:active { transform: scale(0.98); }
.farewell-btn-keep {
  border: 1px solid var(--c-border, #e2e8f0);
  background: #fff;
  color: var(--c-text-1, #1e293b);
}
.farewell-btn-keep:hover { background: #f8fafc; border-color: #cbd5e1; }
.farewell-btn-ghost {
  border: none;
  background: transparent;
  color: var(--c-text-3, #94a3b8);
  font-weight: 500;
  font-size: 12px;
  padding: 6px;
}
.farewell-btn-ghost:hover { color: var(--c-text-2, #64748b); text-decoration: underline; }
.sponsor-thanks {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11.5px;
  color: var(--c-text-3);
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--c-border);
  line-height: 1.6;
}
.sponsor-thanks svg {
  color: var(--c-pink-500);
  flex-shrink: 0;
  margin-top: 2px;
}

.qr-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 12px;
}
.qr-card {
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.qr-card-wechat {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
}
.qr-card-alipay {
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  border: 1px solid #bfdbfe;
}
.qr-frame {
  border-radius: 12px;
  padding: 0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  overflow: hidden;
}
.qr-frame img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain;
  border-radius: 8px;
}
.qr-foot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
}
.qr-card-wechat .qr-foot { color: #07c160; }
.qr-card-alipay .qr-foot { color: #1677ff; }

.sponsor-note {
  background: var(--c-bg-base);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 11.5px;
}
.note-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.note-tag {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 18px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  color: var(--c-text-3);
}
.note-line span:last-child { color: var(--c-text-3); line-height: 1.5; }

/* 二维码可点击放大 */
.qr-card { cursor: zoom-in; transition: transform 180ms ease, box-shadow 180ms ease; }
.qr-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px -6px rgba(15, 23, 42, 0.15);
}

/* 爱发电入口按钮 */
.ifdian-btn {
  -webkit-app-region: no-drag;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 12px 0;
  background: linear-gradient(135deg, #ff7878, #ff4d4d);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: filter 160ms ease, transform 160ms ease;
  box-shadow: 0 2px 8px rgba(255, 77, 77, 0.25);
}
.ifdian-btn:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(255, 77, 77, 0.35);
}
.ifdian-btn:active { transform: translateY(0); }

/* 二维码放大遮罩 */
.qr-zoom-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  cursor: zoom-out;
  -webkit-app-region: no-drag;
  backdrop-filter: blur(6px);
}
.qr-zoom-img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 14px;
  background: white;
  padding: 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  cursor: default;
}
.qr-zoom-close {
  position: absolute;
  top: 18px;
  right: 18px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 160ms ease;
  -webkit-app-region: no-drag;
}
.qr-zoom-close:hover { background: rgba(255, 255, 255, 0.3); }


/* ============================================================
   设置弹窗
   ============================================================ */
.cfg-block {
  background: var(--c-bg-base);
  border: 1px solid var(--c-border);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 10px;
}
.cfg-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--c-border);
}
.cfg-block-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}
.cfg-block-icon-blue { background: linear-gradient(135deg, #3b82f6, #2563eb); }
.cfg-block-icon-purple { background: linear-gradient(135deg, #0ea5e9, #0284c7); }
.cfg-block-icon-pink { background: linear-gradient(135deg, #ec4899, #db2777); }
.cfg-block-icon-indigo { background: linear-gradient(135deg, #2563eb, #1d4ed8); }

/* 偏好开关行：左文本块 + 右开关 */
.cfg-row-toggle {
  align-items: center;
  gap: 16px;
  padding: 6px 0;
}
.cfg-row-toggle:not(:last-child) {
  border-bottom: 1px dashed var(--c-border);
  margin-bottom: 6px;
  padding-bottom: 10px;
}
.cfg-toggle-text {
  flex: 1;
  min-width: 0;
}
.cfg-toggle-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text-1);
  margin-bottom: 3px;
}
.cfg-toggle-sub {
  font-size: 11.5px;
  color: var(--c-text-3);
  line-height: 1.5;
}
.cfg-switch,
.cfg-row .cfg-switch,
.cfg-row label.cfg-switch {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 0;
  width: 36px;
  min-width: 36px;
  max-width: 36px;
  height: 20px;
  cursor: pointer;
  margin: 0;
  padding: 0;
  /* 覆盖 .cfg-row label 的 64px 默认宽度 */
}
.cfg-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.cfg-switch-track {
  position: absolute;
  inset: 0;
  background: var(--c-border);
  border-radius: 10px;
  transition: background 180ms ease;
}
.cfg-switch.on .cfg-switch-track {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
}
.cfg-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  transition: transform 180ms cubic-bezier(0.34, 1.4, 0.64, 1);
}
.cfg-switch.on .cfg-switch-thumb {
  transform: translateX(16px);
}
.cfg-block-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--c-text-1);
}
.cfg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.cfg-row:last-child { margin-bottom: 0; }
.cfg-row label {
  flex-shrink: 0;
  width: 64px;
  font-size: 12px;
  font-weight: 500;
  color: var(--c-text-3);
}
.cfg-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--c-text-1);
  font-family: inherit;
  transition: border-color 150ms, box-shadow 150ms;
}
.cfg-input:focus {
  outline: none;
  border-color: var(--c-blue-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* 自定义 select 下拉框样式 */
select.cfg-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  padding-right: 32px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  background-size: 12px;
  cursor: pointer;
}
select.cfg-input:hover {
  border-color: var(--c-blue-300, #93c5fd);
  background-color: var(--c-blue-50, #eff6ff);
}
select.cfg-input option {
  padding: 8px 12px;
  font-size: 12.5px;
  background: white;
  color: var(--c-text-1);
}

/* 自定义下拉组件 */
.custom-select {
  position: relative;
  flex: 1;
  height: 32px;
  padding: 0 32px 0 10px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--c-text-1);
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: border-color 150ms, box-shadow 150ms, background-color 150ms;
  user-select: none;
  outline: none;
}
.custom-select:hover {
  border-color: var(--c-blue-300, #93c5fd);
  background-color: #fafbff;
}
.custom-select:focus,
.custom-select.open {
  border-color: var(--c-blue-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.custom-select-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.custom-select-arrow {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  transition: transform 200ms ease;
}
.custom-select.open .custom-select-arrow {
  transform: translateY(-50%) rotate(180deg);
}
.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: -1px;
  right: -1px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
  z-index: 100;
  overflow: hidden;
  animation: dropdownIn 150ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes dropdownIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.custom-select-option {
  padding: 8px 12px;
  font-size: 12.5px;
  color: var(--c-text-1);
  cursor: pointer;
  transition: background-color 100ms, color 100ms;
}
.custom-select-option:hover {
  background: var(--c-blue-50, #eff6ff);
  color: var(--c-blue-700, #1d4ed8);
}
.custom-select-option.active {
  background: var(--c-blue-50, #eff6ff);
  color: var(--c-blue-600, #2563eb);
  font-weight: 500;
}

.cfg-tips {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 12px;
  background: var(--c-blue-50);
  border: 1px solid var(--c-blue-100);
  border-radius: 7px;
  font-size: 11.5px;
  color: var(--c-blue-700);
  margin-top: 4px;
}
.cfg-tips svg { color: var(--c-blue-600); flex-shrink: 0; }

.cfg-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}
.autosave-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--c-text-3);
}
.autosave-status svg { color: var(--c-blue-600); flex-shrink: 0; }
.autosave-invalid { color: #e11d48; }

/* 弹窗按钮 */
.btn-ghost {
  padding: 8px 16px;
  background: white;
  color: var(--c-text-3);
  border: 1px solid var(--c-border);
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}
.btn-ghost:hover {
  background: var(--c-bg-base);
  border-color: var(--c-text-5);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: white;
  border: none;
  border-radius: 7px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
  transition: transform 120ms, box-shadow 200ms;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.5);
}
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }


/* ============================================================
   Toast
   ============================================================ */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: white;
  border: 1px solid var(--c-border);
  border-radius: 9px;
  box-shadow: var(--shadow-3);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--c-text-2);
  z-index: 2000;
  pointer-events: none;
  max-width: 80%;
}
.toast-icon { display: flex; flex-shrink: 0; }
.toast-msg { line-height: 1.4; }
.toast-success {
  background: linear-gradient(135deg, #ffffff, var(--c-green-50));
  border-color: var(--c-green-100);
  color: var(--c-green-700);
}
.toast-success .toast-icon { color: var(--c-green-500); }
.toast-error {
  background: linear-gradient(135deg, #ffffff, var(--c-red-50));
  border-color: #fecaca;
  color: var(--c-red-600);
}
.toast-error .toast-icon { color: var(--c-red-500); }
.toast-info {
  background: linear-gradient(135deg, #ffffff, var(--c-blue-50));
  border-color: var(--c-blue-100);
  color: var(--c-blue-700);
}
.toast-info .toast-icon { color: var(--c-blue-500); }

/* ============================================================
   关闭中遮罩
   ============================================================ */
.closing-mask {
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, rgba(11, 20, 38, 0.85), rgba(29, 78, 216, 0.78));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}
.closing-card {
  position: relative;
  width: 100%;
  max-width: 360px;
  padding: 28px 28px 20px;
  background: white;
  border-radius: 14px;
  box-shadow:
    0 25px 60px rgba(11, 20, 38, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  overflow: hidden;
}

/* 三圈旋转 spinner */
.closing-spinner {
  position: relative;
  width: 56px;
  height: 56px;
  margin-bottom: 16px;
}
.closing-spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--c-blue-500);
  animation: closing-spin 1.1s cubic-bezier(0.5, 0.15, 0.5, 0.85) infinite;
}
.closing-spinner-ring:nth-child(2) {
  inset: 8px;
  border-top-color: var(--c-purple-500);
  animation-duration: 1.5s;
  animation-direction: reverse;
}
.closing-spinner-ring:nth-child(3) {
  inset: 16px;
  border-top-color: var(--c-pink-500);
  animation-duration: 0.9s;
}
@keyframes closing-spin {
  to { transform: rotate(360deg); }
}

.closing-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--c-text-1);
  letter-spacing: -0.01em;
  margin-bottom: 4px;
}
.closing-sub {
  font-size: 12px;
  color: var(--c-text-3);
  line-height: 1.5;
  margin-bottom: 16px;
}

.closing-progress {
  width: 100%;
  height: 3px;
  background: var(--c-bg-base);
  border-radius: 2px;
  overflow: hidden;
}
.closing-progress-bar {
  display: block;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, var(--c-blue-500), var(--c-purple-500), transparent);
  background-size: 200% 100%;
  animation: closing-progress-flow 1.4s ease-in-out infinite;
}
@keyframes closing-progress-flow {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}

/* 过渡 */
.closing-enter-active,
.closing-leave-active { transition: opacity 220ms ease; }
.closing-enter-active .closing-card,
.closing-leave-active .closing-card {
  transition: transform 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms;
}
.closing-enter-from,
.closing-leave-to { opacity: 0; }
.closing-enter-from .closing-card,
.closing-leave-to .closing-card {
  opacity: 0;
  transform: scale(0.92) translateY(8px);
}

/* ============================================================
   过渡动画
   ============================================================ */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 220ms, transform 220ms cubic-bezier(0.25, 1, 0.5, 1);
}
.fade-slide-enter-from,
.fade-slide-leave-to { opacity: 0; transform: translateY(-8px); }

.modal-enter-active,
.modal-leave-active { transition: opacity 200ms ease; }
.modal-enter-active .modal-shell,
.modal-leave-active .modal-shell {
  transition: transform 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms;
}
.modal-enter-from,
.modal-leave-to { opacity: 0; }
.modal-enter-from .modal-shell,
.modal-leave-to .modal-shell {
  transform: scale(0.94) translateY(8px);
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: transform 240ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-16px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}
</style>
