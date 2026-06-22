import type { NodeData } from '@/store/workflowStore'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberInput } from '@/components/ui/number-input'
import { SelectNative as Select } from '@/components/ui/select-native'
import { VariableInput } from '@/components/ui/variable-input'
import { VariableNameInput } from '@/components/ui/variable-name-input'
import { PathInput } from '@/components/ui/path-input'
import { CoordinateInput } from '@/components/ui/coordinate-input'
import { ImagePathInput } from '@/components/ui/image-path-input'

// 格式转换配置
export function FormatConvertConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const mediaType = (data.mediaType as string) || 'video'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="mediaType">媒体类型</Label>
        <Select
          id="mediaType"
          value={mediaType}
          onChange={(e) => onChange('mediaType', e.target.value)}
        >
          <option value="video">视频</option>
          <option value="audio">音频</option>
          <option value="image">图片</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入文件路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源文件路径，支持 {变量名}"
          type="file"
          title="选择源文件"
          fileTypes={mediaType === 'video' 
            ? [['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]
            : mediaType === 'audio'
            ? [['音频文件', '*.mp3;*.wav;*.flac;*.aac;*.m4a;*.ogg;*.wma']]
            : [['图片文件', '*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp;*.tiff']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputFormat">输出格式</Label>
        <Select
          id="outputFormat"
          value={(data.outputFormat as string) || ''}
          onChange={(e) => onChange('outputFormat', e.target.value)}
        >
          {mediaType === 'video' && (
            <>
              <option value="mp4">MP4</option>
              <option value="avi">AVI</option>
              <option value="mkv">MKV</option>
              <option value="mov">MOV</option>
              <option value="webm">WebM</option>
              <option value="gif">GIF</option>
            </>
          )}
          {mediaType === 'audio' && (
            <>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="flac">FLAC</option>
              <option value="aac">AAC</option>
              <option value="ogg">OGG</option>
              <option value="m4a">M4A</option>
            </>
          )}
          {mediaType === 'image' && (
            <>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="webp">WebP</option>
              <option value="gif">GIF</option>
              <option value="bmp">BMP</option>
            </>
          )}
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
        <p className="text-xs text-muted-foreground">
          留空则在源文件同目录生成
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'converted_path'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 图片压缩配置
export function CompressImageConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入图片路径</Label>
        <ImagePathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="quality">压缩质量 (1-100)</Label>
        <NumberInput
          id="quality"
          value={(data.quality as number) ?? 80}
          onChange={(v) => onChange('quality', v)}
          min={1}
          max={100}
        />
        <p className="text-xs text-muted-foreground">
          数值越小压缩率越高，文件越小，但质量越低
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxWidth">最大宽度（可选）</Label>
        <VariableInput
          value={String(data.maxWidth ?? '')}
          onChange={(v) => onChange('maxWidth', v === '' ? '' : v)}
          placeholder="留空不限制，如: 1920"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="maxHeight">最大高度（可选）</Label>
        <VariableInput
          value={String(data.maxHeight ?? '')}
          onChange={(v) => onChange('maxHeight', v === '' ? '' : v)}
          placeholder="留空不限制，如: 1080"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则覆盖源文件"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'compressed_image'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 视频压缩配置
export function CompressVideoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="preset">压缩预设</Label>
        <Select
          id="preset"
          value={(data.preset as string) || 'medium'}
          onChange={(e) => onChange('preset', e.target.value)}
        >
          <option value="ultrafast">极快（质量较低）</option>
          <option value="fast">快速</option>
          <option value="medium">中等（推荐）</option>
          <option value="slow">慢速（质量较高）</option>
          <option value="veryslow">极慢（最高质量）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          压缩速度越慢，相同码率下质量越好
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="crf">质量等级 CRF (0-51)</Label>
        <NumberInput
          id="crf"
          value={(data.crf as number) ?? 23}
          onChange={(v) => onChange('crf', v)}
          min={0}
          max={51}
        />
        <p className="text-xs text-muted-foreground">
          0为无损，23为默认，数值越大文件越小但质量越低
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resolution">分辨率（可选）</Label>
        <Select
          id="resolution"
          value={(data.resolution as string) || ''}
          onChange={(e) => onChange('resolution', e.target.value)}
        >
          <option value="">保持原始</option>
          <option value="1920x1080">1080p (1920x1080)</option>
          <option value="1280x720">720p (1280x720)</option>
          <option value="854x480">480p (854x480)</option>
          <option value="640x360">360p (640x360)</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'compressed_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 提取音频配置
export function ExtractAudioConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
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
          <option value="wav">WAV</option>
          <option value="flac">FLAC</option>
          <option value="aac">AAC</option>
          <option value="ogg">OGG</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="audioBitrate">音频比特率</Label>
        <Select
          id="audioBitrate"
          value={(data.audioBitrate as string) || '192k'}
          onChange={(e) => onChange('audioBitrate', e.target.value)}
        >
          <option value="128k">128 kbps（较小）</option>
          <option value="192k">192 kbps（推荐）</option>
          <option value="256k">256 kbps</option>
          <option value="320k">320 kbps（高质量）</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'extracted_audio'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}


// 视频裁剪配置
export function TrimVideoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="startTime">开始时间</Label>
        <VariableInput
          value={(data.startTime as string) || '00:00:00'}
          onChange={(v) => onChange('startTime', v)}
          placeholder="格式: HH:MM:SS 或秒数，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          支持格式: 00:01:30 或 90（秒）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="endTime">结束时间</Label>
        <VariableInput
          value={(data.endTime as string) || ''}
          onChange={(v) => onChange('endTime', v)}
          placeholder="格式: HH:MM:SS 或秒数，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          留空则截取到视频结尾
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'trimmed_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 媒体合并配置
export function MergeMediaConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const mergeType = (data.mergeType as string) || 'video'
  const audioMode = (data.audioMode as string) || 'replace'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="mergeType">合并类型</Label>
        <Select
          id="mergeType"
          value={mergeType}
          onChange={(e) => onChange('mergeType', e.target.value)}
        >
          <option value="video">视频拼接（多个视频首尾相连）</option>
          <option value="audio">音频拼接（多个音频首尾相连）</option>
          <option value="audio_video">音视频合并（将音频添加到视频）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {mergeType === 'video' && '将多个视频文件按顺序拼接成一个视频'}
          {mergeType === 'audio' && '将多个音频文件按顺序拼接成一个音频'}
          {mergeType === 'audio_video' && '将音频轨道添加到视频中（替换或混合）'}
        </p>
      </div>
      
      {/* 音视频合并模式的配置 */}
      {mergeType === 'audio_video' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="videoPath">视频文件路径</Label>
            <PathInput
              value={(data.videoPath as string) || ''}
              onChange={(v) => onChange('videoPath', v)}
              placeholder="视频文件路径，支持 {变量名}"
              type="file"
              title="选择视频文件"
              fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="audioPath">音频文件路径</Label>
            <PathInput
              value={(data.audioPath as string) || ''}
              onChange={(v) => onChange('audioPath', v)}
              placeholder="音频文件路径，支持 {变量名}"
              type="file"
              title="选择音频文件"
              fileTypes={[['音频文件', '*.mp3;*.wav;*.flac;*.aac;*.m4a;*.ogg;*.wma']]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="audioMode">音频处理方式</Label>
            <Select
              id="audioMode"
              value={audioMode}
              onChange={(e) => onChange('audioMode', e.target.value)}
            >
              <option value="replace">替换原音频</option>
              <option value="mix">与原音频混合</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {audioMode === 'replace' && '用新音频完全替换视频原有的音频轨道'}
              {audioMode === 'mix' && '将新音频与视频原有音频混合在一起'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="audioVolume">新音频音量 (0-2)</Label>
            <NumberInput
              id="audioVolume"
              value={(data.audioVolume as number) ?? 1.0}
              onChange={(v) => onChange('audioVolume', v)}
              min={0}
              max={2}
              step={0.1}
            />
            <p className="text-xs text-muted-foreground">
              1.0 为原始音量，0.5 为减半，2.0 为加倍
            </p>
          </div>
          
          {audioMode === 'mix' && (
            <div className="space-y-2">
              <Label htmlFor="originalVolume">原音频音量 (0-2)</Label>
              <NumberInput
                id="originalVolume"
                value={(data.originalVolume as number) ?? 1.0}
                onChange={(v) => onChange('originalVolume', v)}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                视频原有音频的音量，设为0可静音原音频
              </p>
            </div>
          )}
        </>
      )}
      
      {/* 普通拼接模式的配置 */}
      {(mergeType === 'video' || mergeType === 'audio') && (
        <div className="space-y-2">
          <Label htmlFor="inputFiles">输入文件列表</Label>
          <VariableInput
            value={(data.inputFiles as string) || ''}
            onChange={(v) => onChange('inputFiles', v)}
            placeholder="文件路径列表变量，如: {视频列表}"
          />
          <p className="text-xs text-muted-foreground">
            填写包含文件路径的列表变量名，至少需要2个文件
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="合并后的文件路径"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'merged_file'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 添加水印配置
export function AddWatermarkConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const watermarkType = (data.watermarkType as string) || 'image'
  const mediaType = (data.mediaType as string) || 'video'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="mediaType">媒体类型</Label>
        <Select
          id="mediaType"
          value={mediaType}
          onChange={(e) => onChange('mediaType', e.target.value)}
        >
          <option value="video">视频</option>
          <option value="image">图片</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入文件路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源文件路径，支持 {变量名}"
          type="file"
          title="选择文件"
          fileTypes={mediaType === 'video'
            ? [['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]
            : [['图片文件', '*.jpg;*.jpeg;*.png;*.webp;*.gif;*.bmp']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="watermarkType">水印类型</Label>
        <Select
          id="watermarkType"
          value={watermarkType}
          onChange={(e) => onChange('watermarkType', e.target.value)}
        >
          <option value="image">图片水印</option>
          <option value="text">文字水印</option>
        </Select>
      </div>
      
      {watermarkType === 'image' && (
        <div className="space-y-2">
          <Label htmlFor="watermarkImage">水印图片路径</Label>
          <ImagePathInput
            value={(data.watermarkImage as string) || ''}
            onChange={(v) => onChange('watermarkImage', v)}
          />
        </div>
      )}
      
      {watermarkType === 'text' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="watermarkText">水印文字</Label>
            <VariableInput
              value={(data.watermarkText as string) || ''}
              onChange={(v) => onChange('watermarkText', v)}
              placeholder="水印文字内容，支持 {变量名}"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fontSize">字体大小</Label>
            <NumberInput
              id="fontSize"
              value={(data.fontSize as number) ?? 24}
              onChange={(v) => onChange('fontSize', v)}
              min={8}
              max={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fontColor">字体颜色</Label>
            <VariableInput
              value={(data.fontColor as string) || 'white'}
              onChange={(v) => onChange('fontColor', v)}
              placeholder="如: white, #FF0000，支持 {变量名}"
            />
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="position">水印位置</Label>
        <Select
          id="position"
          value={(data.position as string) || 'bottomright'}
          onChange={(e) => onChange('position', e.target.value)}
        >
          <option value="topleft">左上角</option>
          <option value="topright">右上角</option>
          <option value="bottomleft">左下角</option>
          <option value="bottomright">右下角</option>
          <option value="center">居中</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="opacity">透明度 (0-1)</Label>
        <NumberInput
          id="opacity"
          value={(data.opacity as number) ?? 0.8}
          onChange={(v) => onChange('opacity', v)}
          min={0}
          max={1}
          step={0.1}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'watermarked_file'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}


// 人脸识别配置
export function FaceRecognitionConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="sourceImage">待识别图片路径</Label>
        <ImagePathInput
          value={(data.sourceImage as string) || ''}
          onChange={(v) => onChange('sourceImage', v)}
        />
        <p className="text-xs text-muted-foreground">
          将在此图片中检测人脸
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="targetImage">目标人脸图片路径</Label>
        <ImagePathInput
          value={(data.targetImage as string) || ''}
          onChange={(v) => onChange('targetImage', v)}
        />
        <p className="text-xs text-muted-foreground">
          用于比对的目标人脸（应只包含一张人脸）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="tolerance">匹配容差 (0-1)</Label>
        <NumberInput
          id="tolerance"
          value={(data.tolerance as number) ?? 0.6}
          onChange={(v) => onChange('tolerance', v)}
          min={0}
          max={1}
          step={0.05}
        />
        <p className="text-xs text-muted-foreground">
          越小越严格，0.6为默认值，建议0.4-0.6
        </p>
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>分支说明：</strong><br/>
          • 匹配成功：检测到目标人脸<br/>
          • 匹配失败：未检测到目标人脸
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'face_match_result'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储识别结果的变量"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          包含 matched、confidence、source_faces 等信息
        </p>
      </div>
    </>
  )
}

// 图片OCR配置
export function ImageOCRConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  const ocrMode = (data.ocrMode as string) || 'file'
  const ocrType = (data.ocrType as string) || 'general'
  
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="ocrMode">识别模式</Label>
        <Select
          id="ocrMode"
          value={ocrMode}
          onChange={(e) => onChange('ocrMode', e.target.value)}
        >
          <option value="file">图片文件</option>
          <option value="region">屏幕区域</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="ocrType">识别类型</Label>
        <Select
          id="ocrType"
          value={ocrType}
          onChange={(e) => onChange('ocrType', e.target.value)}
        >
          <option value="general">通用文字（支持多行）</option>
          <option value="captcha">验证码（单行短文本）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          {ocrType === 'general' 
            ? '通用模式：先检测文字区域，再逐个识别，适合多行文本、屏幕截图' 
            : '验证码模式：直接识别整张图，适合单行验证码、简短文字'}
        </p>
      </div>
      
      {ocrMode === 'file' ? (
        <div className="space-y-2">
          <Label htmlFor="imagePath">图片路径</Label>
          <ImagePathInput
            value={(data.imagePath as string) || ''}
            onChange={(v) => onChange('imagePath', v)}
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>起点坐标（左上角）</Label>
            <CoordinateInput
              xValue={(data.startX as string) || ''}
              yValue={(data.startY as string) || ''}
              onXChange={(v) => onChange('startX', v)}
              onYChange={(v) => onChange('startY', v)}
            />
          </div>
          <div className="space-y-2">
            <Label>终点坐标（右下角）</Label>
            <CoordinateInput
              xValue={(data.endX as string) || ''}
              yValue={(data.endY as string) || ''}
              onXChange={(v) => onChange('endX', v)}
              onYChange={(v) => onChange('endY', v)}
            />
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'ocr_text'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储识别结果的变量"
          isStorageVariable
        />
      </div>
      
      <p className="text-xs text-muted-foreground">
        {ocrMode === 'file' 
          ? '识别图片文件中的文字，通用模式支持多行文本' 
          : '截取屏幕指定区域并识别文字，通用模式会自动检测并识别多个文字区域'}
      </p>
    </>
  )
}


// M3U8下载配置（使用 N_m3u8DL-RE）
export function DownloadM3U8Config({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="m3u8Url">M3U8链接</Label>
        <VariableInput
          value={(data.m3u8Url as string) || ''}
          onChange={(v) => onChange('m3u8Url', v)}
          placeholder="https://example.com/video.m3u8，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          输入完整的 M3U8/HLS 播放列表链接
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出目录</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="视频保存目录，支持 {变量名}"
          type="folder"
          title="选择输出目录"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputFilename">输出文件名</Label>
        <VariableInput
          value={(data.outputFilename as string) || ''}
          onChange={(v) => onChange('outputFilename', v)}
          placeholder="video（可选，无需扩展名），支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          留空则自动生成文件名，输出为 MP4 格式
        </p>
      </div>
      
      <div className="pt-3 border-t">
        <h3 className="text-sm font-medium mb-3">下载设置</h3>
        
        <div className="space-y-2">
          <Label htmlFor="threadCount">下载线程数</Label>
          <NumberInput
            id="threadCount"
            value={(data.threadCount as number) ?? 8}
            onChange={(v) => onChange('threadCount', v)}
            defaultValue={8}
            min={1}
            max={32}
          />
          <p className="text-xs text-muted-foreground">
            并发下载线程数，默认8线程
          </p>
        </div>
        
        <div className="flex items-center gap-2 pt-2">
          <Checkbox
            id="autoSelect"
            checked={(data.autoSelect as boolean) ?? true}
            onCheckedChange={(c) => onChange('autoSelect', c)}
          />
          <Label htmlFor="autoSelect" className="text-sm cursor-pointer">自动选择最佳画质</Label>
        </div>
      </div>
      
      <div className="pt-3 border-t">
        <h3 className="text-sm font-medium mb-3">HTTP 请求配置</h3>
        
        <div className="space-y-2">
          <Label htmlFor="userAgent">User-Agent</Label>
          <VariableInput
            value={(data.userAgent as string) || ''}
            onChange={(v) => onChange('userAgent', v)}
            placeholder="留空使用默认，支持 {变量名}"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="referer">Referer</Label>
          <VariableInput
            value={(data.referer as string) || ''}
            onChange={(v) => onChange('referer', v)}
            placeholder="https://example.com（可选），支持 {变量名}"
          />
          <p className="text-xs text-muted-foreground">
            某些网站需要Referer来防止盗链
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="customHeaders">自定义请求头</Label>
          <VariableInput
            value={(data.customHeaders as string) || ''}
            onChange={(v) => onChange('customHeaders', v)}
            placeholder="Header1: Value1|Header2: Value2"
          />
        </div>
      </div>
      
      <div className="pt-3 border-t">
        <h3 className="text-sm font-medium mb-3">代理与解密</h3>
        
        <div className="flex items-center gap-2">
          <Checkbox
            id="useSystemProxy"
            checked={(data.useSystemProxy as boolean) ?? true}
            onCheckedChange={(c) => onChange('useSystemProxy', c)}
          />
          <Label htmlFor="useSystemProxy" className="text-sm cursor-pointer">使用系统代理</Label>
        </div>
        
        <div className="space-y-2 mt-2">
          <Label htmlFor="customProxy">自定义代理</Label>
          <VariableInput
            value={(data.customProxy as string) || ''}
            onChange={(v) => onChange('customProxy', v)}
            placeholder="http://127.0.0.1:7890（可选）"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="decryptionKey">解密密钥</Label>
          <VariableInput
            value={(data.decryptionKey as string) || ''}
            onChange={(v) => onChange('decryptionKey', v)}
            placeholder="KID:KEY 或直接输入 KEY（可选）"
          />
          <p className="text-xs text-muted-foreground">
            用于解密加密的 HLS 流
          </p>
        </div>
      </div>
      
      <div className="space-y-2 pt-3 border-t">
        <Label htmlFor="timeout">超时时间（秒）</Label>
        <NumberInput
          id="timeout"
          value={(data.timeout as number) ?? 1800}
          onChange={(v) => onChange('timeout', v)}
          defaultValue={1800}
          min={60}
          max={7200}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="保存文件路径的变量名（可选）"
          isStorageVariable={true}
        />
      </div>
      
      <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>功能特点：</strong><br />
          • 全新下载引擎，支持更多加密格式<br />
          • 多线程下载，速度更快<br />
          • 支持 AES-128、SAMPLE-AES 等加密方式<br />
          • 自动合并音视频为 MP4 格式
        </p>
      </div>
    </>
  )
}


// 视频旋转/翻转配置
export function RotateVideoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="rotateType">旋转/翻转类型</Label>
        <Select
          id="rotateType"
          value={(data.rotateType as string) || 'rotate_90'}
          onChange={(e) => onChange('rotateType', e.target.value)}
        >
          <option value="rotate_90">顺时针旋转90度</option>
          <option value="rotate_180">旋转180度</option>
          <option value="rotate_270">逆时针旋转90度</option>
          <option value="flip_h">水平翻转（镜像）</option>
          <option value="flip_v">垂直翻转（上下颠倒）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          常用于修正手机拍摄的视频方向
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'rotated_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 视频倍速配置
export function VideoSpeedConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="speed">播放速度倍数</Label>
        <NumberInput
          id="speed"
          value={(data.speed as number) ?? 1.0}
          onChange={(v) => onChange('speed', v)}
          min={0.1}
          max={100}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          0.5 = 慢速（半速），1.0 = 正常，2.0 = 快速（2倍速）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="adjustAudio">同步调整音频速度</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="adjustAudio"
            checked={(data.adjustAudio as boolean) ?? true}
            onCheckedChange={(c) => onChange('adjustAudio', c)}
          />
          <span className="text-sm">
            {(data.adjustAudio as boolean) ?? true ? '已启用' : '已禁用'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          启用后音频速度会同步调整，禁用则保持原音频
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'speed_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
    </>
  )
}

// 视频截取帧配置
export function ExtractFrameConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="timestamp">时间点</Label>
        <VariableInput
          value={(data.timestamp as string) || '00:00:01'}
          onChange={(v) => onChange('timestamp', v)}
          placeholder="格式: HH:MM:SS 或秒数，支持 {变量名}"
        />
        <p className="text-xs text-muted-foreground">
          支持格式: 00:01:30 或 90（秒）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="imageFormat">图片格式</Label>
        <Select
          id="imageFormat"
          value={(data.imageFormat as string) || 'jpg'}
          onChange={(e) => onChange('imageFormat', e.target.value)}
        >
          <option value="jpg">JPG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
          <option value="bmp">BMP</option>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出图片路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'frame_image'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出图片路径"
          isStorageVariable
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>使用场景：</strong><br />
          • 提取视频封面图<br />
          • 视频内容预览<br />
          • 视频关键帧提取
        </p>
      </div>
    </>
  )
}

// 视频添加字幕配置
export function AddSubtitleConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="subtitleFile">字幕文件路径</Label>
        <PathInput
          value={(data.subtitleFile as string) || ''}
          onChange={(v) => onChange('subtitleFile', v)}
          placeholder="字幕文件路径（.srt/.ass），支持 {变量名}"
          type="file"
          title="选择字幕文件"
          fileTypes={[['字幕文件', '*.srt;*.ass;*.ssa']]}
        />
        <p className="text-xs text-muted-foreground">
          支持 SRT、ASS、SSA 格式字幕文件
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'subtitled_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
      
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>注意：</strong><br />
          • 字幕会被烧录到视频中（硬字幕）<br />
          • 烧录后无法移除或修改字幕<br />
          • 处理时间较长，需要重新编码视频
        </p>
      </div>
    </>
  )
}

// 音频调节音量配置
export function AdjustVolumeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入文件路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="音频/视频文件路径，支持 {变量名}"
          type="file"
          title="选择文件"
          fileTypes={[
            ['媒体文件', '*.mp4;*.avi;*.mkv;*.mov;*.mp3;*.wav;*.flac;*.aac;*.m4a;*.ogg']
          ]}
        />
        <p className="text-xs text-muted-foreground">
          支持音频和视频文件
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="volume">音量倍数</Label>
        <NumberInput
          id="volume"
          value={(data.volume as number) ?? 1.0}
          onChange={(v) => onChange('volume', v)}
          min={0}
          max={10}
          step={0.1}
        />
        <p className="text-xs text-muted-foreground">
          0.5 = 减半，1.0 = 原音量，2.0 = 加倍，0 = 静音
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'adjusted_audio'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>使用场景：</strong><br />
          • 增大音量过小的音频<br />
          • 降低音量过大的音频<br />
          • 统一多个音频的音量
        </p>
      </div>
    </>
  )
}

// 视频分辨率调整配置
export function ResizeVideoConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="inputPath">输入视频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="源视频路径，支持 {变量名}"
          type="file"
          title="选择视频"
          fileTypes={[['视频文件', '*.mp4;*.avi;*.mkv;*.mov;*.wmv;*.flv;*.webm']]}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="width">目标宽度（像素）</Label>
        <NumberInput
          id="width"
          value={(data.width as number) ?? 0}
          onChange={(v) => onChange('width', v)}
          min={0}
          max={7680}
        />
        <p className="text-xs text-muted-foreground">
          0 表示自动计算（保持宽高比时）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="height">目标高度（像素）</Label>
        <NumberInput
          id="height"
          value={(data.height as number) ?? 0}
          onChange={(v) => onChange('height', v)}
          min={0}
          max={4320}
        />
        <p className="text-xs text-muted-foreground">
          0 表示自动计算（保持宽高比时）
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="keepAspect">保持宽高比</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="keepAspect"
            checked={(data.keepAspect as boolean) ?? true}
            onCheckedChange={(c) => onChange('keepAspect', c)}
          />
          <span className="text-sm">
            {(data.keepAspect as boolean) ?? true ? '已启用' : '已禁用'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          启用后视频不会变形，禁用则强制缩放到指定尺寸
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="outputPath">输出文件路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
          title="选择保存位置"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resultVariable">结果变量名</Label>
        <VariableNameInput
          id="resultVariable"
          value={(data.resultVariable as string) || 'resized_video'}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="存储输出文件路径"
          isStorageVariable
        />
      </div>
      
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>常用分辨率：</strong><br />
          • 4K: 3840×2160<br />
          • 1080p: 1920×1080<br />
          • 720p: 1280×720<br />
          • 480p: 854×480
        </p>
      </div>
    </>
  )
}


// 图片去色配置
export function ImageGrayscaleConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入图片路径</Label>
        <ImagePathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>输出路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="grayscale_image"
        />
      </div>
    </div>
  )
}

