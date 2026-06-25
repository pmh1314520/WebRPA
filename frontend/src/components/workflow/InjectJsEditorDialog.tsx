import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Editor, { type Monaco, loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import { X, Play, RotateCcw, Copy, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkflowStore } from '@/store/workflowStore'
import { AICodeAssistant } from './AICodeAssistant'

// 配置 Monaco Editor 使用本地包，避免从 CDN 加载
loader.config({ monaco })

// 预加载 Monaco Editor（只加载一次）
let monacoPreloaded = false
if (!monacoPreloaded) {
  loader.init().then(() => {
    monacoPreloaded = true
  }).catch((error) => {
    console.error('[InjectJsEditorDialog] Monaco 预加载失败:', error)
  })
}

interface InjectJsEditorDialogProps {
  isOpen: boolean
  code: string
  onClose: () => void
  onSave: (code: string) => void
}

const DEFAULT_CODE = `// 在页面中注入并执行 JavaScript 代码
// 可以访问页面的 DOM、window 对象等
// 可以通过 vars.变量名 访问工作流中的所有变量

// 示例1：使用工作流变量
// const username = vars.username;  // 访问工作流变量
// console.log('当前用户:', username);

// 示例2：修改页面背景色（最明显的测试）
document.body.style.background = "lightblue";

// 示例3：修改页面标题
// document.title = "JS脚本注入成功";

// 示例4：在页面上显示提示框
// const div = document.createElement('div');
// div.style.cssText = 'position:fixed;top:20px;right:20px;background:green;color:white;padding:20px;font-size:18px;z-index:999999;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
// div.textContent = '脚本执行成功';
// document.body.appendChild(div);

// 示例5：获取页面信息（使用 return 返回数据）
// return {
//   title: document.title,
//   url: window.location.href,
//   linkCount: document.querySelectorAll('a').length
// };
`

export function InjectJsEditorDialog({ isOpen, code, onClose, onSave }: InjectJsEditorDialogProps) {
  const [currentCode, setCurrentCode] = useState(code || DEFAULT_CODE)
  const [testResult, setTestResult] = useState<{ success: boolean; result?: string; error?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  
  const variables = useWorkflowStore((state) => state.variables)
  const nodes = useWorkflowStore((state) => state.nodes)

  // 同步外部 code 变化
  useEffect(() => {
    if (isOpen) {
      setCurrentCode(code || DEFAULT_CODE)
      setTestResult(null)
    }
  }, [isOpen, code])

  // 配置 Monaco Editor
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco

    // 收集所有变量名用于自动补全
    const varNames = new Set<string>()
    variables.forEach(v => varNames.add(v.name))
    nodes.forEach(node => {
      const data = node.data as Record<string, unknown>
      const fields = ['variableName', 'resultVariable', 'itemVariable', 'indexVariable', 'loopIndexVariable', 
                      'saveToVariable', 'saveNewElementSelector', 'saveChangeInfo', 'variableNameX', 'variableNameY',
                      'stdoutVariable', 'stderrVariable', 'returnCodeVariable', 'columnName', 'outputVariable',
                      'targetVariable', 'dataVariable']
      fields.forEach(field => {
        const val = data[field]
        if (typeof val === 'string' && val.trim()) {
          varNames.add(val)
        }
      })
    })

    // 注册自定义补全提供器
    monaco.languages.registerCompletionItemProvider('javascript', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions: any[] = []

        // vars 对象补全
        suggestions.push({
          label: 'vars',
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: 'vars',
          detail: '工作流变量对象',
          documentation: '包含所有工作流变量的对象，如 vars.myVar',
          range,
        })

        // 变量名补全 (vars.xxx)
        varNames.forEach(name => {
          suggestions.push({
            label: `vars.${name}`,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `vars.${name}`,
            detail: '工作流变量',
            range,
          })
        })

        // 常用DOM操作代码片段
        // @i18n-ignore-start Monaco 代码补全片段：insertText 为插入编辑器的代码、detail 在代码编辑器补全浮窗内显示，均处于 i18n 排除区，占位符默认文本保持中文不参与英文模式翻译
        const snippets = [
          {
            label: 'get-element-by-id',
            insertText: `const element = document.getElementById('\${1:elementId}');`,
            detail: '通过ID获取元素',
          },
          {
            label: 'query-selector',
            insertText: `const element = document.querySelector('\${1:selector}');`,
            detail: '通过选择器获取元素',
          },
          {
            label: 'query-selector-all',
            insertText: `const elements = document.querySelectorAll('\${1:selector}');`,
            detail: '通过选择器获取所有元素',
          },
          {
            label: 'create-element',
            insertText: `const element = document.createElement('\${1:div}');\nelement.textContent = '\${2:内容}';\ndocument.body.appendChild(element);`,
            detail: '创建并添加元素',
          },
          {
            label: 'add-event-listener',
            insertText: `element.addEventListener('\${1:click}', (e) => {\n  \${2:// 处理事件}\n});`,
            detail: '添加事件监听器',
          },
          {
            label: 'set-style',
            insertText: `element.style.cssText = '\${1:color: red; font-size: 16px;}';`,
            detail: '设置元素样式',
          },
          {
            label: 'get-attribute',
            insertText: `const value = element.getAttribute('\${1:attributeName}');`,
            detail: '获取元素属性',
          },
          {
            label: 'set-attribute',
            insertText: `element.setAttribute('\${1:attributeName}', '\${2:value}');`,
            detail: '设置元素属性',
          },
          {
            label: 'get-text-content',
            insertText: `const text = element.textContent;`,
            detail: '获取元素文本',
          },
          {
            label: 'set-text-content',
            insertText: `element.textContent = '\${1:新文本}';`,
            detail: '设置元素文本',
          },
          {
            label: 'get-inner-html',
            insertText: `const html = element.innerHTML;`,
            detail: '获取元素HTML',
          },
          {
            label: 'set-inner-html',
            insertText: `element.innerHTML = '\${1:<div>新内容</div>}';`,
            detail: '设置元素HTML',
          },
          {
            label: 'add-class',
            insertText: `element.classList.add('\${1:className}');`,
            detail: '添加CSS类',
          },
          {
            label: 'remove-class',
            insertText: `element.classList.remove('\${1:className}');`,
            detail: '移除CSS类',
          },
          {
            label: 'toggle-class',
            insertText: `element.classList.toggle('\${1:className}');`,
            detail: '切换CSS类',
          },
        ]
        // @i18n-ignore-end

        snippets.forEach(snippet => {
          suggestions.push({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: snippet.detail,
            range,
          })
        })

        return { suggestions }
      },
    })

    // 聚焦编辑器
    editor.focus()
  }

  // 测试运行代码（模拟浏览器环境）
  const handleTest = () => {
    try {
      // 准备测试变量
      const testVars: Record<string, unknown> = {}
      variables.forEach(v => {
        testVars[v.name] = v.value
      })

      // 模拟浏览器环境（简化版）
      const mockDocument = {
        title: '测试页面',
        body: {
          style: {},
        },
        createElement: (tag: string) => ({ tag, style: {}, textContent: '' }),
        querySelector: () => null,
        querySelectorAll: () => [],
      }

      const mockWindow = {
        location: {
          href: 'http://localhost:3000/test',
        },
      }

      // 执行代码
      const wrappedCode = `
        const vars = ${JSON.stringify(testVars)};
        const document = ${JSON.stringify(mockDocument)};
        const window = ${JSON.stringify(mockWindow)};
        
        ${currentCode}
      `
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const fn = new Function(wrappedCode)
      const result = fn()
      
      setTestResult({
        success: true,
        result: result !== undefined ? JSON.stringify(result, null, 2) : '执行成功（无返回值）',
      })
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // 重置代码
  const handleReset = () => {
    setCurrentCode(DEFAULT_CODE)
    setTestResult(null)
  }

  // 复制代码
  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 保存并关闭
  const handleSave = () => {
    onSave(currentCode)
    onClose()
  }

  if (!isOpen) return null

  // 阻止键盘事件冒泡到外层（如 React Flow）
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/40 animate-fade-in"
      style={{ zIndex: 2147483646 }}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl flex flex-col w-[900px] h-[700px] max-w-[95vw] max-h-[90vh] overflow-hidden animate-scale-in"
        onKeyDown={handleKeyDown}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-3">
            <h3 className="font-medium">JavaScript 脚本注入编辑器</h3>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
              {variables.length} 个变量可用
            </span>
          </div>
          <Button variant="tonal-danger" size="icon" onClick={onClose} title="关闭">

            <X className="w-4 h-4" />

          </Button>
        </div>

        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-gray-50">
          <AICodeAssistant
            language="javascript"
            currentCode={currentCode}
            onCodeGenerated={(code) => setCurrentCode(code)}
            variableReferenceFormat="vars.变量名"
            moduleType="inject_javascript"
          />
          <Button size="sm" variant="tonal-success" onClick={handleTest}>
            <Play className="w-4 h-4 mr-1" />
            测试运行
          </Button>
          <Button size="sm" variant="tonal-success" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            重置
          </Button>
          <Button size="sm" variant="tonal-success" onClick={handleCopy}>
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? '已复制' : '复制'}
          </Button>
          <div className="flex-1" />
          <span className="text-xs text-gray-500">
            提示：输入 <kbd className="px-1 bg-gray-200 rounded">vars.</kbd> 查看变量补全
          </span>
        </div>

        {/* 编辑器区域 */}
        <div className="flex-1 flex min-h-0">
          {/* 代码编辑器 */}
          <div className="flex-1 border-r">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              value={currentCode}
              onChange={(value) => setCurrentCode(value || '')}
              onMount={handleEditorDidMount}
              theme="vs-light"
              loading={
                <div className="flex items-center justify-center h-full gap-2 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>加载编辑器...</span>
                </div>
              }
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                parameterHints: { enabled: true },
                folding: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* 右侧面板 */}
          <div className="w-72 flex flex-col bg-gray-50">
            {/* 变量列表 */}
            <div className="p-3 border-b">
              <h4 className="text-sm font-medium mb-2">可用变量</h4>
              <div className="max-h-40 overflow-auto space-y-1">
                {variables.length === 0 ? (
                  <p className="text-xs text-gray-500">暂无变量</p>
                ) : (
                  variables.map(v => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border cursor-pointer hover:bg-blue-50"
                      onClick={() => {
                        editorRef.current?.trigger('keyboard', 'type', { text: `vars.${v.name}` })
                      }}
                      title="点击插入"
                    >
                      <span className="font-mono text-blue-600">vars.{v.name}</span>
                      <span className="text-gray-400">{v.type}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 测试结果 */}
            <div className="flex-1 p-3 overflow-auto">
              <h4 className="text-sm font-medium mb-2">测试结果</h4>
              {testResult ? (
                <div
                  className={`p-2 rounded text-xs font-mono whitespace-pre-wrap ${
                    testResult.success
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}
                >
                  {testResult.success ? testResult.result : `错误: ${testResult.error}`}
                </div>
              ) : (
                <p className="text-xs text-gray-500">点击"测试运行"查看结果（注意：测试环境是模拟的，实际执行会在真实浏览器页面中）</p>
              )}
            </div>

            {/* 快捷键提示 */}
            <div className="p-3 border-t text-xs text-gray-500 space-y-1">
              <p><kbd className="px-1 bg-gray-200 rounded">Ctrl+Space</kbd> 触发补全</p>
              <p><kbd className="px-1 bg-gray-200 rounded">Ctrl+/</kbd> 注释/取消注释</p>
              <p><kbd className="px-1 bg-gray-200 rounded">Ctrl+Z</kbd> 撤销</p>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button variant="success" onClick={handleSave}>
            保存
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
