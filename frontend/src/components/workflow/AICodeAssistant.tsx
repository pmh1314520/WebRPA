import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, X, Loader2, Send } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useGlobalConfigStore } from '@/store/globalConfigStore'

interface AICodeAssistantProps {
  language: 'javascript' | 'python'
  currentCode: string
  onCodeGenerated: (code: string) => void
  variableReferenceFormat?: string // 变量引用格式说明
  moduleType?: 'js_script' | 'inject_javascript' | 'python_script' // 模块类型
}

export function AICodeAssistant({ 
  language, 
  currentCode, 
  onCodeGenerated,
  variableReferenceFormat = '{varName}',
  moduleType = 'js_script'
}: AICodeAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const variables = useWorkflowStore(state => state.variables)
  const globalConfig = useGlobalConfigStore(state => state.config)

  // 构建系统提示词
  // @i18n-ignore-start AI 系统提示词与代码示例模板，发送给 LLM 使用，非界面展示文本
  const buildSystemPrompt = () => {
    const languageName = language === 'javascript' ? 'JavaScript' : 'Python'
    const variableAccessMethod = language === 'javascript' 
      ? 'vars.变量名 或 vars["变量名"]' 
      : 'vars.变量名 或 vars.get("变量名", 默认值)'
    
    // 获取所有变量信息
    const variableList = variables.length > 0
      ? variables.map(v => `  - ${v.name}: ${typeof v.value} = ${JSON.stringify(v.value)}`).join('\n')
      : '  (当前工作流中没有变量)'

    return `你是一个专业的${languageName}代码助手，专门为WebRPA工作流自动化平台编写代码。

# 工作流环境信息

## 编程语言
${languageName}

## 可用变量
工作流中当前定义的所有变量：
${variableList}

## 变量访问方式
${language === 'javascript' ? `
- 在代码中通过 ${variableAccessMethod} 访问工作流变量
- 变量引用格式：${variableReferenceFormat}
- 所有工作流变量都已自动注入到 vars 对象中
- vars 对象支持读写操作
- 示例读取：const value = vars.myVar; 或 const value = vars["myVar"];
- 示例修改：vars.myVar = newValue; 或 vars.myVar += 1;
- 修改后的变量会自动同步回工作流
- 示例返回值：return vars.myVar + 1; // 返回值会存储到结果变量中
` : `
- 系统会自动将所有工作流变量注入到脚本中
- 通过 ${variableAccessMethod} 访问工作流变量
- 变量引用格式：${variableReferenceFormat}
- vars 对象支持读写操作
- 示例读取：value = vars.myVar 或 value = vars.get("myVar", 默认值)
- 示例修改：vars.myVar = newValue 或 vars.myVar += 1
- 修改后的变量会自动同步回工作流
`}

## 代码执行环境
${language === 'javascript' ? (moduleType === 'inject_javascript' ? `
### JS脚本注入模块
- 运行在目标网页的浏览器环境中（页面内执行）
- 可以完全访问页面的DOM、window对象、所有JavaScript API
- 支持所有标准JavaScript语法和浏览器API
- 可以操作页面元素、修改样式、添加事件监听器
- 可以访问页面的全局变量和函数
- 可以通过 vars.变量名 访问工作流变量（只读）
- 使用 return 返回数据到工作流（可选）

### 常见用途
1. 页面操作：修改页面内容、样式、结构
2. 数据提取：从页面中提取数据、表格、列表
3. 事件模拟：触发点击、输入等事件
4. 页面监控：监听页面变化、事件
5. 自动填表：自动填写表单、提交数据
6. 页面美化：修改页面样式、添加元素

### 可用的浏览器API
- document: 文档对象，操作DOM
- window: 窗口对象，访问全局变量
- console: 控制台输出
- localStorage/sessionStorage: 本地存储
- fetch/XMLHttpRequest: 网络请求
- setTimeout/setInterval: 定时器
- Element API: 元素操作（querySelector, addEventListener等）
- 所有标准Web API

### 代码示例
\`\`\`javascript
// 示例1：修改页面背景色
document.body.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
document.body.style.color = "white";

// 示例2：提取页面数据
const links = Array.from(document.querySelectorAll('a')).map(a => ({
  text: a.textContent,
  href: a.href
}));
return { linkCount: links.length, links: links.slice(0, 10) };

// 示例3：自动填写表单
const usernameInput = document.querySelector('input[name="username"]');
const passwordInput = document.querySelector('input[name="password"]');
if (usernameInput && passwordInput) {
  usernameInput.value = vars.username || "testuser";
  passwordInput.value = vars.password || "testpass";
  // 触发input事件（某些框架需要）
  usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
  passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
}

// 示例4：在页面上显示提示框
const notification = document.createElement('div');
notification.style.cssText = \`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 999999;
  font-size: 16px;
  font-weight: 500;
\`;
notification.textContent = '操作成功';
document.body.appendChild(notification);
setTimeout(() => notification.remove(), 3000);

// 示例5：提取表格数据
const table = document.querySelector('table');
if (table) {
  const rows = Array.from(table.querySelectorAll('tr'));
  const data = rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => cell.textContent.trim());
  });
  return { tableData: data };
}

// 示例6：监听按钮点击
const button = document.querySelector('#submit-btn');
if (button) {
  button.addEventListener('click', (e) => {
    console.log('按钮被点击了');
    e.preventDefault(); // 阻止默认行为
  });
}

// 示例7：修改所有链接颜色
document.querySelectorAll('a').forEach(link => {
  link.style.color = '#3b82f6';
  link.style.textDecoration = 'underline';
});

// 示例8：获取页面信息
return {
  title: document.title,
  url: window.location.href,
  linkCount: document.querySelectorAll('a').length,
  imageCount: document.querySelectorAll('img').length,
  formCount: document.querySelectorAll('form').length
};
\`\`\`
` : `
### JS脚本模块
- 运行在浏览器环境中（前端执行）
- 支持所有标准JavaScript语法和内置对象（String, Array, Object, Math, Date, JSON等）
- 不支持异步操作(async/await)和DOM操作
- 不支持Node.js模块（如fs, path等）
- 必须定义一个 main(vars) 函数作为入口点
- vars 参数支持读写操作，修改会自动同步回工作流
- main函数的返回值将存储到指定的结果变量中

### 常见用途
1. 数据处理：字符串处理、数组操作、对象转换
2. 数学计算：复杂计算、统计分析
3. 逻辑判断：条件判断、数据验证
4. 数据转换：JSON解析、格式转换
5. 变量操作：读取、修改、计算工作流变量

### 代码示例
\`\`\`javascript
// 示例1：字符串处理
function main(vars) {
  const text = vars.inputText || "";
  const processed = text.trim().toUpperCase();
  vars.outputText = processed;
  return processed.length;
}

// 示例2：数组操作
function main(vars) {
  const numbers = vars.numberList || [];
  const sum = numbers.reduce((a, b) => a + b, 0);
  const avg = sum / numbers.length;
  vars.average = avg;
  return { sum, avg };
}

// 示例3：JSON处理
function main(vars) {
  const jsonStr = vars.jsonData || "{}";
  const data = JSON.parse(jsonStr);
  data.timestamp = Date.now();
  vars.processedData = data;
  return JSON.stringify(data);
}

// 示例4：条件判断
function main(vars) {
  const score = vars.score || 0;
  let grade = "F";
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  vars.grade = grade;
  return grade;
}
\`\`\`
`) : `
### Python脚本模块
- 运行在Python 3.13环境中
- 支持所有Python标准库（os, sys, json, re, datetime, math等）
- 支持WebRPA内置的第三方库（requests, pandas, numpy, pillow等）
- 所有工作流变量通过 vars 对象访问（支持读写）
- 可以直接修改 vars 对象的属性，修改会自动同步回工作流
- 使用 return 返回结果数据（可选）
- print() 输出会被捕获到标准输出变量

### 常见用途
1. 文件操作：读写文件、处理路径、批量操作
2. 数据处理：Excel处理、CSV处理、数据清洗
3. 网络请求：API调用、数据抓取
4. 图像处理：图片裁剪、格式转换、添加水印
5. 文本处理：正则匹配、文本分析、编码转换
6. 系统操作：执行命令、环境变量、进程管理

### 可用的常用库
- requests: HTTP请求库
- pandas: 数据分析库
- numpy: 数值计算库
- pillow (PIL): 图像处理库
- openpyxl: Excel操作库
- json: JSON处理
- re: 正则表达式
- datetime: 日期时间处理
- pathlib: 路径操作
- base64: Base64编解码

### 代码示例
\`\`\`python
# 示例1：文件读取
import os
file_path = vars.get("filePath", "")
if os.path.exists(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    vars.fileContent = content
    return len(content)

# 示例2：JSON处理
import json
json_str = vars.get("jsonData", "{}")
data = json.loads(json_str)
data["processed"] = True
vars.processedData = data
return json.dumps(data, ensure_ascii=False)

# 示例3：正则匹配
import re
text = vars.get("text", "")
emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', text)
vars.emailList = emails
return len(emails)

# 示例4：日期时间
from datetime import datetime, timedelta
now = datetime.now()
tomorrow = now + timedelta(days=1)
vars.currentTime = now.strftime("%Y-%m-%d %H:%M:%S")
vars.tomorrowDate = tomorrow.strftime("%Y-%m-%d")
return vars.currentTime

# 示例5：数据统计
numbers = vars.get("numbers", [])
if numbers:
    total = sum(numbers)
    avg = total / len(numbers)
    max_val = max(numbers)
    min_val = min(numbers)
    vars.statistics = {
        "total": total,
        "average": avg,
        "max": max_val,
        "min": min_val
    }
    return vars.statistics
\`\`\`
`}