// 图片圆角化配置
export function ImageRoundCornersConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入图片路径</Label>
        <ImagePathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>圆角半径（像素）</Label>
        <NumberInput
          value={(data.radius as number) || 20}
          onChange={(v) => onChange('radius', v)}
          defaultValue={20}
          min={1}
          max={500}
        />
      </div>
      <div className="space-y-2">
        <Label>输出路径（可选）</Label>
        <PathInput
          value={(data.outputPath as string) || ''}
          onChange={(v) => onChange('outputPath', v)}
          placeholder="留空则自动生成（PNG格式）"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="rounded_image"
        />
      </div>
    </div>
  )
}

// 音频转文本配置
export function AudioToTextConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入音频路径</Label>
        <PathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
          placeholder="要转换的音频文件"
          type="file"
        />
      </div>
      <div className="space-y-2">
        <Label>识别语言</Label>
        <Select
          value={(data.language as string) || 'zh'}
          onChange={(e) => onChange('language', e.target.value)}
        >
          <option value="auto">自动检测</option>
          <option value="zh">中文</option>
          <option value="en">英语</option>
          <option value="ja">日语</option>
          <option value="ko">韩语</option>
          <option value="fr">法语</option>
          <option value="de">德语</option>
          <option value="es">西班牙语</option>
          <option value="ru">俄语</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>模型大小</Label>
        <Select
          value={(data.modelSize as string) || 'base'}
          onChange={(e) => onChange('modelSize', e.target.value)}
        >
          <option value="tiny">tiny（最快，精度较低）</option>
          <option value="base">base（推荐，平衡速度和精度）</option>
          <option value="small">small（较慢，精度较高）</option>
          <option value="medium">medium（慢，精度高）</option>
          <option value="large-v3">large-v3（最慢，精度最高）</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          首次使用会自动下载模型，larger模型需要更多内存
        </p>
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="transcribed_text"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        使用本地 Whisper 模型进行语音识别，无需网络连接
      </p>
    </div>
  )
}

