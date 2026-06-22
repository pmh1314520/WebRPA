/**
 * 格式工厂模块配置面板
 */
import { Label } from '@/components/ui/label'
import { VariableInput } from '@/components/ui/variable-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { ImagePathInput } from '@/components/ui/image-path-input'

interface BaseConfigProps {
  config: any
  onChange: (newConfig: any) => void
}

// 图片格式转换配置
export function ImageFormatConvertConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入图片路径</Label>
        <ImagePathInput
          value={config.inputPath || ''}
          onChange={(value) => onChange({ ...config, inputPath: value })}
          placeholder="从图像资源中选择或输入路径"
        />
      </div>

      <div className="space-y-2">
        <Label>输出格式</Label>
        <Select
          value={config.outputFormat || 'png'}
          onValueChange={(value) => onChange({ ...config, outputFormat: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="jpg">JPG</SelectItem>
            <SelectItem value="jpeg">JPEG</SelectItem>
            <SelectItem value="png">PNG</SelectItem>
            <SelectItem value="bmp">BMP</SelectItem>
            <SelectItem value="gif">GIF</SelectItem>
            <SelectItem value="webp">WebP</SelectItem>
            <SelectItem value="tiff">TIFF</SelectItem>
            <SelectItem value="ico">ICO</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>质量: {config.quality || 95}%</Label>
        <Slider
          value={[config.quality || 95]}
          onValueChange={([value]) => onChange({ ...config, quality: value })}
          min={1}
          max={100}
          step={1}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>宽度 (可选)</Label>
          <VariableInput
            type="number"
            value={String(config.resizeWidth || '')}
            onChange={(value) => onChange({ ...config, resizeWidth: value })}
            placeholder="保持原始"
          />
        </div>
        <div className="space-y-2">
          <Label>高度 (可选)</Label>
          <VariableInput
            type="number"
            value={String(config.resizeHeight || '')}
            onChange={(value) => onChange({ ...config, resizeHeight: value })}
            placeholder="保持原始"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>输出路径 (可选)</Label>
        <VariableInput
          value={config.outputPath || ''}
          onChange={(value) => onChange({ ...config, outputPath: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'converted_image'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="converted_image"
        />
      </div>
    </div>
  )
}

// 视频格式转换配置
export function VideoFormatConvertConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入视频路径</Label>
        <VariableInput
          value={config.inputPath || ''}
          onChange={(value) => onChange({ ...config, inputPath: value })}
          placeholder="输入视频文件路径或使用变量"
        />
      </div>

      <div className="space-y-2">
        <Label>输出格式</Label>
        <Select
          value={config.outputFormat || 'mp4'}
          onValueChange={(value) => onChange({ ...config, outputFormat: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp4">MP4</SelectItem>
            <SelectItem value="avi">AVI</SelectItem>
            <SelectItem value="mkv">MKV</SelectItem>
            <SelectItem value="mov">MOV</SelectItem>
            <SelectItem value="wmv">WMV</SelectItem>
            <SelectItem value="flv">FLV</SelectItem>
            <SelectItem value="webm">WebM</SelectItem>
            <SelectItem value="m4v">M4V</SelectItem>
            <SelectItem value="mpg">MPG</SelectItem>
            <SelectItem value="3gp">3GP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>视频编码</Label>
          <Select
            value={config.videoCodec || 'auto'}
            onValueChange={(value) => onChange({ ...config, videoCodec: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动</SelectItem>
              <SelectItem value="libx264">H.264</SelectItem>
              <SelectItem value="libx265">H.265</SelectItem>
              <SelectItem value="libvpx-vp9">VP9</SelectItem>
              <SelectItem value="mpeg4">MPEG-4</SelectItem>
              <SelectItem value="copy">复制(不重编码)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>音频编码</Label>
          <Select
            value={config.audioCodec || 'auto'}
            onValueChange={(value) => onChange({ ...config, audioCodec: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">自动</SelectItem>
              <SelectItem value="aac">AAC</SelectItem>
              <SelectItem value="mp3">MP3</SelectItem>
              <SelectItem value="libopus">Opus</SelectItem>
              <SelectItem value="copy">复制(不重编码)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>视频比特率 (可选)</Label>
          <VariableInput
            value={config.videoBitrate || ''}
            onChange={(value) => onChange({ ...config, videoBitrate: value })}
            placeholder="例如: 2M, 5000k"
          />
        </div>

        <div className="space-y-2">
          <Label>音频比特率</Label>
          <Select
            value={config.audioBitrate || '128k'}
            onValueChange={(value) => onChange({ ...config, audioBitrate: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="64k">64 kbps</SelectItem>
              <SelectItem value="128k">128 kbps</SelectItem>
              <SelectItem value="192k">192 kbps</SelectItem>
              <SelectItem value="256k">256 kbps</SelectItem>
              <SelectItem value="320k">320 kbps</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>输出路径 (可选)</Label>
        <VariableInput
          value={config.outputPath || ''}
          onChange={(value) => onChange({ ...config, outputPath: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'converted_video'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="converted_video"
        />
      </div>
    </div>
  )
}

// 音频格式转换配置
export function AudioFormatConvertConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入音频路径</Label>
        <VariableInput
          value={config.inputPath || ''}
          onChange={(value) => onChange({ ...config, inputPath: value })}
          placeholder="输入音频文件路径或使用变量"
        />
      </div>

      <div className="space-y-2">
        <Label>输出格式</Label>
        <Select
          value={config.outputFormat || 'mp3'}
          onValueChange={(value) => onChange({ ...config, outputFormat: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="aac">AAC</SelectItem>
            <SelectItem value="wav">WAV</SelectItem>
            <SelectItem value="flac">FLAC</SelectItem>
            <SelectItem value="ogg">OGG</SelectItem>
            <SelectItem value="m4a">M4A</SelectItem>
            <SelectItem value="wma">WMA</SelectItem>
            <SelectItem value="opus">Opus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>比特率</Label>
          <Select
            value={config.bitrate || '192k'}
            onValueChange={(value) => onChange({ ...config, bitrate: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="64k">64 kbps</SelectItem>
              <SelectItem value="128k">128 kbps</SelectItem>
              <SelectItem value="192k">192 kbps</SelectItem>
              <SelectItem value="256k">256 kbps</SelectItem>
              <SelectItem value="320k">320 kbps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>采样率 (可选)</Label>
          <Select
            value={config.sampleRate || 'original'}
            onValueChange={(value) => onChange({ ...config, sampleRate: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="original">保持原始</SelectItem>
              <SelectItem value="22050">22050 Hz</SelectItem>
              <SelectItem value="44100">44100 Hz</SelectItem>
              <SelectItem value="48000">48000 Hz</SelectItem>
              <SelectItem value="96000">96000 Hz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>输出路径 (可选)</Label>
        <VariableInput
          value={config.outputPath || ''}
          onChange={(value) => onChange({ ...config, outputPath: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'converted_audio'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="converted_audio"
        />
      </div>
    </div>
  )
}

// 视频转音频配置
export function VideoToAudioConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入视频路径</Label>
        <VariableInput
          value={config.inputPath || ''}
          onChange={(value) => onChange({ ...config, inputPath: value })}
          placeholder="输入视频文件路径或使用变量"
        />
      </div>

      <div className="space-y-2">
        <Label>输出音频格式</Label>
        <Select
          value={config.outputFormat || 'mp3'}
          onValueChange={(value) => onChange({ ...config, outputFormat: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mp3">MP3</SelectItem>
            <SelectItem value="aac">AAC</SelectItem>
            <SelectItem value="wav">WAV</SelectItem>
            <SelectItem value="flac">FLAC</SelectItem>
            <SelectItem value="ogg">OGG</SelectItem>
            <SelectItem value="m4a">M4A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>比特率</Label>
        <Select
          value={config.bitrate || '192k'}
          onValueChange={(value) => onChange({ ...config, bitrate: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="64k">64 kbps</SelectItem>
            <SelectItem value="128k">128 kbps</SelectItem>
            <SelectItem value="192k">192 kbps</SelectItem>
            <SelectItem value="256k">256 kbps</SelectItem>
            <SelectItem value="320k">320 kbps</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>输出路径 (可选)</Label>
        <VariableInput
          value={config.outputPath || ''}
          onChange={(value) => onChange({ ...config, outputPath: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'extracted_audio'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="extracted_audio"
        />
      </div>
    </div>
  )
}

// 视频转GIF配置
export function VideoToGIFConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入视频路径</Label>
        <VariableInput
          value={config.inputPath || ''}
          onChange={(value) => onChange({ ...config, inputPath: value })}
          placeholder="输入视频文件路径或使用变量"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>帧率 (FPS)</Label>
          <VariableInput
            type="number"
            value={String(config.fps || 10)}
            onChange={(value) => onChange({ ...config, fps: value })}
            placeholder="10"
          />
        </div>

        <div className="space-y-2">
          <Label>宽度 (像素)</Label>
          <VariableInput
            type="number"
            value={String(config.width || 480)}
            onChange={(value) => onChange({ ...config, width: value })}
            placeholder="480"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>开始时间 (可选)</Label>
          <VariableInput
            value={config.startTime || ''}
            onChange={(value) => onChange({ ...config, startTime: value })}
            placeholder="00:00:00"
          />
        </div>

        <div className="space-y-2">
          <Label>持续时间 (可选)</Label>
          <VariableInput
            value={config.duration || ''}
            onChange={(value) => onChange({ ...config, duration: value })}
            placeholder="5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>输出路径 (可选)</Label>
        <VariableInput
          value={config.outputPath || ''}
          onChange={(value) => onChange({ ...config, outputPath: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'gif_path'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="gif_path"
        />
      </div>
    </div>
  )
}

// 批量格式转换配置
export function BatchFormatConvertConfig({ config, onChange }: BaseConfigProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入文件夹</Label>
        <VariableInput
          value={config.inputFolder || ''}
          onChange={(value) => onChange({ ...config, inputFolder: value })}
          placeholder="输入文件夹路径或使用变量"
        />
      </div>

      <div className="space-y-2">
        <Label>输出文件夹 (可选)</Label>
        <VariableInput
          value={config.outputFolder || ''}
          onChange={(value) => onChange({ ...config, outputFolder: value })}
          placeholder="留空自动生成"
        />
      </div>

      <div className="space-y-2">
        <Label>输出格式</Label>
        <VariableInput
          value={config.outputFormat || 'mp4'}
          onChange={(value) => onChange({ ...config, outputFormat: value })}
          placeholder="mp4"
        />
      </div>

      <div className="space-y-2">
        <Label>文件匹配模式</Label>
        <VariableInput
          value={config.filePattern || '*.*'}
          onChange={(value) => onChange({ ...config, filePattern: value })}
          placeholder="*.*"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="recursive"
          checked={config.recursive || false}
          onCheckedChange={(c) => onChange({ ...config, recursive: c })}
        />
        <Label htmlFor="recursive">递归搜索子文件夹</Label>
      </div>

      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableInput
          value={config.resultVariable || 'converted_files'}
          onChange={(value) => onChange({ ...config, resultVariable: value })}
          placeholder="converted_files"
        />
      </div>
    </div>
  )
}
