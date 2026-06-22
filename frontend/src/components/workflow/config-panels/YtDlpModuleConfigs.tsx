import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'

/**
 * yt-dlp 公共网络/认证配置块
 * 适用于所有 yt-dlp 系列模块
 */
function YtDlpCommonNetworkSection({
  data,
  onChange,
}: {
  data: NodeData
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <div className="pt-3 border-t">
      <h3 className="text-sm font-medium mb-3">网络与认证（可选）</h3>

      <div className="space-y-2">
        <Label htmlFor="proxy">代理</Label>
        <VariableInput
          value={(data.proxy as string) || ''}
          onChange={(v) => onChange('proxy', v)}
          placeholder="例如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080"
        />
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Checkbox
          id="noProxy"
          checked={(data.noProxy as boolean) ?? false}
          onCheckedChange={(c) => onChange('noProxy', c)}
        />
        <Label htmlFor="noProxy" className="text-sm cursor-pointer">强制不使用任何代理</Label>
      </div>

      <div className="space-y-2 mt-2">
        <Label htmlFor="userAgent">User-Agent</Label>
        <VariableInput
          value={(data.userAgent as string) || ''}
          onChange={(v) => onChange('userAgent', v)}
          placeholder="留空使用默认"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="referer">Referer</Label>
        <VariableInput
          value={(data.referer as string) || ''}
          onChange={(v) => onChange('referer', v)}
          placeholder="某些站点需要 Referer 防盗链（可选）"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customHeaders">自定义请求头</Label>
        <VariableInput
          value={(data.customHeaders as string) || ''}
          onChange={(v) => onChange('customHeaders', v)}
          placeholder="Authorization: Bearer xxx|X-Custom: 1"
        />
        <p className="text-xs text-muted-foreground">每行一条 Key: Value，用 | 或换行分隔</p>
      </div>

      <div className="space-y-2 mt-2">
        <Label htmlFor="cookiesFile">cookies 文件路径</Label>
        <PathInput
          value={(data.cookiesFile as string) || ''}
          onChange={(v) => onChange('cookiesFile', v)}
          placeholder="Netscape cookies.txt 文件路径（可选）"
          type="file"
          title="选择 cookies.txt"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cookiesFromBrowser">从浏览器读取 cookies</Label>
        <Select
          id="cookiesFromBrowser"
          value={(data.cookiesFromBrowser as string) || ''}
          onChange={(e) => onChange('cookiesFromBrowser', e.target.value)}
        >
          <option value="">不使用</option>
          <option value="chrome">Chrome</option>
          <option value="edge">Edge</option>
          <option value="firefox">Firefox</option>
          <option value="brave">Brave</option>
          <option value="opera">Opera</option>
          <option value="vivaldi">Vivaldi</option>
          <option value="safari">Safari</option>
          <option value="chromium">Chromium</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          需要登录后才能下载的视频可启用。从对应浏览器自动读取登录态
        </p>
      </div>

      <div className="space-y-2 mt-2">
        <Label htmlFor="rateLimit">下载限速</Label>
        <VariableInput
          value={(data.rateLimit as string) || ''}
          onChange={(v) => onChange('rateLimit', v)}
          placeholder="例如 5M、500K（可选）"
        />
      </div>

      <div className="space-y-2 mt-2">
        <Label htmlFor="retries">失败重试次数</Label>
        <NumberInput
          id="retries"
          value={(data.retries as number) ?? 5}
          onChange={(v) => onChange('retries', v)}
          defaultValue={5}
          min={0}
          max={20}
        />
      </div>
    </div>
  )
}

/**
 * 模块 1：在线视频下载
 */