// 二维码生成配置
export function QRGenerateConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>二维码内容</Label>
        <VariableInput
          value={(data.content as string) || ''}
          onChange={(v) => onChange('content', v)}
          placeholder="要编码的文本或URL"
          multiline
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>图片尺寸（像素）</Label>
        <NumberInput
          value={(data.size as number) || 300}
          onChange={(v) => onChange('size', v)}
          defaultValue={300}
          min={100}
          max={1000}
        />
      </div>
      <div className="space-y-2">
        <Label>纠错级别</Label>
        <Select
          value={(data.errorCorrection as string) || 'M'}
          onChange={(e) => onChange('errorCorrection', e.target.value)}
        >
          <option value="L">L - 7% 纠错</option>
          <option value="M">M - 15% 纠错（推荐）</option>
          <option value="Q">Q - 25% 纠错</option>
          <option value="H">H - 30% 纠错</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>保存目录（可选）</Label>
        <PathInput
          value={(data.outputDir as string) || ''}
          onChange={(v) => onChange('outputDir', v)}
          placeholder="留空则保存到临时目录"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="qr_image"
        />
      </div>
    </div>
  )
}

// 二维码解码配置
export function QRDecodeConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>输入图片路径</Label>
        <ImagePathInput
          value={(data.inputPath as string) || ''}
          onChange={(v) => onChange('inputPath', v)}
        />
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="qr_content"
        />
      </div>
    </div>
  )
}