## 代码要求
1. 代码必须简洁、高效、易读
2. 添加必要的注释说明关键逻辑
3. 处理可能的异常情况（使用try-except或条件判断）
4. 充分利用工作流中已有的变量
5. 返回有意义的结果数据
6. 遵循最佳实践和编码规范

## 当前代码
${currentCode ? `用户当前的代码：
\`\`\`${language}
${currentCode}
\`\`\`
` : '(用户还没有编写任何代码)'}

# 你的任务
根据用户的需求描述，生成完整的${languageName}代码。
只返回代码本身，不要包含任何解释文字或markdown代码块标记。
代码应该可以直接运行，无需任何修改。`
  }
  // @i18n-ignore-end

  // 调用AI API生成代码
  const generateCode = async () => {
    if (!userPrompt.trim()) {
      setError('请输入您的需求描述')
      return
    }

    // 检查AI配置
    if (!globalConfig.ai.apiUrl) {
      setError('请先在全局配置中设置AI API地址')
      return
    }

    if (!globalConfig.ai.model) {
      setError('请先在全局配置中设置AI模型')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const systemPrompt = buildSystemPrompt()
      
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const requestBody = {
        model: globalConfig.ai.model,
        messages: messages,
        temperature: globalConfig.ai.temperature || 0.7,
        max_tokens: globalConfig.ai.maxTokens || 2000,
        stream: false
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (globalConfig.ai.apiKey) {
        headers['Authorization'] = `Bearer ${globalConfig.ai.apiKey}`
      }

      const response = await fetch(globalConfig.ai.apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API请求失败 (${response.status}): ${errorText}`)
      }

      const result = await response.json()
      
      let generatedCode = ''
      
      // 尝试解析OpenAI格式
      if (result.choices && result.choices.length > 0) {
        generatedCode = result.choices[0].message?.content || ''
      } 
      // 尝试解析Ollama格式
      else if (result.message) {
        generatedCode = result.message.content || ''
      }
      // 尝试解析NDJSON格式（Ollama流式响应）
      else {
        const responseText = await response.text()
        const lines = responseText.trim().split('\n')
        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line)
              if (chunk.message?.content) {
                generatedCode += chunk.message.content
              }
              if (chunk.done) break
            } catch {
              continue
            }
          }
        }
      }

      if (!generatedCode) {
        throw new Error('AI返回的代码为空')
      }

      // 清理代码（移除可能的markdown代码块标记）
      generatedCode = generatedCode
        .replace(/^```(?:javascript|python|js|py)?\n?/gm, '')
        .replace(/\n?```$/gm, '')
        .trim()

      // 将生成的代码传递给父组件
      onCodeGenerated(generatedCode)
      
      // 关闭对话框
      setIsOpen(false)
      setUserPrompt('')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成代码失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* 触发按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-[hsl(var(--brand-600))] inline-flex items-center gap-2 px-4 h-9 text-white rounded-lg transition-all shadow-md hover:shadow-lg"
        title="使用AI生成代码"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">AI编码助手</span>
      </button>

      {/* AI助手对话框 */}
      {isOpen && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 rounded-2xl" style={{ zIndex: 2147483646 }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="bg-[hsl(var(--card))] flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  AI编码助手 - {language === 'javascript' ? 'JavaScript' : 'Python'}
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/50 rounded-lg transition-colors has-hover-only"
                disabled={isLoading}
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 变量信息提示 */}
              {variables.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">
                    当前工作流中的变量：
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-2">
                    {variables.map(v => (
                      <div key={v.name} className="text-xs text-blue-700 font-mono">
                        <span className="font-semibold">{v.name}</span>
                        <span className="text-blue-500"> : </span>
                        <span className="text-blue-600">{typeof v.value}</span>
                        <span className="text-blue-500"> = </span>
                        <span className="text-blue-800">{JSON.stringify(v.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 使用说明 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-800 mb-2">
                  使用说明：
                </p>
                <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                  <li>描述您想要实现的功能，AI会自动生成代码</li>
                  <li>AI会自动使用工作流中已有的变量</li>
                  <li>生成的代码会自动填充到编辑器中</li>
                  <li>您可以在生成后继续修改代码</li>
                </ul>
              </div>

              {/* 输入框 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  描述您的需求：
                </label>
                <textarea
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={`例如：${language === 'javascript' 
                    ? '计算两个数字的和并返回结果' 
                    : '读取文件内容并统计行数'}`}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none text-sm"
                  disabled={isLoading}
                />
              </div>

              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors has-hover-only"
                disabled={isLoading}
              >
                取消
              </button>
              <button
                onClick={generateCode}
                disabled={isLoading || !userPrompt.trim()}
                className="bg-[hsl(var(--brand-600))] inline-flex items-center gap-2 px-6 py-2 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>生成代码</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