export function YtDlpDownloadConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">视频链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://www.youtube.com/watch?v=... 支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          支持 YouTube、B站、TikTok、Twitter、Twitch、微博、抖音 等 1000+ 站点
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputPath">输出目录</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则保存到下载文件夹"
          type="folder"
          title="选择输出目录"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputFilename">输出文件名模板</Label>
        <VariableInput
          value={(data.outputFilename as string) || ''}
          onChange={(v) => onChange('outputFilename', v)}
          placeholder="留空使用 %(title)s.%(ext)s"
        />
        <p className="text-xs text-muted-foreground">
          支持 yt-dlp 模板变量：%(title)s 标题、%(uploader)s 作者、%(id)s ID、%(upload_date)s 日期。简单文件名也可
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quality">画质</Label>
        <Select
          id="quality"
          value={(data.quality as string) || 'best'}
          onChange={(e) => onChange('quality', e.target.value)}
        >
          <option value="best">最佳画质（自动）</option>
          <option value="4k">4K (2160p)</option>
          <option value="2k">2K (1440p)</option>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="480p">480p</option>
          <option value="360p">360p</option>
          <option value="worst">最低画质</option>
          <option value="audio_only">仅音频</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="container">输出容器</Label>
        <Select
          id="container"
          value={(data.container as string) || ''}
          onChange={(e) => onChange('container', e.target.value)}
        >
          <option value="">自动（保留原格式）</option>
          <option value="mp4">MP4</option>
          <option value="mkv">MKV</option>
          <option value="webm">WebM</option>
        </Select>
        <p className="text-xs text-muted-foreground">指定后会用 ffmpeg 合并/转封装</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeRange">时间区间裁剪（可选）</Label>
        <VariableInput
          value={(data.timeRange as string) || ''}
          onChange={(v) => onChange('timeRange', v)}
          placeholder="例如 *00:00:30-00:02:00（只下载 30 秒到 2 分钟之间）"
        />
        <p className="text-xs text-muted-foreground">使用 yt-dlp --download-sections 语法</p>
      </div>

      <div className="pt-3 border-t">
        <h3 className="text-sm font-medium mb-3">高级选项</h3>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="embedThumbnail"
            checked={(data.embedThumbnail as boolean) ?? false}
            onCheckedChange={(c) => onChange('embedThumbnail', c)}
          />
          <Label htmlFor="embedThumbnail" className="text-sm cursor-pointer">嵌入封面缩略图</Label>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="writeThumbnail"
            checked={(data.writeThumbnail as boolean) ?? false}
            onCheckedChange={(c) => onChange('writeThumbnail', c)}
          />
          <Label htmlFor="writeThumbnail" className="text-sm cursor-pointer">单独保存封面图</Label>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="embedChapters"
            checked={(data.embedChapters as boolean) ?? false}
            onCheckedChange={(c) => onChange('embedChapters', c)}
          />
          <Label htmlFor="embedChapters" className="text-sm cursor-pointer">嵌入章节信息</Label>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Checkbox
            id="writeInfoJson"
            checked={(data.writeInfoJson as boolean) ?? false}
            onCheckedChange={(c) => onChange('writeInfoJson', c)}
          />
          <Label htmlFor="writeInfoJson" className="text-sm cursor-pointer">同时输出 .info.json 元数据</Label>
        </div>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 1800}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={1800}
          min={60}
          max={36000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存文件路径的变量名（可选）"
          isStorageVariable
        />
      </div>

      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>提示：</strong><br />
          • 需要把 yt-dlp.exe 放在 backend 目录下<br />
          • B站 / YouTube 需要会员或登录时，启用"从浏览器读取 cookies"<br />
          • 如果输出 mp4 / mkv 需要合并，确保 backend 目录下也有 ffmpeg.exe
        </p>
      </div>
    </>
  )
}


/**
 * 模块 2：在线音频下载（提取音频）
 */
export function YtDlpDownloadAudioConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">视频链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputPath">输出目录</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则保存到下载文件夹"
          type="folder"
          title="选择输出目录"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputFilename">输出文件名模板</Label>
        <VariableInput
          value={(data.outputFilename as string) || ''}
          onChange={(v) => onChange('outputFilename', v)}
          placeholder="留空使用 %(title)s.%(ext)s"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="audioFormat">音频格式</Label>
        <Select
          id="audioFormat"
          value={(data.audioFormat as string) || 'mp3'}
          onChange={(e) => onChange('audioFormat', e.target.value)}
        >
          <option value="mp3">MP3</option>
          <option value="m4a">M4A（无损转封装）</option>
          <option value="aac">AAC</option>
          <option value="opus">Opus</option>
          <option value="vorbis">Vorbis (OGG)</option>
          <option value="wav">WAV</option>
          <option value="flac">FLAC（无损）</option>
          <option value="best">保留源音频（不重新编码）</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="audioQuality">音质等级</Label>
        <Select
          id="audioQuality"
          value={(data.audioQuality as string) || '0'}
          onChange={(e) => onChange('audioQuality', e.target.value)}
        >
          <option value="0">最高（VBR 0）</option>
          <option value="2">极高（VBR 2）</option>
          <option value="5">中等（VBR 5）</option>
          <option value="9">最低（VBR 9）</option>
          <option value="320K">CBR 320K</option>
          <option value="256K">CBR 256K</option>
          <option value="192K">CBR 192K</option>
          <option value="128K">CBR 128K</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timeRange">时间区间裁剪（可选）</Label>
        <VariableInput
          value={(data.timeRange as string) || ''}
          onChange={(v) => onChange('timeRange', v)}
          placeholder="例如 *00:00:30-00:02:00"
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Checkbox
          id="embedThumbnail"
          checked={(data.embedThumbnail as boolean) ?? false}
          onCheckedChange={(c) => onChange('embedThumbnail', c)}
        />
        <Label htmlFor="embedThumbnail" className="text-sm cursor-pointer">嵌入封面到音频</Label>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <Checkbox
          id="embedMetadata"
          checked={(data.embedMetadata as boolean) ?? true}
          onCheckedChange={(c) => onChange('embedMetadata', c)}
        />
        <Label htmlFor="embedMetadata" className="text-sm cursor-pointer">嵌入标题/作者元数据</Label>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 1800}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={1800}
          min={60}
          max={36000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存文件路径的变量名（可选）"
          isStorageVariable
        />
      </div>
    </>
  )
}

/**
 * 模块 3：视频信息查询
 */
export function YtDlpGetInfoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">视频链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p className="text-xs text-muted-foreground">
          只查询信息，不会下载视频本体
        </p>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 120}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={120}
          min={10}
          max={600}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'video_info'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存信息对象的变量名"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          返回字段：title 标题、uploader 作者、duration 时长、thumbnail 封面、view_count 播放量、upload_date 发布日期、description 简介、tags 标签 等
        </p>
      </div>
    </>
  )
}

/**
 * 模块 4：可用格式列表
 */
export function YtDlpListFormatsConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">视频链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <p className="text-xs text-muted-foreground">
          列出该视频所有可下载的清晰度/编码组合，便于决定 quality
        </p>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 120}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={120}
          min={10}
          max={600}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'available_formats'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存格式数组的变量名"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          每条记录包含 format_id / ext / resolution / fps / vcodec / acodec / tbr / filesize
        </p>
      </div>
    </>
  )
}


/**
 * 模块 5：在线字幕下载
 */
export function YtDlpDownloadSubtitleConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">视频链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputPath">输出目录</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则保存到下载文件夹"
          type="folder"
          title="选择输出目录"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputFilename">文件名模板</Label>
        <VariableInput
          value={(data.outputFilename as string) || ''}
          onChange={(v) => onChange('outputFilename', v)}
          placeholder="留空使用 %(title)s.%(ext)s"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitleLang">字幕语言</Label>
        <VariableInput
          value={(data.subtitleLang as string) || ''}
          onChange={(v) => onChange('subtitleLang', v)}
          placeholder="例如 zh-Hans,zh-CN,en（留空则下载全部）"
        />
        <p className="text-xs text-muted-foreground">
          多个语言用逗号分隔。常见：zh-Hans/zh-CN（简中）、zh-Hant（繁中）、en（英）、ja（日）、ko（韩）
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subtitleFormat">字幕格式</Label>
        <Select
          id="subtitleFormat"
          value={(data.subtitleFormat as string) || 'srt'}
          onChange={(e) => onChange('subtitleFormat', e.target.value)}
        >
          <option value="srt">SRT（推荐，通用）</option>
          <option value="vtt">VTT（WebVTT）</option>
          <option value="ass">ASS（高级特效）</option>
          <option value="lrc">LRC（歌词同步）</option>
          <option value="best">站点最佳格式</option>
        </Select>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Checkbox
          id="autoSubtitle"
          checked={(data.autoSubtitle as boolean) ?? true}
          onCheckedChange={(c) => onChange('autoSubtitle', c)}
        />
        <Label htmlFor="autoSubtitle" className="text-sm cursor-pointer">同时尝试下载自动生成字幕</Label>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 600}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={600}
          min={30}
          max={3600}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存字幕文件路径数组的变量名（可选）"
          isStorageVariable
        />
      </div>
    </>
  )
}