// 桌面录屏配置
export function ScreenRecordConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>录制时长（秒）</Label>
        <NumberInput
          value={(data.duration as number) || 30}
          onChange={(v) => onChange('duration', v)}
          defaultValue={30}
          min={5}
          max={3600}
        />
      </div>
      <div className="space-y-2">
        <Label>输出文件夹</Label>
        <PathInput
          value={(data.outputFolder as string) || ''}
          onChange={(v) => onChange('outputFolder', v)}
          placeholder="留空则保存到用户视频文件夹"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label>文件名（可选）</Label>
        <VariableInput
          value={(data.filename as string) || ''}
          onChange={(v) => onChange('filename', v)}
          placeholder="留空则自动生成"
        />
      </div>
      <div className="space-y-2">
        <Label>帧率</Label>
        <Select
          value={String((data.fps as number) || 30)}
          onChange={(e) => onChange('fps', parseInt(e.target.value))}
        >
          <option value="15">15 FPS（流畅）</option>
          <option value="30">30 FPS（推荐）</option>
          <option value="60">60 FPS（高帧率）</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>画质</Label>
        <Select
          value={(data.quality as string) || 'medium'}
          onChange={(e) => onChange('quality', e.target.value)}
        >
          <option value="low">低画质（文件小）</option>
          <option value="medium">中画质（推荐）</option>
          <option value="high">高画质（文件大）</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.resultVariable as string) || ''}
          onChange={(v) => onChange('resultVariable', v)}
          placeholder="recording_path"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        ⚡ 非阻塞模式：录屏在后台进行，不会阻塞后续模块执行
      </p>
    </div>
  )
}

// 摄像头拍照配置
export function CameraCaptureConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>摄像头索引</Label>
        <NumberInput
          value={(data.cameraIndex as number) ?? 0}
          onChange={(v) => onChange('cameraIndex', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0为默认摄像头，如有多个摄像头可尝试1、2等
        </p>
      </div>
      <div className="space-y-2">
        <Label>输出文件夹</Label>
        <PathInput
          value={(data.outputFolder as string) || ''}
          onChange={(v) => onChange('outputFolder', v)}
          placeholder="留空则保存到用户图片文件夹"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label>文件名（可选）</Label>
        <VariableInput
          value={(data.filename as string) || ''}
          onChange={(v) => onChange('filename', v)}
          placeholder="留空则自动生成，如: camera_20260129_143000.jpg"
        />
        <p className="text-xs text-muted-foreground">
          支持 .jpg、.jpeg、.png 格式
        </p>
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.saveToVariable as string) || 'camera_photo'}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="camera_photo"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          保存照片文件路径到变量
        </p>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>使用说明：</strong><br/>
          • 自动打开摄像头并拍摄一张照片<br/>
          • 照片保存为 JPG 格式<br/>
          • 可用于人脸采集、证件拍摄等场景
        </p>
      </div>
    </div>
  )
}

// 摄像头录像配置
export function CameraRecordConfig({ data, onChange }: { data: NodeData; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>摄像头索引</Label>
        <NumberInput
          value={(data.cameraIndex as number) ?? 0}
          onChange={(v) => onChange('cameraIndex', v)}
          defaultValue={0}
          min={0}
        />
        <p className="text-xs text-muted-foreground">
          0为默认摄像头，如有多个摄像头可尝试1、2等
        </p>
      </div>
      <div className="space-y-2">
        <Label>录制时长（秒）</Label>
        <NumberInput
          value={(data.duration as number) || 10}
          onChange={(v) => onChange('duration', v)}
          defaultValue={10}
          min={1}
          max={3600}
        />
        <p className="text-xs text-muted-foreground">
          录制完成后才会继续执行后续模块
        </p>
      </div>
      <div className="space-y-2">
        <Label>输出文件夹</Label>
        <PathInput
          value={(data.outputFolder as string) || ''}
          onChange={(v) => onChange('outputFolder', v)}
          placeholder="留空则保存到用户视频文件夹"
          type="folder"
        />
      </div>
      <div className="space-y-2">
        <Label>文件名（可选）</Label>
        <VariableInput
          value={(data.filename as string) || ''}
          onChange={(v) => onChange('filename', v)}
          placeholder="留空则自动生成，如: camera_20260129_143000.mp4"
        />
      </div>
      <div className="space-y-2">
        <Label>帧率</Label>
        <Select
          value={String((data.fps as number) || 30)}
          onChange={(e) => onChange('fps', parseInt(e.target.value))}
        >
          <option value="15">15 FPS（流畅）</option>
          <option value="30">30 FPS（推荐）</option>
          <option value="60">60 FPS（高帧率）</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>分辨率（可选）</Label>
        <Select
          value={(data.resolution as string) || ''}
          onChange={(e) => onChange('resolution', e.target.value)}
        >
          <option value="">自动（摄像头默认）</option>
          <option value="1920x1080">1080p (1920x1080)</option>
          <option value="1280x720">720p (1280x720)</option>
          <option value="640x480">480p (640x480)</option>
        </Select>
        <p className="text-xs text-muted-foreground">
          部分摄像头可能不支持所有分辨率
        </p>
      </div>
      <div className="space-y-2">
        <Label>结果变量名</Label>
        <VariableNameInput
          value={(data.saveToVariable as string) || 'camera_video'}
          onChange={(v) => onChange('saveToVariable', v)}
          placeholder="camera_video"
          isStorageVariable
        />
        <p className="text-xs text-muted-foreground">
          保存视频文件路径到变量
        </p>
      </div>
      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>使用说明：</strong><br/>
          • 自动打开摄像头并录制指定时长的视频<br/>
          • 录制期间会阻塞工作流，完成后继续执行<br/>
          • 视频保存为 MP4 格式<br/>
          • 可用于视频采集、监控录像等场景
        </p>
      </div>
      <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-xs text-amber-700 dark:text-amber-300">
          <strong>注意：</strong>录制过程中工作流会等待，与桌面录屏的非阻塞模式不同
        </p>
      </div>
    </div>
  )
}