/**
 * 模块 6：批量下载播放列表 / 频道
 */
export function YtDlpDownloadPlaylistConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="url">播放列表 / 频道链接</Label>
        <VariableInput
          value={(data.url as string) || ''}
          onChange={(v) => onChange('url', v)}
          placeholder="例如 https://www.youtube.com/playlist?list=..."
        />
        <p className="text-xs text-muted-foreground">
          支持播放列表、频道、合集、搜索结果等
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputPath">输出目录</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则保存到下载文件夹"
          type="folder"
          title="选择输出目录"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="outputFilename">文件名模板</Label>
        <VariableInput
          value={(data.outputFilename as string) || ''}
          onChange={(v) => onChange('outputFilename', v)}
          placeholder="留空使用 %(playlist_title)s/%(playlist_index)s - %(title)s.%(ext)s"
        />
        <p className="text-xs text-muted-foreground">
          默认按"列表名/序号 - 标题"组织文件夹结构
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="playlistItems">下载条目（可选）</Label>
        <VariableInput
          value={(data.playlistItems as string) || ''}
          onChange={(v) => onChange('playlistItems', v)}
          placeholder="例如 1-5,7,9（留空下载全部）"
        />
        <p className="text-xs text-muted-foreground">
          支持区间、单点、组合写法。yt-dlp --playlist-items 语法
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maxItems">最多下载数量</Label>
        <NumberInput
          id="maxItems"
          value={(data.maxItems as number) ?? 0}
          onChange={(v) => onChange('maxItems', v)}
          defaultValue={0}
          min={0}
          max={9999}
        />
        <p className="text-xs text-muted-foreground">0 = 不限制</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="quality">画质</Label>
        <Select
          id="quality"
          value={(data.quality as string) || 'best'}
          onChange={(e) => onChange('quality', e.target.value)}
        >
          <option value="best">最佳画质（自动）</option>
          <option value="4k">4K (2160p)</option>
          <option value="2k">2K (1440p)</option>
          <option value="1080p">1080p</option>
          <option value="720p">720p</option>
          <option value="480p">480p</option>
          <option value="360p">360p</option>
          <option value="worst">最低画质</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="container">输出容器</Label>
        <Select
          id="container"
          value={(data.container as string) || ''}
          onChange={(e) => onChange('container', e.target.value)}
        >
          <option value="">自动（保留原格式）</option>
          <option value="mp4">MP4</option>
          <option value="mkv">MKV</option>
          <option value="webm">WebM</option>
        </Select>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Checkbox
          id="audioOnly"
          checked={(data.audioOnly as boolean) ?? false}
          onCheckedChange={(c) => onChange('audioOnly', c)}
        />
        <Label htmlFor="audioOnly" className="text-sm cursor-pointer">仅下载音频</Label>
      </div>

      {(data.audioOnly as boolean) ? (
        <div className="space-y-2 pl-6">
          <Label htmlFor="audioFormat">音频格式</Label>
          <Select
            id="audioFormat"
            value={(data.audioFormat as string) || 'mp3'}
            onChange={(e) => onChange('audioFormat', e.target.value)}
          >
            <option value="mp3">MP3</option>
            <option value="m4a">M4A</option>
            <option value="aac">AAC</option>
            <option value="opus">Opus</option>
            <option value="flac">FLAC</option>
            <option value="wav">WAV</option>
          </Select>
        </div>
      ) : null}

      <div className="flex items-center gap-2 mt-2">
        <Checkbox
          id="skipExisting"
          checked={(data.skipExisting as boolean) ?? true}
          onCheckedChange={(c) => onChange('skipExisting', c)}
        />
        <Label htmlFor="skipExisting" className="text-sm cursor-pointer">跳过已存在文件（断点续传）</Label>
      </div>

      <YtDlpCommonNetworkSection data={data} onChange={onChange} />

      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 7200}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={7200}
          min={300}
          max={86400}
        />
        <p className="text-xs text-muted-foreground">
          批量下载较慢，建议 1 小时以上
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存所有文件路径的变量名（可选）"
          isStorageVariable
        />
      </div>

      <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <strong>注意：</strong>批量下载耗时较长，且会生成大量文件。建议先用"视频信息查询"或"可用格式列表"摸清状况，再用本模块下载
        </p>
      </div>
    </>
  )
}
