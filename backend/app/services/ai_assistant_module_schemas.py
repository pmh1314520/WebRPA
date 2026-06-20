"""模块配置 schema 速查表（给 AI 参考）

为每个 module_type 列出：
- required: 必填字段（列表）
- optional: 推荐配置字段（列表）
- defaults: 默认值（dict，AI 没填时后端会自动补）
- desc: 字段中文说明（dict）
- example: 一个完整的 config 配置样例
- combo: 经常和它搭配的下一个/上一个模块（让 AI 知道怎么联动）

数据来源：基于 frontend/src/store/workflowStore.ts 的 addNode defaultData
+ frontend/src/components/workflow/config-panels/*.tsx 的实际字段
+ backend/app/executors/*.py 的实现
"""
from __future__ import annotations

# 字段说明：
#   selector  CSS / XPath 选择器（点击/输入/获取数据等模块都用）
#   url       网页地址
#   timeout   超时秒数（默认值取自 store；用户配置高级配置时是毫秒）

# 浏览器 / 网页操作 ============================================================

BROWSER_SCHEMAS: dict = {
    "open_page": {
        "required": ["url"],
        "optional": ["timeout", "headless"],
        "defaults": {},
        "desc": {
            "url": "要打开的网页 URL",
            "timeout": "页面加载超时（秒），默认 30",
            "headless": "是否无头模式（在工具栏选有头/无头时使用）",
        },
        "example": {"url": "https://www.baidu.com"},
        "combo": "通常作为工作流第一步；后接 wait_page_load / click_element / input_text",
    },
    "use_opened_page": {
        "required": [],
        "optional": ["urlMatch"],
        "defaults": {},
        "desc": {"urlMatch": "可选：URL 包含此字符串的页面才会被使用"},
        "example": {},
        "combo": "替代 open_page，连接到用户已经打开的浏览器页面",
    },
    "click_element": {
        "required": ["selector"],
        "optional": ["timeout", "doubleClick"],
        "defaults": {},
        "desc": {
            "selector": "CSS 选择器或 XPath，例如 #search-btn 或 .submit",
            "timeout": "等待元素出现的超时（秒）",
            "doubleClick": "是否双击",
        },
        "example": {"selector": "#kw"},
        "combo": "前序通常是 wait_element 或 input_text；后接 wait_page_load",
    },
    "input_text": {
        "required": ["selector", "text"],
        "optional": ["clear", "delay"],
        "defaults": {"clear": True},
        "desc": {
            "selector": "输入框的 CSS / XPath 选择器",
            "text": "要输入的文本，可用 {变量名} 引用变量",
            "clear": "输入前是否先清空（默认 true）",
            "delay": "每个字符的间隔毫秒",
        },
        "example": {"selector": "#kw", "text": "WebRPA"},
        "combo": "通常前面 wait_element，后面 click_element 提交",
    },
    "hover_element": {
        "required": ["selector"],
        "optional": ["timeout"],
        "defaults": {},
        "desc": {"selector": "CSS / XPath 选择器", "timeout": "等待超时秒"},
        "example": {"selector": ".menu-item"},
        "combo": "悬停后下拉菜单出现，再 click_element 触发菜单项",
    },
    "select_dropdown": {
        "required": ["selector"],
        "optional": ["value", "label", "index"],
        "defaults": {},
        "desc": {"selector": "<select> 选择器", "value": "按 value 选", "label": "按显示文本选", "index": "按索引选"},
        "example": {"selector": "#country", "label": "中国"},
        "combo": "",
    },
    "set_checkbox": {
        "required": ["selector", "checked"],
        "optional": [],
        "defaults": {"checked": True},
        "desc": {"selector": "复选框选择器", "checked": "true=勾选，false=取消"},
        "example": {"selector": "#agree", "checked": True},
        "combo": "",
    },
    "scroll_page": {
        "required": [],
        "optional": ["direction", "distance", "selector"],
        "defaults": {"direction": "down", "distance": 500},
        "desc": {"direction": "up/down/left/right/top/bottom", "distance": "像素", "selector": "可选：滚动到指定元素"},
        "example": {"direction": "down", "distance": 800},
        "combo": "动态加载页面常用，后接 wait_element 等新内容出现",
    },
    "wait": {
        "required": ["seconds"],
        "optional": [],
        "defaults": {"seconds": 1},
        "desc": {"seconds": "等待秒数"},
        "example": {"seconds": 2},
        "combo": "调试用；生产环境优先用 wait_element / wait_page_load",
    },
    "wait_element": {
        "required": ["selector"],
        "optional": ["timeout", "state"],
        "defaults": {"timeout": 10, "state": "visible"},
        "desc": {
            "selector": "等待出现的元素选择器",
            "timeout": "最大等待秒数",
            "state": "visible/attached/hidden/detached",
        },
        "example": {"selector": ".result-list", "timeout": 15},
        "combo": "比 wait 更可靠，建议替代 wait",
    },
    "wait_page_load": {
        "required": [],
        "optional": ["timeout", "state"],
        "defaults": {"timeout": 30, "state": "load"},
        "desc": {"timeout": "最大等待秒", "state": "load/domcontentloaded/networkidle"},
        "example": {"timeout": 30},
        "combo": "open_page / click_element 之后保险等加载完",
    },
    "refresh_page": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "go_back": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": ""},
    "go_forward": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": ""},
    "close_page": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": "工作流末尾常用"},
    "switch_tab": {
        "required": [],
        "optional": ["index", "urlMatch"],
        "defaults": {},
        "desc": {"index": "按索引切（0 是第一个标签）", "urlMatch": "按 URL 包含切"},
        "example": {"index": 1},
        "combo": "",
    },
    "switch_iframe": {
        "required": ["selector"],
        "optional": [],
        "defaults": {},
        "desc": {"selector": "iframe 元素选择器"},
        "example": {"selector": "iframe[name='login']"},
        "combo": "进入 iframe 后才能操作里面的元素，结束后用 switch_to_main 退出",
    },
    "switch_to_main": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": "退出 iframe 回到主页面"},
    "inject_javascript": {
        "required": ["script"],
        "optional": ["saveResult"],
        "defaults": {"saveResult": "js_result"},
        "desc": {
            "script": "JS 代码，return 的值会保存到 saveResult 变量",
            "saveResult": "结果变量名",
        },
        "example": {"script": "return document.title", "saveResult": "page_title"},
        "combo": "拿不到页面信息时的万能方案",
    },
    "handle_dialog": {
        "required": ["action"],
        "optional": ["text"],
        "defaults": {"action": "accept"},
        "desc": {"action": "accept/dismiss", "text": "如果是 prompt 框，要输入的文本"},
        "example": {"action": "accept"},
        "combo": "open_page 之前先 handle_dialog 防止弹框卡住",
    },
    "upload_file": {
        "required": ["selector", "filePath"],
        "optional": [],
        "defaults": {},
        "desc": {"selector": "<input type=file> 选择器", "filePath": "本地文件绝对路径"},
        "example": {"selector": "#fileInput", "filePath": "C:\\\\file.pdf"},
        "combo": "",
    },
    "screenshot": {
        "required": [],
        "optional": ["fileName", "selector", "fullPage", "variableName"],
        "defaults": {"variableName": "screenshot_path", "fullPage": False},
        "desc": {
            "fileName": "保存的文件名（可选，默认按时间戳）",
            "selector": "可选：只截某个元素",
            "fullPage": "是否截整个页面（含滚动区）",
            "variableName": "保存截图路径到变量",
        },
        "example": {"fullPage": True, "variableName": "page_shot"},
        "combo": "",
    },
    "get_element_info": {
        "required": ["selector"],
        "optional": ["attribute", "variableName", "multiple"],
        "defaults": {"variableName": "element_value", "attribute": "text", "multiple": False},
        "desc": {
            "selector": "目标元素选择器",
            "attribute": "text(默认)/value/href/src/innerHTML/data-xxx 等任意属性",
            "multiple": "true=匹配所有元素返回数组",
            "variableName": "结果变量",
        },
        "example": {"selector": ".title", "attribute": "text", "variableName": "page_title"},
        "combo": "数据采集核心，配合 foreach 遍历列表",
    },
    "extract_table_data": {
        "required": ["selector"],
        "optional": ["resultVariable", "headerRow"],
        "defaults": {"resultVariable": "table_data", "headerRow": True},
        "desc": {
            "selector": "<table> 元素选择器",
            "headerRow": "第一行是否表头",
            "resultVariable": "结果变量（数组）",
        },
        "example": {"selector": "table.data-list", "resultVariable": "rows"},
        "combo": "后接 foreach 遍历每行",
    },
    "download_file": {
        "required": ["url"],
        "optional": ["savePath", "fileName", "resultVariable"],
        "defaults": {"resultVariable": "downloaded_path"},
        "desc": {"url": "文件 URL", "savePath": "保存目录", "fileName": "文件名"},
        "example": {"url": "{file_url}", "savePath": "D:\\\\Downloads"},
        "combo": "",
    },
    "drag_element": {
        "required": ["sourceSelector", "targetSelector"],
        "optional": [],
        "defaults": {},
        "desc": {"sourceSelector": "起点元素", "targetSelector": "终点元素"},
        "example": {"sourceSelector": ".item", "targetSelector": ".target"},
        "combo": "",
    },
}

# 流程控制 ====================================================================

CONTROL_SCHEMAS: dict = {
    "condition": {
        "required": ["operator"],
        "optional": ["leftValue", "rightValue"],
        "defaults": {"operator": "equals"},
        "desc": {
            "operator": "equals/not_equals/greater/less/contains/starts_with/ends_with/regex_match/is_empty/is_not_empty",
            "leftValue": "左值（可用变量 {var}）",
            "rightValue": "右值",
        },
        "example": {"leftValue": "{count}", "operator": "greater", "rightValue": "10"},
        "combo": "有 2 个出口：true 走「是」分支，false 走「否」分支",
    },
    "assert_checkpoint": {
        "required": ["checkType"],
        "optional": ["operator", "actualValue", "expectedValue", "selector", "elementCheck", "expectedText", "expression", "onFail", "message", "variableName"],
        "defaults": {"checkType": "variable", "operator": "==", "onFail": "stop"},
        "desc": {
            "checkType": "variable(变量比较)/element(页面元素)/expression(表达式真值)",
            "operator": "checkType=variable 时：==/!=/contains/not_contains/startswith/endswith/matches/>/</>=/<=/isEmpty/isNotEmpty",
            "actualValue": "checkType=variable 的实际值（可用 {变量}）",
            "expectedValue": "checkType=variable 的期望值",
            "selector": "checkType=element 的元素选择器",
            "elementCheck": "checkType=element 时：exists/not_exists/visible/hidden/text_contains/text_equals",
            "expectedText": "elementCheck 为文本检查时的期望文本",
            "expression": "checkType=expression 的表达式（解析后判断真值）",
            "onFail": "失败处理：stop(中断)/warn(警告继续)/continue(静默跳过)",
            "variableName": "存储断言结果布尔值",
        },
        "example": {"checkType": "variable", "actualValue": "{order_no}", "operator": "isNotEmpty", "onFail": "stop", "message": "订单号必须存在"},
        "combo": "流程稳定性：关键步骤后插入断言；onFail=stop 失败即中断，配合 variableName 存结果后接 condition 分流",
    },
    "loop": {
        "required": ["loopType"],
        "optional": ["loopCount", "indexVariable"],
        "defaults": {"loopType": "count", "loopCount": "10", "indexVariable": "index"},
        "desc": {
            "loopType": "count(固定次数)/while(条件循环)",
            "loopCount": "循环次数",
            "indexVariable": "当前索引变量名",
        },
        "example": {"loopType": "count", "loopCount": "5", "indexVariable": "i"},
        "combo": "loop → 循环体节点 → break_loop / continue_loop / 结束",
    },
    "foreach": {
        "required": ["listVariable"],
        "optional": ["itemVariable", "indexVariable"],
        "defaults": {"itemVariable": "item", "indexVariable": "index"},
        "desc": {
            "listVariable": "要遍历的变量名（不带 {}）",
            "itemVariable": "当前项变量名",
            "indexVariable": "当前索引变量名",
        },
        "example": {"listVariable": "rows", "itemVariable": "row", "indexVariable": "i"},
        "combo": "和 extract_table_data / get_element_info(multiple=true) 配合最常见",
    },
    "foreach_dict": {
        "required": ["dictVariable"],
        "optional": ["keyVariable", "valueVariable"],
        "defaults": {"keyVariable": "key", "valueVariable": "value"},
        "desc": {"dictVariable": "字典变量名", "keyVariable": "键变量", "valueVariable": "值变量"},
        "example": {"dictVariable": "user_info"},
        "combo": "",
    },
    "break_loop": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": "在 loop/foreach 中跳出"},
    "continue_loop": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": "跳过当前迭代"},
    "stop_workflow": {"required": [], "optional": ["reason"], "defaults": {}, "desc": {"reason": "停止原因"}, "example": {}, "combo": ""},
    "subflow": {
        "required": ["subflowName"],
        "optional": ["parameterValues"],
        "defaults": {},
        "desc": {"subflowName": "子流程名", "parameterValues": "传入的参数（dict）"},
        "example": {"subflowName": "登录流程"},
        "combo": "复用工作流的关键，把重复逻辑做成子流程",
    },
}

# 变量 / 数据 =================================================================

DATA_SCHEMAS: dict = {
    "set_variable": {
        "required": ["variableName", "value"],
        "optional": ["variableType"],
        "defaults": {"variableName": "my_var", "variableType": "string"},
        "desc": {
            "variableName": "变量名",
            "value": "值（可用 {其他变量} 引用）",
            "variableType": "string/number/boolean/array/object",
        },
        "example": {"variableName": "user_name", "value": "张三"},
        "combo": "",
    },
    "increment_decrement": {
        "required": ["variableName", "operation"],
        "optional": ["step"],
        "defaults": {"operation": "increment", "step": "1"},
        "desc": {"operation": "increment/decrement", "step": "步长"},
        "example": {"variableName": "count", "operation": "increment", "step": "1"},
        "combo": "",
    },
    "json_parse": {
        "required": ["jsonText"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "parsed_json"},
        "desc": {"jsonText": "JSON 字符串（常用 {api_response} 引用）", "resultVariable": "结果变量"},
        "example": {"jsonText": "{api_response}", "resultVariable": "data"},
        "combo": "通常 api_request 之后立即 json_parse",
    },
    "base64": {
        "required": ["operation", "input"],
        "optional": ["resultVariable"],
        "defaults": {"operation": "encode", "resultVariable": "base64_result"},
        "desc": {"operation": "encode/decode", "input": "输入"},
        "example": {"operation": "encode", "input": "{file_content}"},
        "combo": "",
    },
    "random_number": {
        "required": [],
        "optional": ["min", "max", "isFloat", "variableName"],
        "defaults": {"min": "1", "max": "100", "isFloat": False, "variableName": "random_num"},
        "desc": {"min": "最小值", "max": "最大值", "isFloat": "是否浮点", "variableName": "结果变量"},
        "example": {"min": "1", "max": "9999"},
        "combo": "",
    },
    "get_time": {
        "required": [],
        "optional": ["format", "variableName"],
        "defaults": {"format": "YYYY-MM-DD HH:mm:ss", "variableName": "current_time"},
        "desc": {"format": "时间格式串", "variableName": "结果变量"},
        "example": {"format": "YYYY-MM-DD"},
        "combo": "",
    },
    "regex_extract": {
        "required": ["text", "pattern"],
        "optional": ["mode", "groupIndex", "resultVariable"],
        "defaults": {"mode": "first", "groupIndex": 0, "resultVariable": "regex_result"},
        "desc": {"text": "源文本", "pattern": "正则表达式", "mode": "first/all/match", "groupIndex": "捕获组索引"},
        "example": {"text": "{html}", "pattern": "<h1>(.+?)</h1>", "groupIndex": 1},
        "combo": "",
    },
    "string_replace": {
        "required": ["text", "search", "replace"],
        "optional": ["resultVariable", "useRegex"],
        "defaults": {"useRegex": False, "resultVariable": "replace_result"},
        "desc": {"text": "源文本", "search": "查找的内容", "replace": "替换为", "useRegex": "是否当正则"},
        "example": {"text": "{raw}", "search": " ", "replace": ""},
        "combo": "",
    },
    "string_split": {
        "required": ["text", "separator"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "split_result"},
        "desc": {"text": "源文本", "separator": "分隔符"},
        "example": {"text": "{csv_line}", "separator": ","},
        "combo": "后接 foreach 遍历分割结果",
    },
    "string_join": {
        "required": ["listVariable", "separator"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "join_result"},
        "desc": {"listVariable": "列表变量名", "separator": "连接符"},
        "example": {"listVariable": "items", "separator": "、"},
        "combo": "",
    },
    "string_concat": {
        "required": ["values"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "concat_result"},
        "desc": {"values": "要拼接的文本（数组或多个字段）"},
        "example": {"values": ["前缀-", "{name}", "-后缀"]},
        "combo": "",
    },
}

# 数据表 / 列表 ===============================================================

LIST_SCHEMAS: dict = {
    "list_operation": {
        "required": ["listVariable", "operation"],
        "optional": ["item", "index", "resultVariable"],
        "defaults": {"resultVariable": "list_result"},
        "desc": {"listVariable": "列表变量", "operation": "append/prepend/insert/remove/reverse/clear", "item": "项", "index": "插入索引"},
        "example": {"listVariable": "items", "operation": "append", "item": "{new_item}"},
        "combo": "",
    },
    "list_get": {
        "required": ["listVariable", "index"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "list_item"},
        "desc": {"listVariable": "列表变量", "index": "下标（0-based，-1 = 最后一个）"},
        "example": {"listVariable": "rows", "index": "0"},
        "combo": "",
    },
    "list_length": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "list_len"},
        "desc": {"listVariable": "列表变量"},
        "example": {"listVariable": "rows"},
        "combo": "",
    },
    "dict_operation": {
        "required": ["dictVariable", "operation"],
        "optional": ["key", "value", "resultVariable"],
        "defaults": {"resultVariable": "dict_result"},
        "desc": {"operation": "set/delete/clear/merge"},
        "example": {"dictVariable": "user", "operation": "set", "key": "name", "value": "Tom"},
        "combo": "",
    },
    "dict_get": {
        "required": ["dictVariable", "key"],
        "optional": ["resultVariable", "defaultValue"],
        "defaults": {"resultVariable": "dict_value"},
        "desc": {"defaultValue": "key 不存在时返回的兜底值"},
        "example": {"dictVariable": "user", "key": "name"},
        "combo": "",
    },
    "dict_keys": {
        "required": ["dictVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "dict_keys"},
        "desc": {},
        "example": {"dictVariable": "user"},
        "combo": "后接 foreach 遍历键",
    },
    "table_add_row": {
        "required": ["rowData"],
        "optional": [],
        "defaults": {},
        "desc": {
            "rowData": "**JSON 字符串格式**！不要传 dict 直接 stringify，必须是 JSON 字符串。"
                       "键为列名，值为单元格内容，可以用 `{变量}` 引用工作流变量。"
                       "示例：'{\"姓名\":\"{name}\",\"年龄\":\"{age}\"}'",
        },
        "example": {"rowData": "{\"姓名\":\"{name}\",\"年龄\":\"{age}\",\"城市\":\"北京\"}"},
        "combo": "数据采集时常用，工作流末尾用 table_export 导出 Excel",
    },
    "table_add_column": {
        "required": ["columnName"],
        "optional": ["defaultValue"],
        "defaults": {"defaultValue": ""},
        "desc": {
            "columnName": "列名（字符串）",
            "defaultValue": "新增列的默认值，可以用 `{变量}` 引用工作流变量",
        },
        "example": {"columnName": "排名", "defaultValue": ""},
        "combo": "",
    },
    "table_export": {
        "required": ["savePath"],
        "optional": ["exportFormat", "fileNamePattern", "sheetName", "variableName"],
        "defaults": {"exportFormat": "excel", "sheetName": "数据"},
        "desc": {
            "savePath": "导出目录绝对路径（不是文件路径！只是目录），示例 D:\\\\Reports\\\\",
            "exportFormat": "导出格式：'excel' / 'csv' / 'json'，默认 excel",
            "fileNamePattern": "可选文件名模式，支持 {date}/{time}/{timestamp} 占位符，示例 'report_{date}'",
            "sheetName": "Excel sheet 名称，默认'数据'",
            "variableName": "可选，把生成的完整路径存到此变量",
        },
        "example": {"savePath": "D:\\\\Reports\\\\", "exportFormat": "excel", "fileNamePattern": "热榜_{date}"},
        "combo": "工作流末尾把采集到的数据落盘",
    },
}

# AI / 网络 ===================================================================

AI_NET_SCHEMAS: dict = {
    "ai_chat": {
        "required": ["userPrompt"],
        "optional": ["apiUrl", "apiKey", "model", "systemPrompt", "temperature", "maxTokens", "variableName"],
        "defaults": {"temperature": 0.7, "maxTokens": 2000, "variableName": "ai_response"},
        "desc": {
            "userPrompt": "用户提示词，可用 {var} 引用",
            "systemPrompt": "系统提示词（角色设定）",
            "apiUrl/apiKey/model": "通常已在全局配置预填，留空即可",
            "variableName": "保存 AI 回复的变量",
        },
        "example": {"userPrompt": "总结这段：{content}", "variableName": "summary"},
        "combo": "前接 get_element_info 拿到内容；后接 set_variable / table_add_row 落盘",
    },
    "ai_vision": {
        "required": ["userPrompt", "imageSource"],
        "optional": ["imageSelector", "imageUrl", "imageVariable", "model", "variableName", "maxTokens"],
        "defaults": {"imageSource": "element", "variableName": "vision_result", "maxTokens": 1000},
        "desc": {
            "imageSource": "element/screenshot/url/variable",
            "imageSelector": "imageSource=element 时填",
            "imageUrl": "imageSource=url 时填",
            "imageVariable": "imageSource=variable 时填",
            "userPrompt": "对图片提问",
        },
        "example": {"imageSource": "screenshot", "userPrompt": "图片中有几个人？"},
        "combo": "和 screenshot 配合：先截屏再问 AI",
    },
    "api_request": {
        "required": ["url", "method"],
        "optional": ["headers", "body", "params", "resultVariable", "timeout"],
        "defaults": {"method": "GET", "resultVariable": "api_response", "timeout": 30},
        "desc": {
            "method": "GET/POST/PUT/DELETE/PATCH",
            "headers": "请求头（dict）",
            "body": "请求体（JSON 字符串）",
            "params": "查询参数（dict）",
        },
        "example": {"url": "https://api.example.com/data", "method": "GET", "resultVariable": "data"},
        "combo": "后通常接 json_parse 解析返回",
    },
    "send_email": {
        "required": ["to", "subject", "body"],
        "optional": ["senderEmail", "authCode", "smtpServer", "smtpPort", "attachments", "isHtml"],
        "defaults": {"isHtml": False, "smtpPort": 465},
        "desc": {"to": "收件人", "subject": "标题", "body": "正文", "attachments": "附件路径数组"},
        "example": {"to": "user@example.com", "subject": "测试", "body": "Hello"},
        "combo": "全局配置已预填发件人时只需 to/subject/body",
    },
    "read_excel": {
        "required": ["filePath"],
        "optional": ["sheetName", "resultVariable"],
        "defaults": {"resultVariable": "excel_data"},
        "desc": {"filePath": "Excel 文件路径", "sheetName": "Sheet 名（不填取第一个）"},
        "example": {"filePath": "D:\\\\data.xlsx", "resultVariable": "rows"},
        "combo": "后接 foreach 遍历每行",
    },
    "run_command": {
        "required": ["command"],
        "optional": ["resultVariable", "timeout", "shell"],
        "defaults": {"resultVariable": "cmd_output", "timeout": 60, "shell": True},
        "desc": {"command": "命令字符串", "shell": "是否走 shell"},
        "example": {"command": "dir D:\\\\", "resultVariable": "files_list"},
        "combo": "",
    },
    "js_script": {
        "required": ["code"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "js_result"},
        "desc": {"code": "JavaScript 代码（return 的值会保存到 resultVariable）"},
        "example": {"code": "return Math.max({a}, {b})", "resultVariable": "result"},
        "combo": "",
    },
    "python_script": {
        "required": ["scriptContent"],
        "optional": ["resultVariable", "scriptMode", "useBuiltinPython", "timeout", "stdoutVariable", "stderrVariable", "returnCodeVariable"],
        "defaults": {
            "scriptMode": "content",
            "useBuiltinPython": True,
            "timeout": 60,
            "resultVariable": "python_result",
        },
        "desc": {
            "scriptContent": (
                "Python 代码字符串。**重要规则**:"
                "(1) 用户代码会被自动包装在 `def _user_script():` 函数里,所以可以也建议使用 `return 值` 把结果回传给 resultVariable;"
                "(2) 想读取上游工作流变量,**必须用 `vars.变量名`**(例如 `vars.user_input` 而不是直接 `user_input`);"
                "(3) 想写入工作流变量,直接 `vars.变量名 = 值`(脚本结束后整套 vars 会自动 sync 回工作流);"
                "(4) 不要写 import 在脚本最顶层用问题,一切照常。"
            ),
            "resultVariable": "脚本 return 的值会写入这个工作流变量,后续节点用 {resultVariable} 引用",
            "scriptMode": "content(直接写代码) 或 file(从文件读取)",
            "useBuiltinPython": "True 用内置 Python313;False 用系统 Python",
            "timeout": "超时秒数",
            "stdoutVariable": "标准输出 print() 的内容写入此变量",
            "stderrVariable": "stderr 内容写入此变量",
            "returnCodeVariable": "进程返回码写入此变量",
        },
        "example": {
            "scriptContent": "import math\nn = int(vars.user_input)\nreturn math.factorial(n)",
            "resultVariable": "factorial_result",
            "scriptMode": "content",
            "useBuiltinPython": True,
            "timeout": 60,
        },
        "combo": "前置 input_prompt 用 variableName=user_input 拿用户输入,脚本内 `vars.user_input` 取值,return 后由 resultVariable 接收;后置 print_log 用 logMessage='结果 = {factorial_result}' 显示",
    },
    "click_image": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "resultVariable"],
        "defaults": {"confidence": 0.8, "timeout": 10},
        "desc": {"imagePath": "目标图片路径", "confidence": "匹配阈值 0~1"},
        "example": {"imagePath": "D:\\\\btn.png", "confidence": 0.85},
        "combo": "桌面自动化常用，找不到 selector 时用",
    },
    "ocr_captcha": {
        "required": ["imageSource"],
        "optional": ["imageSelector", "imagePath", "resultVariable"],
        "defaults": {"imageSource": "element", "resultVariable": "captcha_text"},
        "desc": {"imageSource": "element/path/screenshot"},
        "example": {"imageSource": "element", "imageSelector": "#captcha"},
        "combo": "前接验证码图片定位，后接 input_text 填入",
    },
}

# 实用工具 ====================================================================

UTIL_SCHEMAS: dict = {
    "print_log": {
        "required": ["logMessage"],
        "optional": ["logLevel"],
        "defaults": {"logLevel": "info"},
        "desc": {
            "logMessage": "日志正文,可用 {var_name} 引用上游变量,例如 '阶乘 = {factorial_result}'",
            "logLevel": "info / warning / error / success / debug",
        },
        "example": {"logMessage": "处理到第 {i} 项: {item}", "logLevel": "info"},
        "combo": "调试必备,几乎每一步重要操作后都要 print_log",
    },
    "input_prompt": {
        "required": ["variableName"],
        "optional": ["promptTitle", "promptMessage", "defaultValue", "inputMode", "minValue", "maxValue", "maxLength", "required", "selectOptions"],
        "defaults": {
            "promptTitle": "请输入",
            "promptMessage": "请输入值:",
            "inputMode": "single",
            "required": True,
        },
        "desc": {
            "variableName": "**必填**:输入值会存到这个变量名,后续节点用 {variableName} 引用",
            "promptTitle": "弹窗标题",
            "promptMessage": "弹窗正文(提示用户该输入什么)",
            "inputMode": "single(单行文本) / multiline(多行) / number(数字) / integer(整数) / password / list(每行一项的列表) / file / folder / checkbox / slider_int / slider_float / select_single / select_multiple",
            "defaultValue": "默认填入值",
            "minValue": "数字/滑动条模式下的最小值",
            "maxValue": "数字/滑动条模式下的最大值",
            "selectOptions": "select_single/select_multiple 模式的选项数组",
        },
        "example": {
            "variableName": "user_input",
            "promptTitle": "输入数字",
            "promptMessage": "请输入要计算阶乘的非负整数",
            "inputMode": "integer",
            "minValue": 0,
            "maxValue": 100,
        },
        "combo": "工作流第一步常用,让用户输入参数。下游节点用 {variableName}(本例中是 {user_input}) 引用输入值",
    },
    "system_notification": {
        "required": ["title", "message"],
        "optional": ["icon", "duration"],
        "defaults": {},
        "desc": {"title": "标题", "message": "正文", "icon": "info/success/warning/error"},
        "example": {"title": "完成", "message": "工作流已运行完毕"},
        "combo": "工作流末尾通知用户结束",
    },
    "play_sound": {
        "required": ["soundFile"],
        "optional": ["volume"],
        "defaults": {"volume": 100},
        "desc": {"soundFile": "音频路径或 system:beep"},
        "example": {"soundFile": "system:beep"},
        "combo": "",
    },
    "set_clipboard": {
        "required": ["content"],
        "optional": [],
        "defaults": {},
        "desc": {"content": "要复制的内容（可用 {var}）"},
        "example": {"content": "{result}"},
        "combo": "",
    },
    "get_clipboard": {
        "required": [],
        "optional": ["variableName"],
        "defaults": {"variableName": "clipboard_content"},
        "desc": {},
        "example": {"variableName": "txt"},
        "combo": "",
    },
}

# 合并所有 schema
_ALL_SCHEMAS: dict[str, dict] = {}
for source in [BROWSER_SCHEMAS, CONTROL_SCHEMAS, DATA_SCHEMAS, LIST_SCHEMAS, AI_NET_SCHEMAS, UTIL_SCHEMAS]:
    _ALL_SCHEMAS.update(source)


def get_module_schema(module_type: str) -> dict | None:
    """查询某个模块的 schema（必填 / 可选 / 默认值 / 字段说明 / 例子 / 联动）"""
    return _ALL_SCHEMAS.get(module_type)


def get_all_module_schemas() -> dict[str, dict]:
    """返回所有内置 schema"""
    return dict(_ALL_SCHEMAS)


def effective_required(module_type: str, data: dict | None = None) -> list[str]:
    """计算某模块在「当前配置」下真正生效的必填字段。

    支持多模式模块（如 real_keyboard：inputType=text 才需要 text，=key 才需要 key）：
    schema 里可定义 conditional_required = {field, default, map}，根据判别字段的取值
    追加该模式下才必填的字段。data 为空时按 default 取值。
    """
    schema = _ALL_SCHEMAS.get(module_type)
    if not schema:
        return []
    req = list(schema.get("required") or [])
    cond = schema.get("conditional_required")
    if isinstance(cond, dict):
        field = cond.get("field")
        cmap = cond.get("map") or {}
        default = cond.get("default")
        val = None
        if data is not None and field:
            val = data.get(field)
        if val in (None, ""):
            val = default
        for f in (cmap.get(val) or []):
            if f not in req:
                req.append(f)
    return req


def conditional_required_map() -> dict[str, dict]:
    """导出所有带「条件必填」的模块规则，供前端按当前配置评估。"""
    out: dict[str, dict] = {}
    for mtype, schema in _ALL_SCHEMAS.items():
        cond = schema.get("conditional_required") if isinstance(schema, dict) else None
        if isinstance(cond, dict) and cond.get("map"):
            # 条件必填字段若已有默认值，执行时会自动补全，不应提示"未填写"
            defaults = schema.get("defaults") or {}
            raw_map = cond.get("map") or {}
            filtered_map = {
                k: [f for f in (v or []) if f not in defaults]
                for k, v in raw_map.items()
            }
            out[mtype] = {
                "field": cond.get("field"),
                "default": cond.get("default"),
                "map": filtered_map,
            }
    return out


def apply_default_config(module_type: str, user_config: dict | None = None) -> dict:
    """合并 schema 默认值 + 用户传的 config，用户值优先

    特殊处理：
    - 字段名归一化：AI 经常传错字段名（如 timeout → waitTimeout, message → logMessage），
      自动按白名单纠正
    - JSON 字符串字段：AI 传 dict / list 自动序列化为 JSON 字符串
    - 单位归一化：AI 传 timeout=15000（毫秒）但后端要秒，自动转换
    - 枚举归一化：AI 传 'xlsx' 但后端要 'excel'，自动转换
    """
    user = dict(user_config or {})
    # 第 1 步：先把用户传入的别名归一化为后端字段名
    _rename_aliases(module_type, user)
    # 第 2 步：用 schema 默认值兜底（用户已传的字段不动）
    schema = _ALL_SCHEMAS.get(module_type)
    if schema:
        defaults = schema.get("defaults") or {}
        for k, v in defaults.items():
            user.setdefault(k, v)
    # 第 3 步：自动 JSON 字符串化
    _auto_jsonify_fields(module_type, user)
    # 第 4 步：单位归一化
    _normalize_units(module_type, user)
    # 第 5 步：枚举值归一化
    _normalize_enum_values(module_type, user)
    return user


# 字段名别名映射（AI 经常写错的字段名 → 实际后端字段名）
_FIELD_ALIASES_BY_MODULE: dict[str, dict[str, str]] = {
    "wait_element": {
        "timeout": "waitTimeout",
        "state": "waitCondition",
    },
    "wait_image": {
        "timeout": "waitTimeout",
    },
    "wait_page_load": {
        "timeout": "pageLoadTimeout",
        "state": "pageLoadState",
    },
    "print_log": {
        "message": "logMessage",
        "level": "logLevel",
        "text": "logMessage",
    },
    "table_add_row": {
        "row": "rowData",
        "data": "rowData",
    },
    "table_add_column": {
        "column": "columnName",
        "name": "columnName",
        "default": "defaultValue",
    },
    "table_set_cell": {
        "row": "rowIndex",
        "column": "columnName",
        "value": "cellValue",
    },
    "table_get_cell": {
        "row": "rowIndex",
        "column": "columnName",
        "result_var": "variableName",
        "resultVariable": "variableName",
    },
    "table_delete_row": {
        "row": "rowIndex",
        "index": "rowIndex",
    },
    "table_export": {
        "filePath": "savePath",
        "path": "savePath",
        "format": "exportFormat",
    },
    "input_prompt": {
        "title": "promptTitle",
        "message": "promptMessage",
        "default": "defaultValue",
        "default_value": "defaultValue",
    },
    "system_notification": {
        "title": "notifyTitle",
        "message": "notifyMessage",
    },
    "open_page": {
        "target_url": "url",
    },
    "click_element": {
        "click_type": "clickType",
    },
    "input_text": {
        "value": "text",
        "content": "text",
    },
    "set_variable": {
        "value": "variableValue",
        "name": "variableName",
        "var_value": "variableValue",
    },
    "get_time": {
        "format": "timeFormat",
    },
    "wait": {
        "duration": "waitDuration",
        "seconds": "waitDuration",
    },
    "api_request": {
        "url": "apiUrl",
        "method": "httpMethod",
    },
}


def _rename_aliases(module_type: str, cfg: dict) -> None:
    """把 cfg 中的别名字段重命名为后端实际字段名。

    例如 wait_element 传了 timeout → 改写成 waitTimeout。
    若两个名字都存在（默认值 + 用户别名），优先用用户传的别名值，
    避免默认值覆盖用户意图。
    """
    aliases = _FIELD_ALIASES_BY_MODULE.get(module_type)
    if not aliases:
        return
    for alias, official in aliases.items():
        if alias in cfg:
            # 用户传了别名 → 始终用别名的值（覆盖 defaults 里的 official）
            cfg[official] = cfg.pop(alias)


# 期望的"秒"字段，但 AI 经常误传毫秒（>1000 视为毫秒）
_SECONDS_FIELDS_BY_MODULE: dict[str, set[str]] = {
    "wait_element": {"waitTimeout"},
    "wait_image": {"waitTimeout"},
    "wait": {"waitDuration"},
    "wait_page_load": {"pageLoadTimeout"},
    "open_page": {"timeout"},
}


def _normalize_units(module_type: str, cfg: dict) -> None:
    """单位归一化：秒字段如果传了 >300 的值（基本不会有 5 分钟以上的等待），
    猜测是毫秒，自动 / 1000。"""
    fields = _SECONDS_FIELDS_BY_MODULE.get(module_type)
    if not fields:
        return
    for f in fields:
        if f not in cfg:
            continue
        try:
            val = float(cfg[f])
            if val > 300:  # 超过 300 秒大概率是毫秒误传
                cfg[f] = int(val / 1000) if val >= 1000 else int(val)
        except (ValueError, TypeError):
            pass


# 枚举值归一化（AI 经常写错的枚举值 → 后端实际值）
_ENUM_NORMALIZE_BY_MODULE: dict[str, dict[str, dict[str, str]]] = {
    "table_export": {
        "exportFormat": {
            "xlsx": "excel",
            "xls": "excel",
            "Excel": "excel",
            "EXCEL": "excel",
            "CSV": "csv",
            "JSON": "json",
        },
    },
    "wait_element": {
        "waitCondition": {
            "exists": "attached",
            "exist": "attached",
            "show": "visible",
            "shown": "visible",
            "hide": "hidden",
            "hide_or_remove": "hidden",
        },
    },
    "print_log": {
        "logLevel": {
            "log": "info",
            "warn": "warning",
            "err": "error",
            "ok": "success",
            "succeed": "success",
        },
    },
}


def _normalize_enum_values(module_type: str, cfg: dict) -> None:
    """枚举值归一化（AI 写错的枚举映射回正确值）。"""
    field_map = _ENUM_NORMALIZE_BY_MODULE.get(module_type)
    if not field_map:
        return
    for field, value_map in field_map.items():
        if field in cfg:
            cur = str(cfg[field])
            if cur in value_map:
                cfg[field] = value_map[cur]


# 后端执行器期望的"JSON 字符串"类字段（不是 dict / list）
# AI 经常会把 dict 直接传过来，前端表单就会显示 [object Object]
# 这里把这些字段自动序列化
_JSONIFY_FIELDS_BY_MODULE: dict[str, set[str]] = {
    "table_add_row": {"rowData"},
    "table_set_cell": {"cellValue"},  # cellValue 也允许复杂结构
    "feishu_bitable_write": {"records"},
    "feishu_sheet_write": {"values"},
    "api_request": {"headers", "body", "queryParams", "params"},
    "webhook_request": {"headers", "body", "queryParams", "params"},
    "send_email": {"attachments"},
}


def _auto_jsonify_fields(module_type: str, cfg: dict) -> None:
    """把指定字段的 dict/list 值自动转成 JSON 字符串。"""
    import json as _json
    fields = _JSONIFY_FIELDS_BY_MODULE.get(module_type)
    if not fields:
        return
    for field in fields:
        if field not in cfg:
            continue
        val = cfg[field]
        # 已是字符串就跳过（即使是 "{...}" 也不动）
        if isinstance(val, (dict, list)):
            try:
                cfg[field] = _json.dumps(val, ensure_ascii=False)
            except Exception:
                # 兜底：转 str
                cfg[field] = str(val)


# ============================================================
# 第二批：文件 / PDF / 媒体 / 加密 / 图像
# ============================================================

FILE_MEDIA_SCHEMAS: dict = {
    # 文件管理
    "list_files": {
        "required": ["folderPath"],
        "optional": ["recursive", "extension", "resultVariable"],
        "defaults": {"recursive": False, "resultVariable": "files_list"},
        "desc": {
            "folderPath": "目标文件夹路径",
            "recursive": "是否递归子文件夹",
            "extension": "只列出指定扩展名（如 .xlsx，留空全部）",
            "resultVariable": "结果变量（数组）",
        },
        "example": {"folderPath": "D:\\\\data", "extension": ".xlsx", "resultVariable": "files"},
        "combo": "后接 foreach 遍历每个文件",
    },
    "copy_file": {
        "required": ["source", "destination"],
        "optional": ["overwrite"],
        "defaults": {"overwrite": True},
        "desc": {"source": "源文件路径", "destination": "目标路径", "overwrite": "是否覆盖已存在文件"},
        "example": {"source": "{file_path}", "destination": "D:\\\\backup\\\\"},
        "combo": "",
    },
    "move_file": {
        "required": ["source", "destination"],
        "optional": ["overwrite"],
        "defaults": {"overwrite": True},
        "desc": {"source": "源", "destination": "目标"},
        "example": {"source": "{file}", "destination": "D:\\\\done\\\\"},
        "combo": "",
    },
    "delete_file": {
        "required": ["path"],
        "optional": [],
        "defaults": {},
        "desc": {"path": "要删除的文件或文件夹路径"},
        "example": {"path": "D:\\\\temp.txt"},
        "combo": "",
    },
    "rename_file": {
        "required": ["path", "newName"],
        "optional": [],
        "defaults": {},
        "desc": {"path": "原文件路径", "newName": "新文件名（不含目录）"},
        "example": {"path": "{old_path}", "newName": "renamed.txt"},
        "combo": "",
    },
    "create_folder": {
        "required": ["folderPath"],
        "optional": [],
        "defaults": {},
        "desc": {"folderPath": "要创建的文件夹路径"},
        "example": {"folderPath": "D:\\\\new_folder"},
        "combo": "",
    },
    "rename_folder": {
        "required": ["oldPath", "newPath"],
        "optional": [],
        "defaults": {},
        "desc": {"oldPath": "原文件夹路径", "newPath": "新文件夹路径"},
        "example": {"oldPath": "D:\\\\a", "newPath": "D:\\\\b"},
        "combo": "",
    },
    "file_exists": {
        "required": ["path"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "file_exists"},
        "desc": {"path": "文件路径"},
        "example": {"path": "{file}", "resultVariable": "ok"},
        "combo": "前置检查，后接 condition 分支",
    },
    "get_file_info": {
        "required": ["path"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "file_info"},
        "desc": {"path": "文件路径"},
        "example": {"path": "{file}"},
        "combo": "返回大小/修改时间/扩展名等",
    },
    "read_text_file": {
        "required": ["path"],
        "optional": ["encoding", "resultVariable"],
        "defaults": {"encoding": "utf-8", "resultVariable": "file_content"},
        "desc": {"path": "文本文件路径", "encoding": "utf-8/gbk/auto"},
        "example": {"path": "D:\\\\readme.txt", "resultVariable": "txt"},
        "combo": "",
    },
    "write_text_file": {
        "required": ["path", "content"],
        "optional": ["encoding", "append"],
        "defaults": {"encoding": "utf-8", "append": False},
        "desc": {"path": "保存路径", "content": "内容", "append": "是否追加"},
        "example": {"path": "D:\\\\out.txt", "content": "{result}"},
        "combo": "",
    },
    "file_hash_compare": {
        "required": ["file1", "file2"],
        "optional": ["algorithm", "resultVariable"],
        "defaults": {"algorithm": "md5", "resultVariable": "hash_compare_result"},
        "desc": {"algorithm": "md5/sha1/sha256"},
        "example": {"file1": "{a}", "file2": "{b}"},
        "combo": "",
    },
    "file_diff_compare": {
        "required": ["file1", "file2"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "diff_compare_result"},
        "desc": {},
        "example": {"file1": "{a}", "file2": "{b}"},
        "combo": "",
    },

    # PDF 处理
    "pdf_extract_text": {
        "required": ["pdfPath"],
        "optional": ["pageRange", "resultVariable"],
        "defaults": {"resultVariable": "pdf_text"},
        "desc": {"pdfPath": "PDF 路径", "pageRange": "页码范围如 1-5（留空全部）"},
        "example": {"pdfPath": "{pdf}", "resultVariable": "txt"},
        "combo": "",
    },
    "pdf_merge": {
        "required": ["pdfPaths", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {"pdfPaths": "PDF 数组（多个文件）", "outputPath": "合并后保存路径"},
        "example": {"pdfPaths": ["a.pdf", "b.pdf"], "outputPath": "D:\\\\merged.pdf"},
        "combo": "",
    },
    "pdf_split": {
        "required": ["pdfPath", "outputDir"],
        "optional": ["pageRanges"],
        "defaults": {},
        "desc": {"pageRanges": "可选：分割段落 [[1,3],[4,6]]"},
        "example": {"pdfPath": "{pdf}", "outputDir": "D:\\\\out"},
        "combo": "",
    },
    "pdf_add_watermark": {
        "required": ["pdfPath", "watermarkText", "outputPath"],
        "optional": ["fontSize", "color", "opacity"],
        "defaults": {"fontSize": 36, "color": "#888888", "opacity": 0.3},
        "desc": {"watermarkText": "水印文字"},
        "example": {"pdfPath": "{pdf}", "watermarkText": "机密", "outputPath": "D:\\\\wm.pdf"},
        "combo": "",
    },
    "pdf_to_images": {
        "required": ["pdfPath", "outputDir"],
        "optional": ["dpi", "imageFormat", "resultVariable"],
        "defaults": {"dpi": 150, "imageFormat": "png", "resultVariable": "pdf_images_paths"},
        "desc": {"dpi": "图片分辨率", "imageFormat": "png/jpg"},
        "example": {"pdfPath": "{pdf}", "outputDir": "D:\\\\imgs"},
        "combo": "",
    },
    "images_to_pdf": {
        "required": ["imagePaths", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {"imagePaths": "图片路径数组"},
        "example": {"imagePaths": ["a.png", "b.png"], "outputPath": "D:\\\\out.pdf"},
        "combo": "",
    },
    "pdf_extract_images": {
        "required": ["pdfPath", "outputDir"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "pdf_images"},
        "desc": {},
        "example": {"pdfPath": "{pdf}", "outputDir": "D:\\\\imgs"},
        "combo": "",
    },
    "pdf_get_info": {
        "required": ["pdfPath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "pdf_info"},
        "desc": {},
        "example": {"pdfPath": "{pdf}"},
        "combo": "返回 页数/作者/标题 等",
    },
    "pdf_to_word": {
        "required": ["pdfPath", "outputPath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "word_path"},
        "desc": {},
        "example": {"pdfPath": "{pdf}", "outputPath": "D:\\\\out.docx"},
        "combo": "",
    },

    # 媒体 / 视频音频
    "format_convert": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["mediaType", "resultVariable"],
        "defaults": {"mediaType": "video", "outputFormat": "mp4", "resultVariable": "converted_path"},
        "desc": {"mediaType": "video/audio/image", "outputFormat": "目标格式后缀"},
        "example": {"inputPath": "{file}", "outputFormat": "mp4"},
        "combo": "",
    },
    "compress_image": {
        "required": ["inputPath"],
        "optional": ["quality", "outputPath", "resultVariable"],
        "defaults": {"quality": 80, "resultVariable": "compressed_image"},
        "desc": {"quality": "1-100"},
        "example": {"inputPath": "{img}", "quality": 70},
        "combo": "",
    },
    "compress_video": {
        "required": ["inputPath"],
        "optional": ["preset", "crf", "outputPath", "resultVariable"],
        "defaults": {"preset": "medium", "crf": 23, "resultVariable": "compressed_video"},
        "desc": {"preset": "ultrafast/fast/medium/slow", "crf": "18-28，越大越压缩"},
        "example": {"inputPath": "{video}"},
        "combo": "",
    },
    "extract_audio": {
        "required": ["videoPath"],
        "optional": ["audioFormat", "audioBitrate", "outputPath", "resultVariable"],
        "defaults": {"audioFormat": "mp3", "audioBitrate": "192k", "resultVariable": "extracted_audio"},
        "desc": {},
        "example": {"videoPath": "{video}"},
        "combo": "",
    },
    "trim_video": {
        "required": ["videoPath", "startTime", "endTime"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"startTime": "00:00:00", "resultVariable": "trimmed_video"},
        "desc": {"startTime": "开始时间 hh:mm:ss", "endTime": "结束时间"},
        "example": {"videoPath": "{video}", "startTime": "00:00:10", "endTime": "00:00:30"},
        "combo": "",
    },
    "merge_media": {
        "required": ["paths"],
        "optional": ["mergeType", "outputPath", "resultVariable"],
        "defaults": {"mergeType": "video", "resultVariable": "merged_file"},
        "desc": {"mergeType": "video/audio", "paths": "路径数组"},
        "example": {"paths": ["a.mp4", "b.mp4"]},
        "combo": "",
    },
    "extract_frame": {
        "required": ["videoPath", "time"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "frame_image"},
        "desc": {"time": "提取时刻 hh:mm:ss 或秒数"},
        "example": {"videoPath": "{video}", "time": "00:00:05"},
        "combo": "",
    },
    "qr_generate": {
        "required": ["text", "outputPath"],
        "optional": ["size", "errorCorrection", "resultVariable"],
        "defaults": {"size": 256, "errorCorrection": "M", "resultVariable": "qr_image"},
        "desc": {"errorCorrection": "L/M/Q/H"},
        "example": {"text": "https://example.com", "outputPath": "D:\\\\qr.png"},
        "combo": "",
    },
    "qr_decode": {
        "required": ["imagePath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "qr_text"},
        "desc": {},
        "example": {"imagePath": "{qr}"},
        "combo": "",
    },

    # 加密 / 编码
    "md5_encrypt": {
        "required": ["text"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "md5_hash"},
        "desc": {"text": "要加密的文本"},
        "example": {"text": "{password}"},
        "combo": "",
    },
    "sha_encrypt": {
        "required": ["text", "algorithm"],
        "optional": ["resultVariable"],
        "defaults": {"algorithm": "sha256", "resultVariable": "sha_hash"},
        "desc": {"algorithm": "sha1/sha256/sha512"},
        "example": {"text": "{data}", "algorithm": "sha256"},
        "combo": "",
    },
    "url_encode_decode": {
        "required": ["text", "operation"],
        "optional": ["resultVariable"],
        "defaults": {"operation": "encode", "resultVariable": "url_result"},
        "desc": {"operation": "encode/decode"},
        "example": {"text": "{url}", "operation": "encode"},
        "combo": "",
    },
    "uuid_generator": {
        "required": [],
        "optional": ["version", "resultVariable"],
        "defaults": {"version": "4", "resultVariable": "uuid"},
        "desc": {"version": "1/4"},
        "example": {},
        "combo": "",
    },
    "random_password_generator": {
        "required": [],
        "optional": ["length", "includeUppercase", "includeNumbers", "includeSymbols", "resultVariable"],
        "defaults": {"length": 16, "includeUppercase": True, "includeNumbers": True, "includeSymbols": True, "resultVariable": "generated_password"},
        "desc": {},
        "example": {"length": 20},
        "combo": "",
    },
    "timestamp_converter": {
        "required": ["input", "operation"],
        "optional": ["format", "resultVariable"],
        "defaults": {"operation": "to_datetime", "format": "YYYY-MM-DD HH:mm:ss", "resultVariable": "timestamp_result"},
        "desc": {"operation": "to_timestamp / to_datetime"},
        "example": {"input": "2025-01-01", "operation": "to_timestamp"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(FILE_MEDIA_SCHEMAS)


# ============================================================
# 第三批：触发器 / 计划任务 / 桌面 / 通知 / 数据库
# ============================================================

TRIGGER_DESKTOP_SCHEMAS: dict = {
    # 触发器（用于把工作流变成被动响应式）
    "webhook_trigger": {
        "required": [],
        "optional": ["path", "method", "saveToVariable"],
        "defaults": {"path": "/webhook", "method": "POST", "saveToVariable": "webhook_data"},
        "desc": {"path": "Webhook 路径", "method": "GET/POST", "saveToVariable": "保存请求数据的变量"},
        "example": {"path": "/order-callback", "method": "POST"},
        "combo": "工作流第一个节点；后接 json_parse 解析 webhook_data",
    },
    "hotkey_trigger": {
        "required": ["hotkey"],
        "optional": [],
        "defaults": {},
        "desc": {"hotkey": "快捷键组合，如 Ctrl+Shift+A"},
        "example": {"hotkey": "Ctrl+Alt+R"},
        "combo": "",
    },
    "file_watcher_trigger": {
        "required": ["watchPath"],
        "optional": ["events", "fileTypes", "saveToVariable"],
        "defaults": {"events": ["created", "modified"], "saveToVariable": "file_event"},
        "desc": {"watchPath": "监控的文件夹", "events": "数组：created/modified/deleted/moved", "fileTypes": "扩展名过滤"},
        "example": {"watchPath": "D:\\\\inbox", "events": ["created"]},
        "combo": "",
    },
    "email_trigger": {
        "required": [],
        "optional": ["pollInterval", "filterFrom", "filterSubject", "saveToVariable"],
        "defaults": {"pollInterval": 60, "saveToVariable": "email_data"},
        "desc": {"pollInterval": "轮询间隔秒"},
        "example": {"filterFrom": "boss@company.com"},
        "combo": "",
    },
    "api_trigger": {
        "required": [],
        "optional": ["path", "saveToVariable"],
        "defaults": {"path": "/api/trigger", "saveToVariable": "api_response"},
        "desc": {},
        "example": {"path": "/run-now"},
        "combo": "",
    },
    "mouse_trigger": {
        "required": ["region"],
        "optional": ["button", "saveToVariable"],
        "defaults": {"button": "left", "saveToVariable": "mouse_position"},
        "desc": {"region": "触发区域 {x,y,width,height}", "button": "left/right/middle"},
        "example": {"region": {"x": 0, "y": 0, "width": 100, "height": 100}},
        "combo": "",
    },
    "image_trigger": {
        "required": ["imagePath"],
        "optional": ["confidence", "interval", "saveToVariable"],
        "defaults": {"confidence": 0.8, "interval": 2, "saveToVariable": "image_position"},
        "desc": {"imagePath": "目标图片", "interval": "扫描间隔秒"},
        "example": {"imagePath": "D:\\\\target.png"},
        "combo": "",
    },
    "sound_trigger": {
        "required": ["threshold"],
        "optional": ["saveToVariable"],
        "defaults": {"threshold": 50, "saveToVariable": "sound_volume"},
        "desc": {"threshold": "声音阈值 dB"},
        "example": {"threshold": 70},
        "combo": "",
    },
    "face_trigger": {
        "required": [],
        "optional": ["cameraIndex", "saveToVariable"],
        "defaults": {"cameraIndex": 0, "saveToVariable": "face_detected"},
        "desc": {"cameraIndex": "摄像头索引"},
        "example": {},
        "combo": "",
    },
    "gesture_trigger": {
        "required": ["gestureType"],
        "optional": ["timeout", "cameraIndex", "saveToVariable"],
        "defaults": {"timeout": 60000, "cameraIndex": 0, "saveToVariable": "gesture_info"},
        "desc": {"gestureType": "wave/thumbs_up/peace 等", "timeout": "超时毫秒"},
        "example": {"gestureType": "wave"},
        "combo": "",
    },
    "element_change_trigger": {
        "required": ["selector"],
        "optional": ["interval", "saveNewElementSelector", "saveChangeInfo"],
        "defaults": {"interval": 5, "saveNewElementSelector": "new_element_selector", "saveChangeInfo": "element_change_info"},
        "desc": {"selector": "监控的父元素 selector", "interval": "扫描间隔秒"},
        "example": {"selector": ".comments"},
        "combo": "用于监控网页评论新增、商品上架等",
    },
    "probability_trigger": {
        "required": ["probability"],
        "optional": [],
        "defaults": {"probability": 50},
        "desc": {"probability": "百分比 0-100，路径1 概率"},
        "example": {"probability": 30},
        "combo": "AB 测试 / 灰度分流；有两个出口 path1 和 path2",
    },

    # 计划任务节点
    "scheduled_task": {
        "required": ["scheduleType"],
        "optional": ["cronExpression", "intervalSeconds", "specificTime"],
        "defaults": {"scheduleType": "interval", "intervalSeconds": 300},
        "desc": {"scheduleType": "interval/cron/specific", "cronExpression": "如 0 9 * * *"},
        "example": {"scheduleType": "cron", "cronExpression": "0 9 * * *"},
        "combo": "工作流入口节点",
    },

    # 桌面应用自动化
    "desktop_app_start": {
        "required": ["appPath"],
        "optional": ["arguments", "waitReady"],
        "defaults": {"waitReady": True},
        "desc": {"appPath": "EXE 路径", "arguments": "命令行参数"},
        "example": {"appPath": "C:\\\\app.exe"},
        "combo": "",
    },
    "desktop_app_close": {
        "required": [],
        "optional": ["processName", "force"],
        "defaults": {"force": False},
        "desc": {"processName": "进程名", "force": "强制结束"},
        "example": {"processName": "notepad.exe"},
        "combo": "",
    },
    "desktop_click_control": {
        "required": ["controlSelector"],
        "optional": ["clickType"],
        "defaults": {"clickType": "left"},
        "desc": {"controlSelector": "控件选择器", "clickType": "left/right/double"},
        "example": {"controlSelector": "Button:确定"},
        "combo": "",
    },
    "desktop_input_control": {
        "required": ["controlSelector", "text"],
        "optional": ["clear"],
        "defaults": {"clear": True},
        "desc": {},
        "example": {"controlSelector": "Edit:用户名", "text": "{username}"},
        "combo": "",
    },
    "desktop_get_text": {
        "required": ["controlSelector"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "control_text"},
        "desc": {},
        "example": {"controlSelector": "Text:状态"},
        "combo": "",
    },
    "desktop_window_capture": {
        "required": ["windowTitle"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "window_screenshot"},
        "desc": {"windowTitle": "窗口标题（部分匹配）"},
        "example": {"windowTitle": "记事本"},
        "combo": "",
    },

    # 通知
    "system_notification": {
        "required": ["title", "message"],
        "optional": ["icon", "duration"],
        "defaults": {},
        "desc": {"icon": "info/success/warning/error"},
        "example": {"title": "完成", "message": "工作流执行成功"},
        "combo": "",
    },
    "text_to_speech": {
        "required": ["text"],
        "optional": ["voice", "rate", "volume"],
        "defaults": {"rate": 1.0, "volume": 1.0},
        "desc": {"voice": "声音名（可选）", "rate": "语速 0.1-10", "volume": "音量 0-1"},
        "example": {"text": "工作流已完成"},
        "combo": "",
    },
    "play_sound": {
        "required": ["soundFile"],
        "optional": ["volume"],
        "defaults": {"volume": 100},
        "desc": {"soundFile": "音频路径或 system:beep"},
        "example": {"soundFile": "system:beep"},
        "combo": "",
    },

    # 数据库（核心模块）
    "db_connect": {
        "required": ["host", "user", "password", "database"],
        "optional": ["port", "charset", "connectionVariable"],
        "defaults": {"port": 3306, "charset": "utf8mb4", "connectionVariable": "db_conn"},
        "desc": {"host": "MySQL 主机", "port": "默认 3306"},
        "example": {"host": "localhost", "user": "root", "password": "{db_pwd}", "database": "test"},
        "combo": "成功后用 db_query / db_execute；最后用 db_close 关闭",
    },
    "db_query": {
        "required": ["connectionVariable", "sql"],
        "optional": ["params", "resultVariable"],
        "defaults": {"connectionVariable": "db_conn", "resultVariable": "query_result"},
        "desc": {"sql": "SELECT 语句", "params": "参数化查询参数"},
        "example": {"connectionVariable": "db_conn", "sql": "SELECT * FROM users WHERE age > %s", "params": ["18"]},
        "combo": "",
    },
    "db_execute": {
        "required": ["connectionVariable", "sql"],
        "optional": ["params", "resultVariable"],
        "defaults": {"connectionVariable": "db_conn", "resultVariable": "execute_result"},
        "desc": {"sql": "INSERT/UPDATE/DELETE 等"},
        "example": {"connectionVariable": "db_conn", "sql": "DELETE FROM logs WHERE id = %s", "params": ["{log_id}"]},
        "combo": "",
    },
    "db_insert": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "db_conn", "resultVariable": "insert_result"},
        "desc": {"table": "表名", "data": "字段映射 dict"},
        "example": {"connectionVariable": "db_conn", "table": "users", "data": {"name": "{n}"}},
        "combo": "",
    },
    "db_close": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "db_conn"},
        "desc": {},
        "example": {"connectionVariable": "db_conn"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(TRIGGER_DESKTOP_SCHEMAS)


# ============================================================
# 第四批：手机/QQ/微信/SAP/SSH/飞书/AI 媒体/盲水印/通知
# ============================================================

EXTRA_SCHEMAS: dict = {
    # 手机自动化
    "phone_tap": {
        "required": ["x", "y"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"x": "横坐标", "y": "纵坐标", "deviceId": "设备 ID（多设备时用）"},
        "example": {"x": 540, "y": 960},
        "combo": "用拾取按钮拿坐标更准",
    },
    "phone_swipe": {
        "required": ["x1", "y1", "x2", "y2"],
        "optional": ["duration", "deviceId"],
        "defaults": {"duration": 300},
        "desc": {"duration": "滑动毫秒"},
        "example": {"x1": 540, "y1": 1500, "x2": 540, "y2": 500},
        "combo": "",
    },
    "phone_long_press": {
        "required": ["x", "y"],
        "optional": ["duration", "deviceId"],
        "defaults": {"duration": 1000},
        "desc": {"duration": "长按毫秒"},
        "example": {"x": 540, "y": 960, "duration": 1500},
        "combo": "",
    },
    "phone_input_text": {
        "required": ["text"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"text": "输入文本（手机已 ADB 输入法支持中文）"},
        "example": {"text": "{username}"},
        "combo": "通常前面 phone_tap 点中输入框",
    },
    "phone_press_key": {
        "required": ["keyCode"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"keyCode": "如 BACK/HOME/MENU/ENTER"},
        "example": {"keyCode": "BACK"},
        "combo": "",
    },
    "phone_screenshot": {
        "required": [],
        "optional": ["savePath", "deviceId", "resultVariable"],
        "defaults": {"resultVariable": "phone_screenshot"},
        "desc": {},
        "example": {"savePath": "D:\\\\phone.png"},
        "combo": "",
    },
    "phone_click_image": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "deviceId", "resultVariable"],
        "defaults": {"confidence": 0.85, "timeout": 10, "resultVariable": "phone_image_clicked"},
        "desc": {},
        "example": {"imagePath": "D:\\\\target.png"},
        "combo": "",
    },
    "phone_wait_image": {
        "required": ["imagePath"],
        "optional": ["timeout", "deviceId", "resultVariable"],
        "defaults": {"timeout": 30, "resultVariable": "phone_image_found"},
        "desc": {},
        "example": {"imagePath": "D:\\\\splash.png"},
        "combo": "",
    },
    "phone_start_app": {
        "required": ["packageName"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"packageName": "如 com.tencent.mm"},
        "example": {"packageName": "com.tencent.mm"},
        "combo": "",
    },
    "phone_stop_app": {
        "required": ["packageName"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {},
        "example": {"packageName": "com.tencent.mm"},
        "combo": "",
    },
    "phone_install_app": {
        "required": ["apkPath"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"apkPath": "本地 APK 路径"},
        "example": {"apkPath": "D:\\\\app.apk"},
        "combo": "",
    },
    "phone_set_clipboard": {
        "required": ["text"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {},
        "example": {"text": "{value}"},
        "combo": "",
    },
    "phone_get_clipboard": {
        "required": [],
        "optional": ["deviceId", "resultVariable"],
        "defaults": {"resultVariable": "phone_clipboard_content"},
        "desc": {},
        "example": {},
        "combo": "",
    },

    # QQ 机器人
    "qq_send_message": {
        "required": ["target", "message"],
        "optional": ["messageType", "resultVariable"],
        "defaults": {"messageType": "private", "resultVariable": "qq_msg_result"},
        "desc": {"messageType": "private/group", "target": "QQ 号或群号", "message": "消息内容"},
        "example": {"target": "10001", "message": "你好"},
        "combo": "",
    },
    "qq_send_image": {
        "required": ["target", "imagePath"],
        "optional": ["messageType", "resultVariable"],
        "defaults": {"messageType": "private", "resultVariable": "qq_img_result"},
        "desc": {},
        "example": {"target": "10001", "imagePath": "D:\\\\img.png"},
        "combo": "",
    },
    "qq_send_file": {
        "required": ["target", "filePath"],
        "optional": ["messageType", "resultVariable"],
        "defaults": {"messageType": "private", "resultVariable": "qq_file_result"},
        "desc": {},
        "example": {"target": "10001", "filePath": "D:\\\\report.pdf"},
        "combo": "",
    },
    "qq_wait_message": {
        "required": [],
        "optional": ["sourceType", "matchMode", "matchText", "timeout", "resultVariable"],
        "defaults": {"sourceType": "any", "matchMode": "contains", "timeout": 60, "resultVariable": "qq_received"},
        "desc": {"sourceType": "any/private/group", "matchMode": "contains/equals/regex", "matchText": "匹配字符串"},
        "example": {"matchMode": "contains", "matchText": "查询订单"},
        "combo": "QQ 机器人对话流程：等消息 → 解析 → 回复",
    },
    "qq_get_friends": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "qq_friends"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "qq_get_groups": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "qq_groups"},
        "desc": {},
        "example": {},
        "combo": "",
    },

    # 微信
    "wechat_send_message": {
        "required": ["target", "message"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "wechat_msg_result"},
        "desc": {"target": "好友/群聊名"},
        "example": {"target": "文件传输助手", "message": "提醒"},
        "combo": "",
    },
    "wechat_send_file": {
        "required": ["target", "filePath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "wechat_file_result"},
        "desc": {},
        "example": {"target": "文件传输助手", "filePath": "D:\\\\f.zip"},
        "combo": "",
    },

    # SSH
    "ssh_connect": {
        "required": ["host", "username", "password"],
        "optional": ["port", "connectionVariable"],
        "defaults": {"port": 22, "connectionVariable": "ssh_conn"},
        "desc": {},
        "example": {"host": "192.168.1.100", "username": "root", "password": "{pwd}"},
        "combo": "成功后 ssh_execute_command；最后 ssh_disconnect",
    },
    "ssh_execute_command": {
        "required": ["connectionVariable", "command"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"connectionVariable": "ssh_conn", "timeout": 60, "resultVariable": "ssh_output"},
        "desc": {},
        "example": {"connectionVariable": "ssh_conn", "command": "df -h"},
        "combo": "",
    },
    "ssh_upload_file": {
        "required": ["connectionVariable", "localPath", "remotePath"],
        "optional": [],
        "defaults": {"connectionVariable": "ssh_conn"},
        "desc": {},
        "example": {"connectionVariable": "ssh_conn", "localPath": "D:\\\\a.txt", "remotePath": "/tmp/a.txt"},
        "combo": "",
    },
    "ssh_download_file": {
        "required": ["connectionVariable", "remotePath", "localPath"],
        "optional": [],
        "defaults": {"connectionVariable": "ssh_conn"},
        "desc": {},
        "example": {"connectionVariable": "ssh_conn", "remotePath": "/var/log/x.log", "localPath": "D:\\\\x.log"},
        "combo": "",
    },
    "ssh_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "ssh_conn"},
        "desc": {},
        "example": {"connectionVariable": "ssh_conn"},
        "combo": "",
    },

    # SAP
    "sap_login": {
        "required": ["client", "username", "password"],
        "optional": ["language"],
        "defaults": {"language": "ZH"},
        "desc": {"client": "客户端代码", "language": "EN/ZH"},
        "example": {"client": "100", "username": "{u}", "password": "{p}"},
        "combo": "",
    },
    "sap_run_tcode": {
        "required": ["tcode"],
        "optional": [],
        "defaults": {},
        "desc": {"tcode": "事务码如 VA01"},
        "example": {"tcode": "VA01"},
        "combo": "",
    },
    "sap_set_field_value": {
        "required": ["fieldId", "value"],
        "optional": [],
        "defaults": {},
        "desc": {"fieldId": "SAP 字段 ID", "value": "要填的值"},
        "example": {"fieldId": "VBAK-AUART", "value": "OR"},
        "combo": "",
    },
    "sap_get_field_value": {
        "required": ["fieldId"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "field_value"},
        "desc": {},
        "example": {"fieldId": "VBAK-VBELN"},
        "combo": "",
    },
    "sap_click_button": {
        "required": ["buttonId"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"buttonId": "btn[8]"},
        "combo": "",
    },
    "sap_logout": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": ""},

    # 飞书
    "feishu_bitable_read": {
        "required": ["appToken", "tableId"],
        "optional": ["viewId", "resultVariable"],
        "defaults": {"resultVariable": "bitable_data"},
        "desc": {"appToken": "多维表格 token", "tableId": "数据表 ID"},
        "example": {"appToken": "...", "tableId": "..."},
        "combo": "",
    },
    "feishu_bitable_write": {
        "required": ["appToken", "tableId", "records"],
        "optional": [],
        "defaults": {},
        "desc": {"records": "记录数组"},
        "example": {"appToken": "...", "tableId": "...", "records": [{"name": "Tom"}]},
        "combo": "",
    },

    # WPS 多维表格
    "wps_bitable_write": {
        "required": ["ak", "sk", "fileId", "sheetId"],
        "optional": ["baseUrl", "dataSource", "fields", "variableName"],
        "defaults": {"dataSource": "manual"},
        "desc": {"ak": "WPS开放平台AK", "sk": "WPS开放平台SK", "fileId": "多维表格文件ID", "sheetId": "子表ID", "fields": "手动模式的字段JSON", "variableName": "变量模式的数据变量名", "dataSource": "manual/variable"},
        "example": {"ak": "...", "sk": "...", "fileId": "...", "sheetId": "...", "fields": {"姓名": "张三"}},
        "combo": "",
    },
    "wps_bitable_read": {
        "required": ["ak", "sk", "fileId", "sheetId"],
        "optional": ["baseUrl", "variableName"],
        "defaults": {"variableName": "wps_data"},
        "desc": {"ak": "WPS开放平台AK", "sk": "WPS开放平台SK", "fileId": "多维表格文件ID", "sheetId": "子表ID", "variableName": "读取结果保存到的变量"},
        "example": {"ak": "...", "sk": "...", "fileId": "...", "sheetId": "...", "variableName": "wps_data"},
        "combo": "",
    },

    # AI 媒体
    "ai_generate_image": {
        "required": ["prompt"],
        "optional": ["model", "size", "outputPath", "resultVariable"],
        "defaults": {"size": "1024x1024", "resultVariable": "generated_image"},
        "desc": {"prompt": "图片描述"},
        "example": {"prompt": "一只可爱的猫"},
        "combo": "",
    },
    "ai_generate_video": {
        "required": ["prompt"],
        "optional": ["model", "duration", "outputPath", "resultVariable"],
        "defaults": {"resultVariable": "generated_video"},
        "desc": {},
        "example": {"prompt": "海浪冲击沙滩"},
        "combo": "",
    },
    "audio_to_text": {
        "required": ["audioPath"],
        "optional": ["language", "resultVariable"],
        "defaults": {"language": "auto", "resultVariable": "audio_text"},
        "desc": {"language": "auto/zh/en"},
        "example": {"audioPath": "D:\\\\record.mp3"},
        "combo": "",
    },

    # 盲水印
    "bwm_embed_text": {
        "required": ["inputImagePath", "outputImagePath", "watermarkText", "passwordWm", "passwordImg"],
        "optional": ["resultVariable"],
        "defaults": {"passwordWm": 1, "passwordImg": 1, "resultVariable": "wm_bit_len"},
        "desc": {
            "watermarkText": "要嵌入的文本",
            "passwordWm": "水印密码",
            "passwordImg": "图像密码",
            "resultVariable": "保存 wm_bit_len，提取时必须用",
        },
        "example": {"inputImagePath": "{img}", "outputImagePath": "D:\\\\wm.png", "watermarkText": "© 我"},
        "combo": "嵌入 → 输出 wm_bit_len；提取时用 bwm_extract_text 配合相同密码 + wm_bit_len",
    },
    "bwm_extract_text": {
        "required": ["inputImagePath", "wmBitLen", "passwordWm", "passwordImg"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "extracted_text"},
        "desc": {"wmBitLen": "嵌入时返回的 bit 长度"},
        "example": {"inputImagePath": "D:\\\\wm.png", "wmBitLen": "{wm_bit_len}", "passwordWm": 1, "passwordImg": 1},
        "combo": "",
    },
    "bwm_embed_image": {
        "required": ["inputImagePath", "outputImagePath", "watermarkImagePath", "passwordWm", "passwordImg"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "wm_image_shape"},
        "desc": {"watermarkImagePath": "水印图（推荐黑白二值图）"},
        "example": {"inputImagePath": "{img}", "outputImagePath": "D:\\\\wm.png", "watermarkImagePath": "D:\\\\sig.png"},
        "combo": "",
    },
    "bwm_extract_image": {
        "required": ["inputImagePath", "outputImagePath", "wmShape", "passwordWm", "passwordImg"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "extracted_wm_path"},
        "desc": {"wmShape": "嵌入时返回的 [h,w]"},
        "example": {"inputImagePath": "D:\\\\wm.png", "outputImagePath": "D:\\\\out.png", "wmShape": "{wm_image_shape}"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXTRA_SCHEMAS)


# ============================================================
# 第五批：高级数学/统计/列表/字典 + 多渠道通知 + Allure 测试
# ============================================================

ADVANCED_MATH_SCHEMAS: dict = {
    # 列表高级
    "list_sum": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "sum_result"},
        "desc": {"listVariable": "数字列表变量名"},
        "example": {"listVariable": "prices"},
        "combo": "",
    },
    "list_average": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "average_result"},
        "desc": {},
        "example": {"listVariable": "scores"},
        "combo": "",
    },
    "list_max": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "max_value"},
        "desc": {},
        "example": {"listVariable": "scores"},
        "combo": "",
    },
    "list_min": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "min_value"},
        "desc": {},
        "example": {"listVariable": "scores"},
        "combo": "",
    },
    "list_sort": {
        "required": ["listVariable"],
        "optional": ["order", "resultVariable"],
        "defaults": {"order": "asc", "resultVariable": "sorted_list"},
        "desc": {"order": "asc/desc"},
        "example": {"listVariable": "items"},
        "combo": "",
    },
    "list_unique": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "unique_list"},
        "desc": {},
        "example": {"listVariable": "items"},
        "combo": "",
    },
    "list_count": {
        "required": ["listVariable", "target"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "count_result"},
        "desc": {"target": "要统计的值"},
        "example": {"listVariable": "items", "target": "apple"},
        "combo": "",
    },
    "list_filter": {
        "required": ["listVariable", "filterCondition"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "filtered_list"},
        "desc": {"filterCondition": "Python 表达式，item 是当前项"},
        "example": {"listVariable": "scores", "filterCondition": "item > 60"},
        "combo": "",
    },
    "list_map": {
        "required": ["listVariable", "expression"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "mapped_list"},
        "desc": {"expression": "Python 表达式"},
        "example": {"listVariable": "prices", "expression": "item * 1.1"},
        "combo": "",
    },
    "list_slice": {
        "required": ["listVariable", "start"],
        "optional": ["end", "resultVariable"],
        "defaults": {"resultVariable": "sliced_list"},
        "desc": {"start": "起始索引", "end": "结束索引（可选）"},
        "example": {"listVariable": "items", "start": "0", "end": "10"},
        "combo": "",
    },
    "list_reverse": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "reversed_list"},
        "desc": {},
        "example": {"listVariable": "items"},
        "combo": "",
    },
    "list_merge": {
        "required": ["lists"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "merged_list"},
        "desc": {"lists": "列表数组（变量名数组）"},
        "example": {"lists": ["list_a", "list_b"]},
        "combo": "",
    },
    "list_to_string_advanced": {
        "required": ["listVariable", "separator"],
        "optional": ["resultVariable"],
        "defaults": {"separator": ",", "resultVariable": "joined_string"},
        "desc": {},
        "example": {"listVariable": "items", "separator": "、"},
        "combo": "",
    },

    # 字典高级
    "dict_merge": {
        "required": ["dicts"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "merged_dict"},
        "desc": {"dicts": "字典变量名数组"},
        "example": {"dicts": ["a", "b"]},
        "combo": "",
    },
    "dict_filter": {
        "required": ["dictVariable", "filterCondition"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "filtered_dict"},
        "desc": {"filterCondition": "Python 表达式，key/value 可用"},
        "example": {"dictVariable": "scores", "filterCondition": "value > 60"},
        "combo": "",
    },
    "dict_invert": {
        "required": ["dictVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "inverted_dict"},
        "desc": {},
        "example": {"dictVariable": "name_to_id"},
        "combo": "",
    },
    "dict_sort": {
        "required": ["dictVariable"],
        "optional": ["sortBy", "order", "resultVariable"],
        "defaults": {"sortBy": "key", "order": "asc", "resultVariable": "sorted_dict"},
        "desc": {"sortBy": "key/value"},
        "example": {"dictVariable": "scores", "sortBy": "value", "order": "desc"},
        "combo": "",
    },
    "dict_get_path": {
        "required": ["dictVariable", "path"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "path_value"},
        "desc": {"path": "点路径，如 user.address.city"},
        "example": {"dictVariable": "data", "path": "user.name"},
        "combo": "",
    },
    "dict_flatten": {
        "required": ["dictVariable"],
        "optional": ["separator", "resultVariable"],
        "defaults": {"separator": ".", "resultVariable": "flat_dict"},
        "desc": {},
        "example": {"dictVariable": "nested"},
        "combo": "",
    },

    # 数学
    "math_round": {
        "required": ["value"],
        "optional": ["digits", "resultVariable"],
        "defaults": {"digits": 0, "resultVariable": "round_result"},
        "desc": {"digits": "小数位数"},
        "example": {"value": "{x}", "digits": 2},
        "combo": "",
    },
    "math_floor": {"required": ["value"], "optional": ["resultVariable"], "defaults": {"resultVariable": "floor_result"}, "desc": {}, "example": {"value": "{x}"}, "combo": ""},
    "math_modulo": {"required": ["a", "b"], "optional": ["resultVariable"], "defaults": {"resultVariable": "modulo_result"}, "desc": {}, "example": {"a": "{x}", "b": "10"}, "combo": ""},
    "math_abs": {"required": ["value"], "optional": ["resultVariable"], "defaults": {"resultVariable": "abs_result"}, "desc": {}, "example": {"value": "{x}"}, "combo": ""},
    "math_sqrt": {"required": ["value"], "optional": ["resultVariable"], "defaults": {"resultVariable": "sqrt_result"}, "desc": {}, "example": {"value": "{x}"}, "combo": ""},
    "math_power": {"required": ["base", "exponent"], "optional": ["resultVariable"], "defaults": {"resultVariable": "power_result"}, "desc": {}, "example": {"base": "{x}", "exponent": "2"}, "combo": ""},
    "math_percentage": {
        "required": ["value", "total"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "percentage"},
        "desc": {},
        "example": {"value": "30", "total": "100"},
        "combo": "",
    },
    "math_random_advanced": {
        "required": [],
        "optional": ["min", "max", "decimals", "resultVariable"],
        "defaults": {"min": "0", "max": "1", "decimals": 0, "resultVariable": "random_advanced"},
        "desc": {"decimals": "小数位"},
        "example": {"min": "1", "max": "100"},
        "combo": "",
    },

    # 统计
    "stat_median": {"required": ["listVariable"], "optional": ["resultVariable"], "defaults": {"resultVariable": "median"}, "desc": {}, "example": {"listVariable": "scores"}, "combo": ""},
    "stat_mode": {"required": ["listVariable"], "optional": ["resultVariable"], "defaults": {"resultVariable": "mode"}, "desc": {}, "example": {"listVariable": "scores"}, "combo": ""},
    "stat_variance": {"required": ["listVariable"], "optional": ["resultVariable"], "defaults": {"resultVariable": "variance"}, "desc": {}, "example": {"listVariable": "scores"}, "combo": ""},
    "stat_stdev": {"required": ["listVariable"], "optional": ["resultVariable"], "defaults": {"resultVariable": "stdev"}, "desc": {}, "example": {"listVariable": "scores"}, "combo": ""},
    "csv_parse": {
        "required": ["csvText"],
        "optional": ["delimiter", "hasHeader", "resultVariable"],
        "defaults": {"delimiter": ",", "hasHeader": True, "resultVariable": "csv_data"},
        "desc": {},
        "example": {"csvText": "{file_content}"},
        "combo": "",
    },
    "csv_generate": {
        "required": ["data"],
        "optional": ["delimiter", "resultVariable"],
        "defaults": {"delimiter": ",", "resultVariable": "csv_text"},
        "desc": {"data": "字典数组"},
        "example": {"data": "{rows}"},
        "combo": "",
    },

    # 多渠道通知
    "notify_dingtalk": {
        "required": ["webhook", "message"],
        "optional": ["secret", "atAll"],
        "defaults": {"atAll": False},
        "desc": {"webhook": "钉钉机器人 webhook", "secret": "签名密钥（可选）"},
        "example": {"webhook": "https://oapi.dingtalk.com/...", "message": "{report}"},
        "combo": "",
    },
    "notify_wecom": {
        "required": ["webhook", "message"],
        "optional": ["msgType"],
        "defaults": {"msgType": "text"},
        "desc": {"webhook": "企业微信机器人 webhook", "msgType": "text/markdown"},
        "example": {"webhook": "https://qyapi.weixin.qq.com/...", "message": "..."},
        "combo": "",
    },
    "notify_feishu": {
        "required": ["webhook", "message"],
        "optional": ["secret", "msgType"],
        "defaults": {"msgType": "text"},
        "desc": {},
        "example": {"webhook": "https://open.feishu.cn/...", "message": "..."},
        "combo": "",
    },
    "notify_telegram": {
        "required": ["botToken", "chatId", "message"],
        "optional": ["parseMode"],
        "defaults": {"parseMode": "Markdown"},
        "desc": {},
        "example": {"botToken": "...", "chatId": "...", "message": "..."},
        "combo": "",
    },
    "notify_bark": {
        "required": ["barkUrl", "title", "message"],
        "optional": ["sound"],
        "defaults": {},
        "desc": {"barkUrl": "Bark 推送 URL"},
        "example": {"barkUrl": "https://api.day.app/xxx", "title": "提醒", "message": "工作流完成"},
        "combo": "",
    },
    "notify_slack": {
        "required": ["webhook", "message"],
        "optional": ["channel"],
        "defaults": {},
        "desc": {},
        "example": {"webhook": "...", "message": "..."},
        "combo": "",
    },
    "notify_serverchan": {
        "required": ["sendKey", "title", "message"],
        "optional": [],
        "defaults": {},
        "desc": {"sendKey": "Server酱 send key"},
        "example": {"sendKey": "SCT...", "title": "提醒", "message": "..."},
        "combo": "",
    },

    # Allure 测试报告
    "allure_init": {
        "required": ["resultsPath"],
        "optional": ["projectName", "resultVariable"],
        "defaults": {"resultVariable": "allure_initialized"},
        "desc": {"resultsPath": "结果目录绝对路径"},
        "example": {"resultsPath": "D:\\\\allure-results", "projectName": "我的项目"},
        "combo": "测试流程入口",
    },
    "allure_start_test": {
        "required": ["testName"],
        "optional": ["description", "severity", "tags", "resultVariable"],
        "defaults": {"severity": "normal", "resultVariable": "test_id"},
        "desc": {"severity": "blocker/critical/normal/minor/trivial"},
        "example": {"testName": "登录测试"},
        "combo": "",
    },
    "allure_add_step": {
        "required": ["stepName", "status"],
        "optional": ["description"],
        "defaults": {"status": "passed"},
        "desc": {"status": "passed/failed/skipped/broken"},
        "example": {"stepName": "输入用户名", "status": "passed"},
        "combo": "",
    },
    "allure_add_attachment": {
        "required": ["filePath"],
        "optional": ["name"],
        "defaults": {},
        "desc": {},
        "example": {"filePath": "D:\\\\screenshot.png", "name": "失败截图"},
        "combo": "",
    },
    "allure_stop_test": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "allure_generate_report": {
        "required": ["resultsPath", "reportPath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "report_path"},
        "desc": {},
        "example": {"resultsPath": "D:\\\\allure-results", "reportPath": "D:\\\\allure-report"},
        "combo": "测试流程末尾",
    },
}

_ALL_SCHEMAS.update(ADVANCED_MATH_SCHEMAS)


# ============================================================
# 第六批：图像处理 / 文档转换 / 网络 / 共享 / 实用工具
# ============================================================

IMAGE_DOC_NET_SCHEMAS: dict = {
    # 图像处理（基于 Pillow）
    "image_format_convert": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"outputFormat": "png", "resultVariable": "converted_image"},
        "desc": {"outputFormat": "png/jpg/webp/bmp/gif/heic"},
        "example": {"inputPath": "{img}", "outputFormat": "webp"},
        "combo": "",
    },
    "image_resize": {
        "required": ["inputPath", "width", "height"],
        "optional": ["keepRatio", "outputPath", "resultVariable"],
        "defaults": {"keepRatio": True, "resultVariable": "resized_image"},
        "desc": {"keepRatio": "是否保持比例"},
        "example": {"inputPath": "{img}", "width": 800, "height": 600},
        "combo": "",
    },
    "image_crop": {
        "required": ["inputPath", "x", "y", "width", "height"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "cropped_image"},
        "desc": {},
        "example": {"inputPath": "{img}", "x": 100, "y": 100, "width": 400, "height": 300},
        "combo": "",
    },
    "image_rotate": {
        "required": ["inputPath", "angle"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"angle": 90, "resultVariable": "rotated_image"},
        "desc": {"angle": "顺时针角度"},
        "example": {"inputPath": "{img}", "angle": 180},
        "combo": "",
    },
    "image_flip": {
        "required": ["inputPath", "direction"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"direction": "horizontal", "resultVariable": "flipped_image"},
        "desc": {"direction": "horizontal/vertical"},
        "example": {"inputPath": "{img}", "direction": "horizontal"},
        "combo": "",
    },
    "image_blur": {
        "required": ["inputPath", "radius"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"radius": 5, "resultVariable": "blurred_image"},
        "desc": {"radius": "模糊半径"},
        "example": {"inputPath": "{img}", "radius": 8},
        "combo": "",
    },
    "image_brightness": {
        "required": ["inputPath", "factor"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"factor": 1.0, "resultVariable": "bright_image"},
        "desc": {"factor": "1.0=原图, >1 增亮, <1 变暗"},
        "example": {"inputPath": "{img}", "factor": 1.5},
        "combo": "",
    },
    "image_contrast": {
        "required": ["inputPath", "factor"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"factor": 1.0, "resultVariable": "contrast_image"},
        "desc": {},
        "example": {"inputPath": "{img}", "factor": 1.3},
        "combo": "",
    },
    "image_grayscale": {
        "required": ["inputPath"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "gray_image"},
        "desc": {},
        "example": {"inputPath": "{img}"},
        "combo": "",
    },
    "image_add_text": {
        "required": ["inputPath", "text", "x", "y"],
        "optional": ["fontSize", "color", "fontPath", "outputPath", "resultVariable"],
        "defaults": {"fontSize": 24, "color": "#ffffff", "resultVariable": "text_image"},
        "desc": {},
        "example": {"inputPath": "{img}", "text": "© WebRPA", "x": 10, "y": 10},
        "combo": "",
    },
    "image_thumbnail": {
        "required": ["inputPath", "maxSize"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"maxSize": 200, "resultVariable": "thumbnail_image"},
        "desc": {"maxSize": "缩略图最大边像素"},
        "example": {"inputPath": "{img}"},
        "combo": "",
    },
    "image_round_corners": {
        "required": ["inputPath", "radius"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"radius": 20, "resultVariable": "rounded_image"},
        "desc": {},
        "example": {"inputPath": "{img}", "radius": 30},
        "combo": "",
    },
    "image_remove_bg": {
        "required": ["inputPath"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "transparent_image"},
        "desc": {},
        "example": {"inputPath": "{img}"},
        "combo": "",
    },
    "image_get_info": {
        "required": ["inputPath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "image_info"},
        "desc": {},
        "example": {"inputPath": "{img}"},
        "combo": "返回 宽/高/格式/通道数等",
    },

    # 文档转换
    "markdown_to_html": {
        "required": ["inputPath", "outputPath"],
        "optional": ["cssFile"],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{md}", "outputPath": "D:\\\\out.html"},
        "combo": "",
    },
    "html_to_markdown": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{html}", "outputPath": "D:\\\\out.md"},
        "combo": "",
    },
    "markdown_to_pdf": {
        "required": ["inputPath", "outputPath"],
        "optional": ["cssFile"],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{md}", "outputPath": "D:\\\\out.pdf"},
        "combo": "",
    },
    "markdown_to_docx": {
        "required": ["inputPath", "outputPath"],
        "optional": ["referenceDoc"],
        "defaults": {},
        "desc": {"referenceDoc": "样式参考 Word 文件"},
        "example": {"inputPath": "{md}", "outputPath": "D:\\\\out.docx"},
        "combo": "",
    },
    "docx_to_markdown": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{docx}", "outputPath": "D:\\\\out.md"},
        "combo": "",
    },

    # 网络监控
    "network_capture": {
        "required": [],
        "optional": ["filterUrl", "resultVariable"],
        "defaults": {"resultVariable": "captured_data"},
        "desc": {"filterUrl": "URL 包含此字符串才捕获"},
        "example": {"filterUrl": "/api/"},
        "combo": "前面 open_page，后面 click 触发请求；最后看 captured_data",
    },
    "network_monitor_start": {
        "required": [],
        "optional": ["filterUrl"],
        "defaults": {},
        "desc": {},
        "example": {"filterUrl": "/api/"},
        "combo": "和 network_monitor_wait/stop 配对",
    },
    "network_monitor_wait": {
        "required": [],
        "optional": ["urlMatch", "method", "timeout", "resultVariable"],
        "defaults": {"timeout": 30, "method": "*", "resultVariable": "monitored_request"},
        "desc": {"urlMatch": "URL 包含的字符串", "method": "GET/POST/*"},
        "example": {"urlMatch": "/api/data", "method": "GET"},
        "combo": "",
    },
    "network_monitor_stop": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "webhook_request": {
        "required": ["url", "method"],
        "optional": ["headers", "body", "params", "resultVariable", "timeout"],
        "defaults": {"method": "POST", "resultVariable": "webhook_response", "timeout": 30},
        "desc": {},
        "example": {"url": "https://hooks.slack.com/...", "method": "POST", "body": "{...}"},
        "combo": "",
    },

    # AI 网页爬虫
    "ai_smart_scraper": {
        "required": ["url", "prompt"],
        "optional": ["model", "resultVariable"],
        "defaults": {"resultVariable": "scraped_data"},
        "desc": {"prompt": "对网页内容的提问/抓取目标"},
        "example": {"url": "https://example.com", "prompt": "提取所有产品名称和价格"},
        "combo": "",
    },
    "ai_element_selector": {
        "required": ["url", "description"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "selector_result"},
        "desc": {"description": "目标元素的自然语言描述"},
        "example": {"url": "{url}", "description": "登录按钮"},
        "combo": "",
    },
    "firecrawl_scrape": {
        "required": ["url"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "firecrawl_data"},
        "desc": {},
        "example": {"url": "https://example.com"},
        "combo": "",
    },
    "firecrawl_map": {
        "required": ["url"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "firecrawl_links"},
        "desc": {},
        "example": {"url": "https://example.com"},
        "combo": "",
    },

    # 网络共享
    "share_folder": {
        "required": ["folderPath"],
        "optional": ["password", "resultVariable"],
        "defaults": {"resultVariable": "share_url"},
        "desc": {"password": "可选密码"},
        "example": {"folderPath": "D:\\\\public"},
        "combo": "",
    },
    "share_file": {
        "required": ["filePath"],
        "optional": ["password", "resultVariable"],
        "defaults": {"resultVariable": "share_url"},
        "desc": {},
        "example": {"filePath": "D:\\\\report.pdf"},
        "combo": "",
    },
    "stop_share": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "start_screen_share": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "screen_share_url"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "stop_screen_share": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },

    # 实用工具：颜色转换
    "rgb_to_hsv": {
        "required": ["rgb"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "hsv_color"},
        "desc": {"rgb": "RGB 字符串如 #ff0000 或 rgb(255,0,0)"},
        "example": {"rgb": "#3498db"},
        "combo": "",
    },
    "rgb_to_cmyk": {
        "required": ["rgb"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "cmyk_color"},
        "desc": {},
        "example": {"rgb": "#3498db"},
        "combo": "",
    },
    "hex_to_cmyk": {
        "required": ["hex"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "cmyk_color"},
        "desc": {},
        "example": {"hex": "#3498db"},
        "combo": "",
    },
    "printer_call": {
        "required": ["filePath"],
        "optional": ["printerName", "copies"],
        "defaults": {"copies": 1},
        "desc": {"printerName": "打印机名（不填用默认）"},
        "example": {"filePath": "D:\\\\report.pdf"},
        "combo": "",
    },

    # 屏幕操作
    "screen_record": {
        "required": ["outputPath", "duration"],
        "optional": ["fps", "resultVariable"],
        "defaults": {"fps": 30, "resultVariable": "recorded_video"},
        "desc": {"duration": "录制秒数"},
        "example": {"outputPath": "D:\\\\rec.mp4", "duration": 10},
        "combo": "",
    },
    "screenshot_screen": {
        "required": [],
        "optional": ["region", "savePath", "variableName"],
        "defaults": {"variableName": "screen_path"},
        "desc": {"region": "{x,y,width,height} 区域，不填全屏"},
        "example": {"savePath": "D:\\\\screen.png"},
        "combo": "",
    },
    "window_focus": {
        "required": ["windowTitle"],
        "optional": [],
        "defaults": {},
        "desc": {"windowTitle": "窗口标题（部分匹配）"},
        "example": {"windowTitle": "Chrome"},
        "combo": "",
    },

    # 模拟键鼠
    "real_mouse_click": {
        "required": ["x", "y"],
        "optional": ["button", "clicks"],
        "defaults": {"button": "left", "clicks": 1},
        "desc": {"button": "left/right/middle", "clicks": "1=单击 2=双击"},
        "example": {"x": 500, "y": 300, "button": "left"},
        "combo": "",
    },
    "real_mouse_move": {
        "required": ["x", "y"],
        "optional": ["duration"],
        "defaults": {"duration": 0.3},
        "desc": {"duration": "移动耗时秒"},
        "example": {"x": 500, "y": 300},
        "combo": "",
    },
    "real_mouse_drag": {
        "required": ["x1", "y1", "x2", "y2"],
        "optional": ["duration"],
        "defaults": {"duration": 0.5},
        "desc": {},
        "example": {"x1": 100, "y1": 100, "x2": 500, "y2": 500},
        "combo": "",
    },
    "real_mouse_scroll": {
        "required": ["clicks"],
        "optional": ["x", "y"],
        "defaults": {"clicks": 3},
        "desc": {"clicks": "滚轮刻度，正值向上"},
        "example": {"clicks": -5},
        "combo": "",
    },
    "real_keyboard": {
        "required": [],
        "optional": ["inputType", "text", "key", "hotkey", "pressMode", "interval", "holdDuration", "windowTitle"],
        "conditional_required": {
            "field": "inputType",
            "default": "text",
            "map": {"text": ["text"], "key": ["key"], "hotkey": ["hotkey"]},
        },
        "defaults": {"inputType": "text"},
        "desc": {
            "inputType": "输入方式：text 文本 / key 单个按键 / hotkey 组合键",
            "text": "要输入的文本（inputType=text 时）",
            "key": "按键名如 enter/backspace（inputType=key 时）",
            "hotkey": "组合键如 ctrl+c（inputType=hotkey 时）",
            "interval": "字符间隔秒",
        },
        "example": {"inputType": "key", "key": "backspace"},
        "combo": "",
    },
    "keyboard_action": {
        "required": ["action"],
        "optional": ["keys"],
        "conditional_required": {
            "field": "action",
            "default": "press",
            "map": {"hotkey": ["keys"], "press": ["keys"], "down": ["keys"], "up": ["keys"]},
        },
        "defaults": {"action": "press"},
        "desc": {"action": "press/down/up/hotkey", "keys": "组合键如 ctrl+c"},
        "example": {"action": "hotkey", "keys": "ctrl+a"},
        "combo": "",
    },
    "get_mouse_position": {
        "required": [],
        "optional": ["variableName"],
        "defaults": {"variableName": "mouse_pos"},
        "desc": {},
        "example": {},
        "combo": "返回 {x, y}",
    },

    # 屏幕识别点击
    "click_image": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "resultVariable"],
        "defaults": {"confidence": 0.8, "timeout": 10, "resultVariable": "image_clicked"},
        "desc": {"confidence": "0~1 匹配阈值"},
        "example": {"imagePath": "D:\\\\btn.png"},
        "combo": "",
    },
    "click_text": {
        "required": ["text"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 10, "resultVariable": "text_clicked"},
        "desc": {},
        "example": {"text": "确定"},
        "combo": "",
    },
    "image_exists": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "resultVariable"],
        "defaults": {"confidence": 0.8, "timeout": 5, "resultVariable": "image_found"},
        "desc": {},
        "example": {"imagePath": "D:\\\\btn.png"},
        "combo": "前置判断，后接 condition",
    },
    "element_exists": {
        "required": ["selector"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 5, "resultVariable": "element_found"},
        "desc": {},
        "example": {"selector": ".success-msg"},
        "combo": "",
    },
    "element_visible": {
        "required": ["selector"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 5, "resultVariable": "element_visible"},
        "desc": {},
        "example": {"selector": ".popup"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(IMAGE_DOC_NET_SCHEMAS)


# ============================================================
# 第七批：宏录制 / 屏幕共享 / 数据库扩展 / 字符串高级 / 触发器扩展
# ============================================================

EXTRA2_SCHEMAS: dict = {
    # 宏录制
    "macro_recorder": {
        "required": ["macroFile"],
        "optional": ["mode", "speed", "loopCount"],
        "defaults": {"mode": "play", "speed": 1.0, "loopCount": 1},
        "desc": {
            "macroFile": "宏文件路径（.json）",
            "mode": "play 回放 / record 录制",
            "speed": "回放速度倍数",
            "loopCount": "回放次数",
        },
        "example": {"macroFile": "D:\\\\macro.json", "mode": "play"},
        "combo": "工作流中插入宏回放：先 record 模式录制，再用 play 模式回放",
    },

    # Oracle 数据库（同 db_*）
    "oracle_connect": {
        "required": ["host", "username", "password", "service"],
        "optional": ["port", "connectionVariable"],
        "defaults": {"port": 1521, "connectionVariable": "oracle_conn"},
        "desc": {"service": "服务名 / SID"},
        "example": {"host": "192.168.1.100", "username": "scott", "password": "{p}", "service": "ORCL"},
        "combo": "",
    },
    "oracle_query": {
        "required": ["connectionVariable", "sql"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "oracle_conn", "resultVariable": "oracle_result"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn", "sql": "SELECT * FROM dual"},
        "combo": "",
    },
    "oracle_execute": {
        "required": ["connectionVariable", "sql"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "oracle_conn", "resultVariable": "oracle_affected"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn", "sql": "INSERT INTO ..."},
        "combo": "",
    },
    "oracle_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "oracle_conn"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn"},
        "combo": "",
    },

    # PostgreSQL
    "postgresql_connect": {
        "required": ["host", "username", "password", "database"],
        "optional": ["port", "connectionVariable"],
        "defaults": {"port": 5432, "connectionVariable": "pg_conn"},
        "desc": {},
        "example": {"host": "localhost", "username": "postgres", "password": "{p}", "database": "test"},
        "combo": "",
    },
    "postgresql_query": {
        "required": ["connectionVariable", "sql"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "pg_conn", "resultVariable": "pg_result"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn", "sql": "SELECT NOW()"},
        "combo": "",
    },
    "postgresql_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "pg_conn"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn"},
        "combo": "",
    },

    # MongoDB
    "mongodb_connect": {
        "required": ["uri", "database"],
        "optional": ["connectionVariable"],
        "defaults": {"connectionVariable": "mongo_conn"},
        "desc": {"uri": "mongodb://... 连接串"},
        "example": {"uri": "mongodb://localhost:27017", "database": "test"},
        "combo": "",
    },
    "mongodb_find": {
        "required": ["connectionVariable", "collection"],
        "optional": ["filter", "limit", "resultVariable"],
        "defaults": {"connectionVariable": "mongo_conn", "limit": 100, "resultVariable": "mongo_documents"},
        "desc": {"filter": "查询过滤 dict"},
        "example": {"connectionVariable": "mongo_conn", "collection": "users", "filter": {"active": True}},
        "combo": "",
    },
    "mongodb_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "mongo_conn"},
        "desc": {},
        "example": {"connectionVariable": "mongo_conn"},
        "combo": "",
    },

    # SQL Server
    "sqlserver_connect": {
        "required": ["server", "username", "password", "database"],
        "optional": ["connectionVariable"],
        "defaults": {"connectionVariable": "mssql_conn"},
        "desc": {},
        "example": {"server": "localhost", "username": "sa", "password": "{p}", "database": "test"},
        "combo": "",
    },
    "sqlserver_query": {
        "required": ["connectionVariable", "sql"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "mssql_conn", "resultVariable": "mssql_result"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn", "sql": "SELECT GETDATE()"},
        "combo": "",
    },
    "sqlserver_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "mssql_conn"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn"},
        "combo": "",
    },

    # SQLite
    "sqlite_connect": {
        "required": ["dbPath"],
        "optional": ["connectionVariable"],
        "defaults": {"connectionVariable": "sqlite_conn"},
        "desc": {"dbPath": "SQLite 数据库文件路径"},
        "example": {"dbPath": "D:\\\\app.db"},
        "combo": "",
    },
    "sqlite_query": {
        "required": ["connectionVariable", "sql"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "sqlite_conn", "resultVariable": "sqlite_result"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn", "sql": "SELECT * FROM users"},
        "combo": "",
    },
    "sqlite_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "sqlite_conn"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn"},
        "combo": "",
    },

    # Redis
    "redis_connect": {
        "required": ["host"],
        "optional": ["port", "password", "db", "connectionVariable"],
        "defaults": {"port": 6379, "db": 0, "connectionVariable": "redis_conn"},
        "desc": {},
        "example": {"host": "localhost"},
        "combo": "",
    },
    "redis_get": {
        "required": ["connectionVariable", "key"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "redis_conn", "resultVariable": "redis_value"},
        "desc": {},
        "example": {"connectionVariable": "redis_conn", "key": "session:1"},
        "combo": "",
    },
    "redis_set": {
        "required": ["connectionVariable", "key", "value"],
        "optional": ["expiry"],
        "defaults": {"connectionVariable": "redis_conn"},
        "desc": {"expiry": "过期秒数（可选）"},
        "example": {"connectionVariable": "redis_conn", "key": "k", "value": "{v}"},
        "combo": "",
    },
    "redis_disconnect": {
        "required": ["connectionVariable"],
        "optional": [],
        "defaults": {"connectionVariable": "redis_conn"},
        "desc": {},
        "example": {"connectionVariable": "redis_conn"},
        "combo": "",
    },

    # 字符串高级
    "string_trim": {
        "required": ["text"],
        "optional": ["mode", "resultVariable"],
        "defaults": {"mode": "both", "resultVariable": "trimmed_string"},
        "desc": {"mode": "left/right/both"},
        "example": {"text": "  hello  "},
        "combo": "",
    },
    "string_case": {
        "required": ["text", "operation"],
        "optional": ["resultVariable"],
        "defaults": {"operation": "upper", "resultVariable": "cased_string"},
        "desc": {"operation": "upper/lower/title/capitalize"},
        "example": {"text": "{name}", "operation": "title"},
        "combo": "",
    },
    "string_substring": {
        "required": ["text", "start"],
        "optional": ["length", "end", "resultVariable"],
        "defaults": {"resultVariable": "sub_string"},
        "desc": {"start": "起始索引", "length": "长度", "end": "结束索引"},
        "example": {"text": "{full}", "start": 0, "length": 10},
        "combo": "",
    },

    # 列表高级（更多）
    "list_chunk": {
        "required": ["listVariable", "size"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "chunks"},
        "desc": {"size": "每块大小"},
        "example": {"listVariable": "items", "size": 10},
        "combo": "分批处理大列表用",
    },
    "list_flatten": {
        "required": ["listVariable"],
        "optional": ["depth", "resultVariable"],
        "defaults": {"depth": 1, "resultVariable": "flat_list"},
        "desc": {"depth": "扁平层数"},
        "example": {"listVariable": "nested"},
        "combo": "",
    },
    "list_remove_empty": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "filtered_list"},
        "desc": {},
        "example": {"listVariable": "items"},
        "combo": "",
    },
    "list_intersection": {
        "required": ["lists"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "intersection"},
        "desc": {"lists": "列表数组"},
        "example": {"lists": ["a", "b"]},
        "combo": "",
    },
    "list_difference": {
        "required": ["listA", "listB"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "difference"},
        "desc": {},
        "example": {"listA": "old", "listB": "new"},
        "combo": "",
    },

    # 实用工具
    "set_clipboard": {
        "required": ["content"],
        "optional": [],
        "defaults": {},
        "desc": {"content": "要复制的内容"},
        "example": {"content": "{result}"},
        "combo": "",
    },
    "get_clipboard": {
        "required": [],
        "optional": ["variableName"],
        "defaults": {"variableName": "clipboard_content"},
        "desc": {},
        "example": {"variableName": "txt"},
        "combo": "",
    },
    "shutdown_system": {
        "required": [],
        "optional": ["mode", "delay"],
        "defaults": {"mode": "shutdown", "delay": 0},
        "desc": {"mode": "shutdown/restart/logoff/lock", "delay": "延迟秒数"},
        "example": {"mode": "shutdown", "delay": 60},
        "combo": "",
    },
    "lock_screen": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": ""},

    # 自定义模块（让 AI 知道这是个特殊节点）
    "custom_module": {
        "required": ["customModuleId"],
        "optional": ["parameterValues"],
        "defaults": {},
        "desc": {"customModuleId": "用户自定义模块的 ID", "parameterValues": "传入的参数 dict"},
        "example": {"customModuleId": "my_login_flow"},
        "combo": "复用用户预先封装的流程",
    },

    # 便签 / 分组（视觉辅助）
    "note": {
        "required": ["content"],
        "optional": ["color", "fontSize", "fontBold"],
        "defaults": {"color": "#fef08a", "fontSize": 13},
        "desc": {"content": "便签文字"},
        "example": {"content": "这部分是数据采集"},
        "combo": "",
    },
    "group": {
        "required": [],
        "optional": ["label", "color"],
        "defaults": {"color": "#3b82f6"},
        "desc": {"label": "分组标签"},
        "example": {"label": "登录阶段"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXTRA2_SCHEMAS)


# ============================================================
# 第八批：yt-dlp / SAP 扩展 / 列表数学高级 / 字符串工具
# ============================================================

EXTRA3_SCHEMAS: dict = {
    # yt-dlp 视频下载
    "ytdlp_download": {
        "required": ["url"],
        "optional": ["format", "outputDir", "fileName", "resultVariable"],
        "defaults": {"format": "best", "resultVariable": "downloaded_video"},
        "desc": {"format": "best/worst/720p/1080p 等"},
        "example": {"url": "https://www.youtube.com/watch?v=...", "outputDir": "D:\\\\videos"},
        "combo": "",
    },
    "ytdlp_download_audio": {
        "required": ["url"],
        "optional": ["format", "outputDir", "resultVariable"],
        "defaults": {"format": "mp3", "resultVariable": "downloaded_audio"},
        "desc": {},
        "example": {"url": "https://...", "format": "mp3"},
        "combo": "",
    },
    "ytdlp_get_info": {
        "required": ["url"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "video_info"},
        "desc": {},
        "example": {"url": "https://..."},
        "combo": "",
    },
    "ytdlp_download_subtitle": {
        "required": ["url"],
        "optional": ["language", "outputDir"],
        "defaults": {"language": "zh"},
        "desc": {},
        "example": {"url": "https://...", "language": "en"},
        "combo": "",
    },

    # SAP 扩展
    "sap_get_status_message": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "status_message"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "sap_get_title": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "title_text"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "sap_close_warning": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "sap_set_checkbox": {
        "required": ["fieldId", "checked"],
        "optional": [],
        "defaults": {"checked": True},
        "desc": {},
        "example": {"fieldId": "BTN-X", "checked": True},
        "combo": "",
    },
    "sap_select_combobox": {
        "required": ["fieldId", "value"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"fieldId": "CB-1", "value": "OPT_A"},
        "combo": "",
    },
    "sap_send_vkey": {
        "required": ["vkey"],
        "optional": [],
        "defaults": {},
        "desc": {"vkey": "F1-F12 或 ENTER"},
        "example": {"vkey": "F8"},
        "combo": "",
    },
    "sap_read_gridview": {
        "required": ["gridId"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "grid_data"},
        "desc": {},
        "example": {"gridId": "GRID-1"},
        "combo": "",
    },
    "sap_export_gridview_excel": {
        "required": ["gridId", "filePath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "export_path"},
        "desc": {},
        "example": {"gridId": "GRID-1", "filePath": "D:\\\\out.xlsx"},
        "combo": "",
    },
    "sap_set_focus": {
        "required": ["fieldId"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"fieldId": "F-1"},
        "combo": "",
    },
    "sap_maximize_window": {
        "required": [],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },

    # 列表数学高级
    "list_shuffle": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "shuffled_list"},
        "desc": {},
        "example": {"listVariable": "items"},
        "combo": "",
    },
    "list_sample": {
        "required": ["listVariable", "count"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "sample_list"},
        "desc": {"count": "随机抽取数量"},
        "example": {"listVariable": "items", "count": 5},
        "combo": "",
    },
    "list_find": {
        "required": ["listVariable", "target"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "find_index"},
        "desc": {"target": "要查找的值"},
        "example": {"listVariable": "items", "target": "{x}"},
        "combo": "",
    },
    "list_union": {
        "required": ["lists"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "union_list"},
        "desc": {},
        "example": {"lists": ["a", "b"]},
        "combo": "",
    },
    "list_cartesian_product": {
        "required": ["lists"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "cartesian"},
        "desc": {},
        "example": {"lists": ["colors", "sizes"]},
        "combo": "",
    },

    # 数学进阶
    "math_log": {
        "required": ["value"],
        "optional": ["base", "resultVariable"],
        "defaults": {"base": "e", "resultVariable": "log_result"},
        "desc": {"base": "底数 e/2/10/任意数字"},
        "example": {"value": "{x}", "base": "10"},
        "combo": "",
    },
    "math_trig": {
        "required": ["value", "operation"],
        "optional": ["resultVariable"],
        "defaults": {"operation": "sin", "resultVariable": "trig_result"},
        "desc": {"operation": "sin/cos/tan/asin/acos/atan"},
        "example": {"value": "{x}", "operation": "sin"},
        "combo": "",
    },
    "math_exp": {
        "required": ["value"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "exp_result"},
        "desc": {},
        "example": {"value": "1"},
        "combo": "",
    },
    "math_gcd": {
        "required": ["a", "b"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "gcd_result"},
        "desc": {},
        "example": {"a": "12", "b": "18"},
        "combo": "",
    },
    "math_lcm": {
        "required": ["a", "b"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "lcm_result"},
        "desc": {},
        "example": {"a": "4", "b": "6"},
        "combo": "",
    },
    "math_factorial": {
        "required": ["value"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "factorial_result"},
        "desc": {},
        "example": {"value": "5"},
        "combo": "",
    },
    "math_clamp": {
        "required": ["value", "min", "max"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "clamped_value"},
        "desc": {"min": "下限", "max": "上限"},
        "example": {"value": "{x}", "min": "0", "max": "100"},
        "combo": "",
    },
    "math_base_convert": {
        "required": ["value", "fromBase", "toBase"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "base_result"},
        "desc": {"fromBase": "源进制 2/8/10/16", "toBase": "目标进制"},
        "example": {"value": "FF", "fromBase": "16", "toBase": "10"},
        "combo": "",
    },
    "math_permutation": {
        "required": ["n", "r"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "perm_result"},
        "desc": {"n": "总数", "r": "选取数"},
        "example": {"n": "5", "r": "3"},
        "combo": "",
    },

    # 统计扩展
    "stat_percentile": {
        "required": ["listVariable", "percentile"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "percentile"},
        "desc": {"percentile": "分位数 0-100"},
        "example": {"listVariable": "scores", "percentile": "90"},
        "combo": "",
    },
    "stat_normalize": {
        "required": ["listVariable"],
        "optional": ["min", "max", "resultVariable"],
        "defaults": {"min": "0", "max": "1", "resultVariable": "normalized"},
        "desc": {},
        "example": {"listVariable": "values"},
        "combo": "",
    },
    "stat_standardize": {
        "required": ["listVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "standardized"},
        "desc": {},
        "example": {"listVariable": "values"},
        "combo": "",
    },

    # 字典扩展
    "dict_map_values": {
        "required": ["dictVariable", "expression"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "mapped_dict"},
        "desc": {"expression": "Python 表达式（value 是当前值）"},
        "example": {"dictVariable": "scores", "expression": "value * 1.1"},
        "combo": "",
    },
    "dict_deep_copy": {
        "required": ["dictVariable"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "copied_dict"},
        "desc": {},
        "example": {"dictVariable": "data"},
        "combo": "",
    },

    # 飞书扩展
    "feishu_sheet_read": {
        "required": ["spreadsheetToken", "range"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "sheet_data"},
        "desc": {"range": "如 Sheet1!A1:D10"},
        "example": {"spreadsheetToken": "...", "range": "Sheet1!A1:Z100"},
        "combo": "",
    },
    "feishu_sheet_write": {
        "required": ["spreadsheetToken", "range", "values"],
        "optional": [],
        "defaults": {},
        "desc": {"values": "二维数组"},
        "example": {"spreadsheetToken": "...", "range": "Sheet1!A1", "values": [["a", "b"]]},
        "combo": "",
    },

    # 表格扩展
    "table_set_cell": {
        "required": ["rowIndex", "columnName", "cellValue"],
        "optional": [],
        "defaults": {},
        "desc": {
            "rowIndex": "行索引（0 开始的整数，可填变量）",
            "columnName": "列名",
            "cellValue": "单元格新值（可用 `{变量}` 引用工作流变量）",
        },
        "example": {"rowIndex": 0, "columnName": "状态", "cellValue": "已完成"},
        "combo": "",
    },
    "table_get_cell": {
        "required": ["rowIndex", "columnName"],
        "optional": ["variableName"],
        "defaults": {"variableName": "cell_value"},
        "desc": {
            "rowIndex": "行索引（0 开始）",
            "columnName": "列名",
            "variableName": "把单元格值存到此变量名",
        },
        "example": {"rowIndex": 0, "columnName": "姓名", "variableName": "first_name"},
        "combo": "",
    },
    "table_delete_row": {
        "required": ["rowIndex"],
        "optional": [],
        "defaults": {},
        "desc": {"rowIndex": "要删除的行索引（0 开始）"},
        "example": {"rowIndex": 0},
        "combo": "",
    },
    "table_clear": {"required": [], "optional": [], "defaults": {}, "desc": {}, "example": {}, "combo": "清空整张数据表格"},
}

_ALL_SCHEMAS.update(EXTRA3_SCHEMAS)


# ============================================================
# 第九批：通知扩展 / 桌面应用扩展 / 摄像头 / 共享高级
# ============================================================

EXTRA4_SCHEMAS: dict = {
    # 通知扩展（更多平台）
    "notify_discord": {
        "required": ["webhook", "message"],
        "optional": ["username", "avatar"],
        "defaults": {},
        "desc": {},
        "example": {"webhook": "https://discord.com/api/webhooks/...", "message": "..."},
        "combo": "",
    },
    "notify_msteams": {
        "required": ["webhook", "message"],
        "optional": ["title"],
        "defaults": {},
        "desc": {},
        "example": {"webhook": "...", "message": "..."},
        "combo": "",
    },
    "notify_pushover": {
        "required": ["userKey", "appToken", "message"],
        "optional": ["title", "priority"],
        "defaults": {},
        "desc": {},
        "example": {"userKey": "u...", "appToken": "a...", "message": "..."},
        "combo": "",
    },
    "notify_pushbullet": {
        "required": ["accessToken", "title", "message"],
        "optional": ["targetEmail"],
        "defaults": {},
        "desc": {},
        "example": {"accessToken": "...", "title": "提醒", "message": "..."},
        "combo": "",
    },
    "notify_gotify": {
        "required": ["serverUrl", "appToken", "message"],
        "optional": ["title", "priority"],
        "defaults": {"priority": 5},
        "desc": {},
        "example": {"serverUrl": "https://gotify.example.com", "appToken": "...", "message": "..."},
        "combo": "",
    },
    "notify_pushplus": {
        "required": ["token", "title", "message"],
        "optional": ["channel"],
        "defaults": {},
        "desc": {},
        "example": {"token": "...", "title": "...", "message": "..."},
        "combo": "",
    },
    "notify_webhook": {
        "required": ["url", "message"],
        "optional": ["method", "headers"],
        "defaults": {"method": "POST"},
        "desc": {},
        "example": {"url": "https://your-webhook", "message": "..."},
        "combo": "",
    },
    "notify_ntfy": {
        "required": ["topic", "message"],
        "optional": ["serverUrl", "title", "priority"],
        "defaults": {"serverUrl": "https://ntfy.sh"},
        "desc": {},
        "example": {"topic": "alerts", "message": "..."},
        "combo": "",
    },
    "notify_matrix": {
        "required": ["serverUrl", "accessToken", "roomId", "message"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"serverUrl": "...", "accessToken": "...", "roomId": "!...", "message": "..."},
        "combo": "",
    },
    "notify_rocketchat": {
        "required": ["webhook", "message"],
        "optional": ["channel"],
        "defaults": {},
        "desc": {},
        "example": {"webhook": "...", "message": "..."},
        "combo": "",
    },

    # 摄像头
    "camera_capture": {
        "required": [],
        "optional": ["cameraIndex", "savePath", "saveToVariable"],
        "defaults": {"cameraIndex": 0, "saveToVariable": "camera_photo"},
        "desc": {},
        "example": {"savePath": "D:\\\\photo.jpg"},
        "combo": "",
    },
    "camera_record": {
        "required": ["duration"],
        "optional": ["cameraIndex", "savePath", "saveToVariable"],
        "defaults": {"cameraIndex": 0, "saveToVariable": "camera_video"},
        "desc": {"duration": "录制秒数"},
        "example": {"duration": 10, "savePath": "D:\\\\rec.mp4"},
        "combo": "",
    },

    # AI 网络扩展
    "firecrawl_crawl": {
        "required": ["url"],
        "optional": ["maxPages", "resultVariable"],
        "defaults": {"maxPages": 10, "resultVariable": "firecrawl_pages"},
        "desc": {},
        "example": {"url": "https://example.com"},
        "combo": "",
    },

    # 桌面应用扩展
    "desktop_app_connect": {
        "required": ["windowTitle"],
        "optional": ["timeout"],
        "defaults": {"timeout": 30},
        "desc": {"windowTitle": "已运行应用的窗口标题"},
        "example": {"windowTitle": "记事本"},
        "combo": "替代 desktop_app_start：连接到已经打开的应用",
    },
    "desktop_app_get_info": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "app_info"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "desktop_app_wait_ready": {
        "required": [],
        "optional": ["timeout"],
        "defaults": {"timeout": 30},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "desktop_window_activate": {
        "required": ["windowTitle"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"windowTitle": "记事本"},
        "combo": "",
    },
    "desktop_window_state": {
        "required": ["state"],
        "optional": [],
        "defaults": {},
        "desc": {"state": "minimize/maximize/normal"},
        "example": {"state": "maximize"},
        "combo": "",
    },
    "desktop_window_move": {
        "required": ["x", "y"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"x": 100, "y": 100},
        "combo": "",
    },
    "desktop_window_resize": {
        "required": ["width", "height"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"width": 800, "height": 600},
        "combo": "",
    },
    "desktop_window_list": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "window_list"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "desktop_find_control": {
        "required": ["controlSelector"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 10, "resultVariable": "control_found"},
        "desc": {},
        "example": {"controlSelector": "Button:确定"},
        "combo": "",
    },
    "desktop_control_info": {
        "required": ["controlSelector"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "control_info"},
        "desc": {},
        "example": {"controlSelector": "Button:确定"},
        "combo": "",
    },
    "desktop_control_tree": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "control_tree"},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "desktop_wait_control": {
        "required": ["controlSelector"],
        "optional": ["timeout", "state"],
        "defaults": {"timeout": 30, "state": "visible"},
        "desc": {"state": "visible/enabled"},
        "example": {"controlSelector": "Button:确定"},
        "combo": "",
    },
    "desktop_set_value": {
        "required": ["controlSelector", "value"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"controlSelector": "Edit:数量", "value": "10"},
        "combo": "",
    },
    "desktop_select_combo": {
        "required": ["controlSelector", "value"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"controlSelector": "ComboBox:类型", "value": "选项A"},
        "combo": "",
    },
    "desktop_checkbox": {
        "required": ["controlSelector", "checked"],
        "optional": [],
        "defaults": {"checked": True},
        "desc": {},
        "example": {"controlSelector": "CheckBox:同意", "checked": True},
        "combo": "",
    },
    "desktop_radio": {
        "required": ["controlSelector"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"controlSelector": "RadioButton:男"},
        "combo": "",
    },
    "desktop_drag_control": {
        "required": ["sourceSelector", "targetSelector"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"sourceSelector": "Item:A", "targetSelector": "Pane:B"},
        "combo": "",
    },
    "desktop_menu_click": {
        "required": ["menuPath"],
        "optional": [],
        "defaults": {},
        "desc": {"menuPath": "如 文件>新建"},
        "example": {"menuPath": "文件>退出"},
        "combo": "",
    },
    "desktop_send_keys": {
        "required": ["keys"],
        "optional": [],
        "defaults": {},
        "desc": {"keys": "如 ^c (Ctrl+C) 或 {ENTER}"},
        "example": {"keys": "^s"},
        "combo": "",
    },
    "desktop_get_property": {
        "required": ["controlSelector", "property"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "property_value"},
        "desc": {"property": "属性名 如 Visible/Enabled/Text"},
        "example": {"controlSelector": "Button:确定", "property": "Enabled"},
        "combo": "",
    },
    "desktop_dialog_handle": {
        "required": ["action"],
        "optional": ["text"],
        "defaults": {"action": "ok"},
        "desc": {"action": "ok/cancel/yes/no"},
        "example": {"action": "ok"},
        "combo": "",
    },
    "desktop_list_operate": {
        "required": ["controlSelector", "operation"],
        "optional": ["item"],
        "defaults": {"operation": "select"},
        "desc": {"operation": "select/get_items"},
        "example": {"controlSelector": "ListBox:文件", "operation": "select", "item": "test.txt"},
        "combo": "",
    },

    # 媒体扩展
    "rotate_video": {
        "required": ["videoPath", "angle"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"angle": 90, "resultVariable": "rotated_video"},
        "desc": {"angle": "顺时针 90/180/270"},
        "example": {"videoPath": "{v}", "angle": 90},
        "combo": "",
    },
    "video_speed": {
        "required": ["videoPath", "speed"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"speed": 1.5, "resultVariable": "speed_video"},
        "desc": {"speed": "倍速 0.5/2.0 等"},
        "example": {"videoPath": "{v}", "speed": 2.0},
        "combo": "",
    },
    "add_subtitle": {
        "required": ["videoPath", "subtitlePath"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "subtitled_video"},
        "desc": {"subtitlePath": ".srt 文件"},
        "example": {"videoPath": "{v}", "subtitlePath": "D:\\\\sub.srt"},
        "combo": "",
    },
    "adjust_volume": {
        "required": ["audioPath", "volume"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"volume": 1.0, "resultVariable": "adjusted_audio"},
        "desc": {"volume": "1.0=原音量"},
        "example": {"audioPath": "{a}", "volume": 1.5},
        "combo": "",
    },
    "resize_video": {
        "required": ["videoPath", "width", "height"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"resultVariable": "resized_video"},
        "desc": {},
        "example": {"videoPath": "{v}", "width": 1280, "height": 720},
        "combo": "",
    },
    "video_to_audio": {
        "required": ["videoPath"],
        "optional": ["outputFormat", "outputPath", "resultVariable"],
        "defaults": {"outputFormat": "mp3", "resultVariable": "audio_path"},
        "desc": {},
        "example": {"videoPath": "{v}"},
        "combo": "",
    },
    "video_to_gif": {
        "required": ["videoPath"],
        "optional": ["startTime", "duration", "fps", "outputPath", "resultVariable"],
        "defaults": {"fps": 15, "resultVariable": "gif_path"},
        "desc": {},
        "example": {"videoPath": "{v}", "startTime": "00:00:00", "duration": "5"},
        "combo": "",
    },
    "image_format_convert": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"outputFormat": "png", "resultVariable": "converted_image"},
        "desc": {},
        "example": {"inputPath": "{img}", "outputFormat": "webp"},
        "combo": "",
    },
    "audio_format_convert": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"outputFormat": "mp3", "resultVariable": "converted_audio"},
        "desc": {},
        "example": {"inputPath": "{a}", "outputFormat": "wav"},
        "combo": "",
    },
    "video_format_convert": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"outputFormat": "mp4", "resultVariable": "converted_video"},
        "desc": {},
        "example": {"inputPath": "{v}", "outputFormat": "mkv"},
        "combo": "",
    },
    "batch_format_convert": {
        "required": ["inputDir", "outputFormat"],
        "optional": ["outputDir", "fileType"],
        "defaults": {"fileType": "video"},
        "desc": {"fileType": "video/audio/image"},
        "example": {"inputDir": "D:\\\\src", "outputFormat": "mp4"},
        "combo": "",
    },
    "add_watermark": {
        "required": ["mediaPath", "watermarkType"],
        "optional": ["watermarkText", "watermarkImage", "position", "outputPath", "resultVariable"],
        "defaults": {"watermarkType": "text", "position": "bottom-right", "resultVariable": "watermarked_file"},
        "desc": {"watermarkType": "text/image", "position": "top-left/top-right/bottom-left/bottom-right/center"},
        "example": {"mediaPath": "{v}", "watermarkType": "text", "watermarkText": "© WebRPA"},
        "combo": "",
    },

    # 人脸 / OCR
    "face_recognition": {
        "required": ["imagePath", "knownFacesDir"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "face_match_result"},
        "desc": {},
        "example": {"imagePath": "{img}", "knownFacesDir": "D:\\\\faces"},
        "combo": "有 true/false 两个出口",
    },
    "image_ocr": {
        "required": ["imagePath"],
        "optional": ["language", "resultVariable"],
        "defaults": {"language": "ch_sim", "resultVariable": "ocr_text"},
        "desc": {"language": "ch_sim/en/ja 等"},
        "example": {"imagePath": "{img}"},
        "combo": "",
    },
    "slider_captcha": {
        "required": ["sliderSelector", "trackSelector"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"sliderSelector": ".slider", "trackSelector": ".track"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXTRA4_SCHEMAS)


# ============================================================
# 第十批：把剩下的 78 个全部补齐（达成 100% 覆盖）
# ============================================================

FINAL_SCHEMAS: dict = {
    # 数据库 - MySQL 缺失
    "db_update": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "db_conn", "resultVariable": "update_result"},
        "desc": {"table": "表名", "data": "字段更新 dict", "where": "WHERE 条件 SQL", "params": "参数化"},
        "example": {"connectionVariable": "db_conn", "table": "users", "data": {"name": "Tom"}, "where": "id = %s", "params": [1]},
        "combo": "",
    },
    "db_delete": {
        "required": ["connectionVariable", "table"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "db_conn", "resultVariable": "delete_result"},
        "desc": {},
        "example": {"connectionVariable": "db_conn", "table": "logs", "where": "id < %s", "params": [100]},
        "combo": "",
    },

    # 数据库（其它驱动）的增/删/改/执行
    "oracle_insert": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "oracle_conn", "resultVariable": "oracle_insert_result"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn", "table": "USERS", "data": {"NAME": "Tom"}},
        "combo": "",
    },
    "oracle_update": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "oracle_conn", "resultVariable": "oracle_update_result"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn", "table": "USERS", "data": {"NAME": "Tom"}, "where": "ID = :1", "params": [1]},
        "combo": "",
    },
    "oracle_delete": {
        "required": ["connectionVariable", "table"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "oracle_conn", "resultVariable": "oracle_delete_result"},
        "desc": {},
        "example": {"connectionVariable": "oracle_conn", "table": "LOGS"},
        "combo": "",
    },
    "postgresql_execute": {
        "required": ["connectionVariable", "sql"],
        "optional": ["params", "resultVariable"],
        "defaults": {"connectionVariable": "pg_conn", "resultVariable": "pg_affected"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn", "sql": "UPDATE users SET active = %s", "params": [True]},
        "combo": "",
    },
    "postgresql_insert": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "pg_conn", "resultVariable": "pg_insert_result"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn", "table": "users", "data": {"name": "Tom"}},
        "combo": "",
    },
    "postgresql_update": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "pg_conn", "resultVariable": "pg_update_result"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn", "table": "users", "data": {"active": False}, "where": "id = %s", "params": [1]},
        "combo": "",
    },
    "postgresql_delete": {
        "required": ["connectionVariable", "table"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "pg_conn", "resultVariable": "pg_delete_result"},
        "desc": {},
        "example": {"connectionVariable": "pg_conn", "table": "logs"},
        "combo": "",
    },
    "mongodb_insert": {
        "required": ["connectionVariable", "collection", "document"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "mongo_conn", "resultVariable": "mongo_insert_id"},
        "desc": {"document": "要插入的字典或字典数组"},
        "example": {"connectionVariable": "mongo_conn", "collection": "users", "document": {"name": "Tom"}},
        "combo": "",
    },
    "mongodb_update": {
        "required": ["connectionVariable", "collection", "filter", "update"],
        "optional": ["multi", "resultVariable"],
        "defaults": {"connectionVariable": "mongo_conn", "multi": False, "resultVariable": "mongo_update_result"},
        "desc": {"filter": "查询条件 dict", "update": "更新文档（含 $set）", "multi": "是否批量更新"},
        "example": {"connectionVariable": "mongo_conn", "collection": "users", "filter": {"_id": "..."}, "update": {"$set": {"age": 20}}},
        "combo": "",
    },
    "mongodb_delete": {
        "required": ["connectionVariable", "collection", "filter"],
        "optional": ["multi", "resultVariable"],
        "defaults": {"connectionVariable": "mongo_conn", "multi": False, "resultVariable": "mongo_delete_result"},
        "desc": {},
        "example": {"connectionVariable": "mongo_conn", "collection": "logs", "filter": {"level": "debug"}},
        "combo": "",
    },
    "sqlserver_execute": {
        "required": ["connectionVariable", "sql"],
        "optional": ["params", "resultVariable"],
        "defaults": {"connectionVariable": "mssql_conn", "resultVariable": "mssql_affected"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn", "sql": "UPDATE users SET status = ?", "params": ["active"]},
        "combo": "",
    },
    "sqlserver_insert": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "mssql_conn", "resultVariable": "mssql_insert_result"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn", "table": "users", "data": {"name": "Tom"}},
        "combo": "",
    },
    "sqlserver_update": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "mssql_conn", "resultVariable": "mssql_update_result"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn", "table": "users", "data": {"active": False}, "where": "id = ?", "params": [1]},
        "combo": "",
    },
    "sqlserver_delete": {
        "required": ["connectionVariable", "table"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "mssql_conn", "resultVariable": "mssql_delete_result"},
        "desc": {},
        "example": {"connectionVariable": "mssql_conn", "table": "logs"},
        "combo": "",
    },
    "sqlite_execute": {
        "required": ["connectionVariable", "sql"],
        "optional": ["params", "resultVariable"],
        "defaults": {"connectionVariable": "sqlite_conn", "resultVariable": "sqlite_affected"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn", "sql": "UPDATE users SET active = ?", "params": [True]},
        "combo": "",
    },
    "sqlite_insert": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "sqlite_conn", "resultVariable": "sqlite_insert_result"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn", "table": "users", "data": {"name": "Tom"}},
        "combo": "",
    },
    "sqlite_update": {
        "required": ["connectionVariable", "table", "data"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "sqlite_conn", "resultVariable": "sqlite_update_result"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn", "table": "users", "data": {"active": False}, "where": "id = ?", "params": [1]},
        "combo": "",
    },
    "sqlite_delete": {
        "required": ["connectionVariable", "table"],
        "optional": ["where", "params", "resultVariable"],
        "defaults": {"connectionVariable": "sqlite_conn", "resultVariable": "sqlite_delete_result"},
        "desc": {},
        "example": {"connectionVariable": "sqlite_conn", "table": "logs"},
        "combo": "",
    },
    "redis_del": {
        "required": ["connectionVariable", "key"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "redis_conn", "resultVariable": "redis_del_result"},
        "desc": {},
        "example": {"connectionVariable": "redis_conn", "key": "session:1"},
        "combo": "",
    },
    "redis_hget": {
        "required": ["connectionVariable", "key", "field"],
        "optional": ["resultVariable"],
        "defaults": {"connectionVariable": "redis_conn", "resultVariable": "redis_hash_value"},
        "desc": {},
        "example": {"connectionVariable": "redis_conn", "key": "user:1", "field": "name"},
        "combo": "",
    },
    "redis_hset": {
        "required": ["connectionVariable", "key", "field", "value"],
        "optional": [],
        "defaults": {"connectionVariable": "redis_conn"},
        "desc": {},
        "example": {"connectionVariable": "redis_conn", "key": "user:1", "field": "name", "value": "Tom"},
        "combo": "",
    },

    # 网页基础（缺失）
    "page_load_complete": {
        "required": [],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 30, "resultVariable": "page_loaded"},
        "desc": {"timeout": "最大等待秒数"},
        "example": {"timeout": 30},
        "combo": "比 wait_page_load 严格：会判断 networkidle",
    },
    "save_image": {
        "required": ["selector", "savePath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "saved_image_path"},
        "desc": {"selector": "<img> 选择器", "savePath": "保存绝对路径"},
        "example": {"selector": "img.product", "savePath": "D:\\\\img.jpg"},
        "combo": "",
    },
    "wait_image": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "resultVariable"],
        "defaults": {"confidence": 0.85, "timeout": 30, "resultVariable": "image_appeared"},
        "desc": {},
        "example": {"imagePath": "D:\\\\target.png"},
        "combo": "",
    },

    # 网页高级（缺失）
    "get_child_elements": {
        "required": ["parentSelector"],
        "optional": ["childSelector", "resultVariable"],
        "defaults": {"resultVariable": "child_elements"},
        "desc": {"parentSelector": "父元素 selector", "childSelector": "可选：进一步过滤子元素的 selector"},
        "example": {"parentSelector": "ul.list", "childSelector": "li"},
        "combo": "",
    },
    "get_sibling_elements": {
        "required": ["selector"],
        "optional": ["direction", "resultVariable"],
        "defaults": {"direction": "all", "resultVariable": "sibling_elements"},
        "desc": {"direction": "all/prev/next"},
        "example": {"selector": ".active"},
        "combo": "",
    },
    "drag_image": {
        "required": ["sourceImagePath", "targetX", "targetY"],
        "optional": ["confidence", "duration", "resultVariable"],
        "defaults": {"confidence": 0.85, "duration": 0.5, "resultVariable": "image_dragged"},
        "desc": {"sourceImagePath": "起点图片", "targetX": "终点 X 像素", "targetY": "终点 Y"},
        "example": {"sourceImagePath": "D:\\\\drag.png", "targetX": 800, "targetY": 600},
        "combo": "",
    },
    "hover_image": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "resultVariable"],
        "defaults": {"confidence": 0.85, "timeout": 10, "resultVariable": "image_hovered"},
        "desc": {},
        "example": {"imagePath": "D:\\\\menu.png"},
        "combo": "",
    },
    "hover_text": {
        "required": ["text"],
        "optional": ["timeout", "resultVariable"],
        "defaults": {"timeout": 10, "resultVariable": "text_hovered"},
        "desc": {},
        "example": {"text": "更多"},
        "combo": "",
    },

    # PDF（缺失）
    "pdf_compress": {
        "required": ["pdfPath", "outputPath"],
        "optional": ["quality", "resultVariable"],
        "defaults": {"quality": "screen", "resultVariable": "compressed_pdf"},
        "desc": {"quality": "screen/ebook/printer/prepress"},
        "example": {"pdfPath": "{pdf}", "outputPath": "D:\\\\small.pdf"},
        "combo": "",
    },
    "pdf_encrypt": {
        "required": ["pdfPath", "outputPath", "password"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"pdfPath": "{pdf}", "outputPath": "D:\\\\enc.pdf", "password": "{pwd}"},
        "combo": "",
    },
    "pdf_decrypt": {
        "required": ["pdfPath", "outputPath", "password"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"pdfPath": "{enc}", "outputPath": "D:\\\\out.pdf", "password": "{pwd}"},
        "combo": "",
    },
    "pdf_rotate": {
        "required": ["pdfPath", "angle"],
        "optional": ["pageRange", "outputPath"],
        "defaults": {"angle": 90},
        "desc": {"angle": "90/180/270", "pageRange": "页范围如 1-3"},
        "example": {"pdfPath": "{pdf}", "angle": 90},
        "combo": "",
    },
    "pdf_delete_pages": {
        "required": ["pdfPath", "pages", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {"pages": "要删除的页码数组或范围如 [1,3] 或 \"2-5\""},
        "example": {"pdfPath": "{pdf}", "pages": [1, 3], "outputPath": "D:\\\\out.pdf"},
        "combo": "",
    },
    "pdf_insert_pages": {
        "required": ["pdfPath", "insertPdfPath", "position", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {"position": "插入位置（页码，1-based）"},
        "example": {"pdfPath": "{a}", "insertPdfPath": "{b}", "position": 3, "outputPath": "D:\\\\merged.pdf"},
        "combo": "",
    },
    "pdf_reorder_pages": {
        "required": ["pdfPath", "newOrder", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {"newOrder": "新页码顺序数组如 [3,1,2,4]"},
        "example": {"pdfPath": "{pdf}", "newOrder": [3, 1, 2], "outputPath": "D:\\\\reordered.pdf"},
        "combo": "",
    },

    # 媒体 / 视频（缺失）
    "play_music": {
        "required": ["audioPath"],
        "optional": ["volume", "loop"],
        "defaults": {"volume": 100, "loop": False},
        "desc": {"loop": "是否循环"},
        "example": {"audioPath": "D:\\\\bgm.mp3"},
        "combo": "",
    },
    "play_video": {
        "required": ["videoPath"],
        "optional": ["volume", "fullscreen"],
        "defaults": {"volume": 100, "fullscreen": False},
        "desc": {},
        "example": {"videoPath": "D:\\\\movie.mp4"},
        "combo": "",
    },
    "view_image": {
        "required": ["imagePath"],
        "optional": ["title"],
        "defaults": {},
        "desc": {},
        "example": {"imagePath": "D:\\\\photo.jpg", "title": "照片"},
        "combo": "",
    },
    "download_m3u8": {
        "required": ["m3u8Url", "outputPath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "downloaded_m3u8"},
        "desc": {"m3u8Url": "M3U8 索引 URL"},
        "example": {"m3u8Url": "https://...m3u8", "outputPath": "D:\\\\v.mp4"},
        "combo": "",
    },
    "ytdlp_list_formats": {
        "required": ["url"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "available_formats"},
        "desc": {},
        "example": {"url": "https://..."},
        "combo": "",
    },
    "ytdlp_download_playlist": {
        "required": ["playlistUrl", "outputDir"],
        "optional": ["format", "resultVariable"],
        "defaults": {"format": "best", "resultVariable": "downloaded_playlist"},
        "desc": {},
        "example": {"playlistUrl": "https://...", "outputDir": "D:\\\\videos"},
        "combo": "",
    },

    # 图像处理（缺失）
    "image_color_balance": {
        "required": ["inputPath"],
        "optional": ["red", "green", "blue", "outputPath", "resultVariable"],
        "defaults": {"red": 1.0, "green": 1.0, "blue": 1.0, "resultVariable": "balanced_image"},
        "desc": {"red/green/blue": "通道增益 1.0=原值"},
        "example": {"inputPath": "{img}", "red": 1.2},
        "combo": "",
    },
    "image_convert_format": {
        "required": ["inputPath", "outputFormat"],
        "optional": ["outputPath", "quality", "resultVariable"],
        "defaults": {"outputFormat": "png", "quality": 90, "resultVariable": "converted_image"},
        "desc": {"outputFormat": "png/jpg/webp/bmp/gif"},
        "example": {"inputPath": "{img}", "outputFormat": "webp"},
        "combo": "",
    },
    "image_filter": {
        "required": ["inputPath", "filter"],
        "optional": ["outputPath", "resultVariable"],
        "defaults": {"filter": "sharpen", "resultVariable": "filtered_image"},
        "desc": {"filter": "sharpen/blur/edge_enhance/find_edges/contour/emboss/sepia"},
        "example": {"inputPath": "{img}", "filter": "sepia"},
        "combo": "",
    },
    "image_merge": {
        "required": ["images", "outputPath"],
        "optional": ["direction", "resultVariable"],
        "defaults": {"direction": "horizontal", "resultVariable": "merged_image"},
        "desc": {"direction": "horizontal/vertical/grid", "images": "图片路径数组"},
        "example": {"images": ["a.png", "b.png"], "outputPath": "D:\\\\merged.png"},
        "combo": "",
    },
    "image_sharpen": {
        "required": ["inputPath"],
        "optional": ["factor", "outputPath", "resultVariable"],
        "defaults": {"factor": 2.0, "resultVariable": "sharpened_image"},
        "desc": {"factor": ">1 锐化, =1 原图, <1 模糊"},
        "example": {"inputPath": "{img}", "factor": 2.0},
        "combo": "",
    },

    # 文档转换（缺失）
    "docx_to_html": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{docx}", "outputPath": "D:\\\\out.html"},
        "combo": "",
    },
    "html_to_docx": {
        "required": ["inputPath", "outputPath"],
        "optional": ["referenceDoc"],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{html}", "outputPath": "D:\\\\out.docx"},
        "combo": "",
    },
    "markdown_to_epub": {
        "required": ["inputPath", "outputPath"],
        "optional": ["title", "author"],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{md}", "outputPath": "D:\\\\book.epub", "title": "我的书"},
        "combo": "",
    },
    "epub_to_markdown": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{epub}", "outputPath": "D:\\\\out.md"},
        "combo": "",
    },
    "latex_to_pdf": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{tex}", "outputPath": "D:\\\\paper.pdf"},
        "combo": "",
    },
    "rst_to_html": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{rst}", "outputPath": "D:\\\\out.html"},
        "combo": "",
    },
    "org_to_html": {
        "required": ["inputPath", "outputPath"],
        "optional": [],
        "defaults": {},
        "desc": {},
        "example": {"inputPath": "{org}", "outputPath": "D:\\\\out.html"},
        "combo": "",
    },
    "universal_doc_convert": {
        "required": ["inputPath", "outputPath"],
        "optional": ["fromFormat", "toFormat"],
        "defaults": {},
        "desc": {"fromFormat/toFormat": "源/目标格式（不填靠后缀自动判断），支持几十种 pandoc 格式"},
        "example": {"inputPath": "{file}", "outputPath": "D:\\\\out.docx"},
        "combo": "",
    },

    # 桌面应用（缺失）
    "desktop_get_control_info": {
        "required": ["controlSelector"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "control_info"},
        "desc": {},
        "example": {"controlSelector": "Button:确定"},
        "combo": "",
    },
    "desktop_get_control_tree": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "control_tree"},
        "desc": {},
        "example": {},
        "combo": "整棵控件树用于 AI 找到目标元素",
    },
    "desktop_scroll_control": {
        "required": ["controlSelector", "direction"],
        "optional": ["amount"],
        "defaults": {"direction": "down", "amount": 3},
        "desc": {"direction": "up/down", "amount": "滚动次数"},
        "example": {"controlSelector": "ListBox:1", "direction": "down"},
        "combo": "",
    },
    "desktop_window_topmost": {
        "required": ["windowTitle"],
        "optional": ["topmost"],
        "defaults": {"topmost": True},
        "desc": {"topmost": "true=置顶 false=取消"},
        "example": {"windowTitle": "记事本", "topmost": True},
        "combo": "",
    },

    # 手机自动化（缺失）
    "phone_image_exists": {
        "required": ["imagePath"],
        "optional": ["confidence", "timeout", "deviceId", "resultVariable"],
        "defaults": {"confidence": 0.85, "timeout": 5, "resultVariable": "phone_image_exists"},
        "desc": {},
        "example": {"imagePath": "D:\\\\target.png"},
        "combo": "前置判断，后接 condition",
    },
    "phone_click_text": {
        "required": ["text"],
        "optional": ["timeout", "deviceId", "resultVariable"],
        "defaults": {"timeout": 10, "resultVariable": "phone_text_clicked"},
        "desc": {"text": "OCR 识别的目标文字"},
        "example": {"text": "确定"},
        "combo": "",
    },
    "phone_pull_file": {
        "required": ["remotePath", "localPath"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"remotePath": "手机端路径", "localPath": "本地保存路径"},
        "example": {"remotePath": "/sdcard/DCIM/Camera/", "localPath": "D:\\\\photos"},
        "combo": "",
    },
    "phone_push_file": {
        "required": ["localPath", "remotePath"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {},
        "example": {"localPath": "D:\\\\file.txt", "remotePath": "/sdcard/file.txt"},
        "combo": "",
    },
    "phone_set_brightness": {
        "required": ["level"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"level": "0-255"},
        "example": {"level": 200},
        "combo": "",
    },
    "phone_set_volume": {
        "required": ["volumeType", "level"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {"volumeType": "media/ring/alarm/notification", "level": "0-15"},
        "example": {"volumeType": "media", "level": 10},
        "combo": "",
    },
    "phone_start_mirror": {
        "required": [],
        "optional": ["deviceId", "maxSize", "bitRate"],
        "defaults": {"maxSize": 1920, "bitRate": "8M"},
        "desc": {"maxSize": "投屏最大边像素", "bitRate": "码率"},
        "example": {},
        "combo": "",
    },
    "phone_stop_mirror": {
        "required": [],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {},
        "example": {},
        "combo": "",
    },
    "phone_uninstall_app": {
        "required": ["packageName"],
        "optional": ["deviceId"],
        "defaults": {},
        "desc": {},
        "example": {"packageName": "com.example"},
        "combo": "",
    },

    # QQ（缺失）
    "qq_get_group_members": {
        "required": ["groupId"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "qq_group_members"},
        "desc": {},
        "example": {"groupId": "123456"},
        "combo": "",
    },
    "qq_get_login_info": {
        "required": [],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "qq_login_info"},
        "desc": {},
        "example": {},
        "combo": "",
    },

    # SAP（缺失）
    "sap_select_tab": {
        "required": ["tabId"],
        "optional": [],
        "defaults": {},
        "desc": {"tabId": "选项卡 ID"},
        "example": {"tabId": "TAB-1"},
        "combo": "",
    },

    # 文件对比 / 系统（缺失）
    "folder_hash_compare": {
        "required": ["folder1", "folder2"],
        "optional": ["algorithm", "resultVariable"],
        "defaults": {"algorithm": "md5", "resultVariable": "folder_hash_result"},
        "desc": {"algorithm": "md5/sha1/sha256"},
        "example": {"folder1": "D:\\\\a", "folder2": "D:\\\\b"},
        "combo": "",
    },
    "folder_diff_compare": {
        "required": ["folder1", "folder2"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "folder_diff_result"},
        "desc": {},
        "example": {"folder1": "D:\\\\a", "folder2": "D:\\\\b"},
        "combo": "",
    },
    "export_log": {
        "required": ["filePath"],
        "optional": ["format", "includeTimestamp", "includeLevel", "includeDuration"],
        "defaults": {"format": "txt", "includeTimestamp": True, "includeLevel": True, "includeDuration": False},
        "desc": {"format": "txt/json/csv"},
        "example": {"filePath": "D:\\\\workflow.log"},
        "combo": "",
    },

    # 流程控制（缺失）
    "infinite_loop": {
        "required": [],
        "optional": ["maxIterations"],
        "defaults": {"maxIterations": 10000},
        "desc": {"maxIterations": "保险上限，防真无限"},
        "example": {},
        "combo": "需要在循环体里用 break_loop 跳出，否则会跑到上限",
    },

    # 列表（缺失）
    "list_export": {
        "required": ["listVariable", "filePath"],
        "optional": ["format"],
        "defaults": {"format": "txt"},
        "desc": {"format": "txt/csv/json"},
        "example": {"listVariable": "items", "filePath": "D:\\\\out.txt"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(FINAL_SCHEMAS)


# ============================================================================
# 自动修复补丁：用真实执行器代码扫描出的精确字段名覆盖那些字段名错误的 schema
# 由 backend/_autofix_schemas.py 生成，包含 338 个 schema 的字段名校准。
# 加载顺序在最后，会覆盖前面所有 schema 中字段名不准的部分。
# 涉及模块：input_prompt / python_script / print_log / wait / api_request /
#         send_email / read_excel / set_variable / set_clipboard / 等 300+ 个
# ============================================================================
try:
    from app.services.ai_assistant_module_schemas_autofix import AUTOFIX_SCHEMAS
    _ALL_SCHEMAS.update(AUTOFIX_SCHEMAS)
except ImportError:
    pass  # autofix 文件可能不存在（开发环境跳过）



# ============================================================================
# 高优先级常用模块的精确 schema（手工校准，覆盖 autofix）
# 这些是 AI 搭建工作流最常用的模块，必填字段、字段说明、example、combo 全部精准
# ============================================================================

PRIORITY_SCHEMAS: dict = {
    "wait": {
        "required": ["waitDuration"],
        "optional": ["waitType"],
        "defaults": {"waitType": "fixed", "waitDuration": 1},
        "desc": {
            "waitDuration": "等待秒数(数字,例如 2 表示 2 秒)",
            "waitType": "fixed(固定等待)",
        },
        "example": {"waitDuration": 2, "waitType": "fixed"},
        "combo": "调试用,生产环境优先用 wait_element / wait_page_load",
    },
    "set_variable": {
        "required": ["variableName", "variableValue"],
        "optional": [],
        "defaults": {},
        "desc": {
            "variableName": "变量名(例如 user_name)",
            "variableValue": "变量值(支持字符串/数字/布尔/JSON 字面量,也支持 {var} 引用其它变量)",
        },
        "example": {"variableName": "counter", "variableValue": 0},
        "combo": "设置初始变量;循环计数器初始化",
    },
    "print_log": {
        "required": ["logMessage"],
        "optional": ["logLevel"],
        "defaults": {"logLevel": "info"},
        "desc": {
            "logMessage": "日志正文,可用 {var_name} 引用上游变量,例如 '阶乘 = {factorial_result}'",
            "logLevel": "info / warning / error / success / debug",
        },
        "example": {"logMessage": "处理到第 {i} 项: {item}", "logLevel": "info"},
        "combo": "调试必备,几乎每一步重要操作后都要 print_log",
    },
    "input_prompt": {
        "required": ["variableName"],
        "optional": ["promptTitle", "promptMessage", "defaultValue", "inputMode", "minValue", "maxValue", "maxLength", "required", "selectOptions"],
        "defaults": {
            "promptTitle": "请输入",
            "promptMessage": "请输入值:",
            "inputMode": "single",
            "required": True,
        },
        "desc": {
            "variableName": "**必填**:输入值会存到这个变量名,后续节点用 {variableName} 引用",
            "promptTitle": "弹窗标题",
            "promptMessage": "弹窗正文(提示用户该输入什么)",
            "inputMode": "single(单行) / multiline / number / integer / password / list / file / folder / checkbox / slider_int / slider_float / select_single / select_multiple",
            "defaultValue": "默认填入值",
            "minValue": "数字/滑动条模式下的最小值",
            "maxValue": "数字/滑动条模式下的最大值",
            "selectOptions": "select_single/select_multiple 模式的选项数组",
        },
        "example": {
            "variableName": "user_input",
            "promptTitle": "输入数字",
            "promptMessage": "请输入要计算阶乘的非负整数",
            "inputMode": "integer",
            "minValue": 0,
            "maxValue": 100,
        },
        "combo": "工作流第一步常用,让用户输入参数。下游节点用 {variableName} 引用输入值",
    },
    "python_script": {
        "required": ["scriptContent"],
        "optional": ["resultVariable", "scriptMode", "useBuiltinPython", "timeout", "stdoutVariable", "stderrVariable", "returnCodeVariable"],
        "defaults": {
            "scriptMode": "content",
            "useBuiltinPython": True,
            "timeout": 60,
            "resultVariable": "python_result",
        },
        "desc": {
            "scriptContent": (
                "Python 代码字符串。**重要规则**:"
                "(1) 用户代码会被自动包装在 def _user_script(): 函数里,所以使用 `return 值` 把结果回传给 resultVariable;"
                "(2) 想读取上游工作流变量,**必须用 `vars.变量名`**(例如 `vars.user_input` 而不是直接 `user_input`);"
                "(3) 想写入工作流变量,直接 `vars.变量名 = 值`(脚本结束后整套 vars 会自动 sync 回工作流);"
            ),
            "resultVariable": "脚本 return 的值会写入这个工作流变量",
            "scriptMode": "content(直接写代码) 或 file(从文件读取)",
            "useBuiltinPython": "True 用内置 Python313;False 用系统 Python",
            "timeout": "超时秒数",
        },
        "example": {
            "scriptContent": "import math\nn = int(vars.user_input)\nreturn math.factorial(n)",
            "resultVariable": "factorial_result",
            "scriptMode": "content",
            "useBuiltinPython": True,
            "timeout": 60,
        },
        "combo": "前置 input_prompt 用 variableName=user_input 拿用户输入,脚本内 vars.user_input 取值,return 后 resultVariable 接收;后置 print_log 用 logMessage='结果 = {factorial_result}' 显示",
    },
}

_ALL_SCHEMAS.update(PRIORITY_SCHEMAS)



# ============================================================================
# 第二批精确 schema:API/邮件/Excel/数据库/字符串/列表常用
# ============================================================================

PRIORITY_SCHEMAS_2: dict = {
    "api_request": {
        "required": ["requestUrl", "requestMethod"],
        "optional": ["requestHeaders", "requestBody", "requestCookies", "requestTimeout", "verifySSL", "followRedirects", "variableName"],
        "defaults": {"requestMethod": "GET", "requestTimeout": 30, "verifySSL": True, "followRedirects": True, "variableName": "api_response"},
        "desc": {
            "requestUrl": "请求 URL,支持 {var}",
            "requestMethod": "GET / POST / PUT / DELETE / PATCH",
            "requestHeaders": "请求头(JSON 对象字符串,如 {\"Authorization\":\"Bearer xxx\"})",
            "requestBody": "请求体(JSON 字符串或表单字符串)",
            "variableName": "响应 JSON 存到这个变量(后续 json_parse 解析)",
        },
        "example": {"requestUrl": "https://api.example.com/users", "requestMethod": "GET", "requestHeaders": "{\"Accept\":\"application/json\"}", "variableName": "api_data"},
        "combo": "后接 json_parse 解析返回 → foreach 遍历 → print_log 打印每项",
    },
    "send_email": {
        "required": ["recipientEmail", "emailSubject", "emailContent"],
        "optional": ["senderEmail", "authCode"],
        "defaults": {},
        "desc": {
            "recipientEmail": "收件人邮箱(多个用逗号分隔)",
            "emailSubject": "邮件主题",
            "emailContent": "邮件正文(支持 HTML)",
            "senderEmail": "发件人邮箱(留空用全局配置)",
            "authCode": "SMTP 授权码(留空用全局配置)",
        },
        "example": {"recipientEmail": "user@example.com", "emailSubject": "工作流完成", "emailContent": "处理了 {count} 项数据"},
        "combo": "工作流末尾通知用户;失败时发警报",
    },
    "read_excel": {
        "required": ["fileName", "sheetName"],
        "optional": ["readMode", "cellAddress", "startCell", "endCell", "rowIndex", "columnIndex", "startRow", "startCol", "variableName"],
        "defaults": {"readMode": "all", "variableName": "excel_data"},
        "desc": {
            "fileName": "Excel 文件名(已上传到资源)",
            "sheetName": "工作表名",
            "readMode": "all(读全表) / cell(单元格) / range(区域) / row(整行) / column(整列)",
            "cellAddress": "cell 模式下的单元格地址,如 A1",
            "variableName": "读到的数据存到此变量",
        },
        "example": {"fileName": "data.xlsx", "sheetName": "Sheet1", "readMode": "all", "variableName": "rows"},
        "combo": "后接 foreach(listVariable=rows) 遍历每行",
    },
    "json_parse": {
        "required": ["sourceVariable"],
        "optional": ["jsonPath", "columnName", "variableName"],
        "defaults": {"variableName": "parsed_value"},
        "desc": {
            "sourceVariable": "JSON 字符串变量名(例如 api_response)",
            "jsonPath": "JSONPath 表达式,如 $.data.items 或 $.users[0].name",
            "variableName": "解析结果变量名",
        },
        "example": {"sourceVariable": "api_response", "jsonPath": "$.data.items", "variableName": "items"},
        "combo": "前置 api_request 拿到响应;后置 foreach 遍历 items",
    },
    "regex_extract": {
        "required": ["inputText", "pattern"],
        "optional": ["extractMode", "ignoreCase", "variableName"],
        "defaults": {"extractMode": "first", "ignoreCase": False, "variableName": "regex_result"},
        "desc": {
            "inputText": "要匹配的文本(支持 {var})",
            "pattern": "正则表达式",
            "extractMode": "first(取第一个) / all(全部匹配)",
            "variableName": "结果变量名",
        },
        "example": {"inputText": "{html_content}", "pattern": "<title>(.+?)</title>", "extractMode": "first", "variableName": "page_title"},
        "combo": "从 HTML/纯文本里提取结构化数据",
    },
    "string_replace": {
        "required": ["inputText", "searchValue", "replaceValue"],
        "optional": ["replaceAll", "replaceMode", "variableName"],
        "defaults": {"replaceAll": True, "variableName": "replaced_text"},
        "desc": {
            "inputText": "原文本",
            "searchValue": "要替换的内容",
            "replaceValue": "替换后的内容",
            "replaceAll": "是否替换所有匹配",
        },
        "example": {"inputText": "{raw_text}", "searchValue": "old", "replaceValue": "new", "variableName": "cleaned"},
        "combo": "数据清洗常用",
    },
    "string_split": {
        "required": ["inputText", "separator"],
        "optional": ["maxSplit", "variableName"],
        "defaults": {"variableName": "split_result"},
        "desc": {"inputText": "原字符串", "separator": "分隔符,例如 , 或 \\n", "maxSplit": "最多分几段(0=不限)"},
        "example": {"inputText": "{csv_line}", "separator": ",", "variableName": "fields"},
        "combo": "拆 CSV 行;拆 URL 路径段",
    },
    "string_concat": {
        "required": ["string1", "string2"],
        "optional": ["variableName"],
        "defaults": {"variableName": "concat_result"},
        "desc": {"string1": "字符串 1", "string2": "字符串 2"},
        "example": {"string1": "{prefix}", "string2": "{suffix}", "variableName": "full_path"},
        "combo": "拼路径;拼 URL",
    },
    "list_operation": {
        "required": ["listVariable", "listAction"],
        "optional": ["listValue", "listIndex", "resultVariable"],
        "defaults": {"listAction": "append"},
        "desc": {
            "listVariable": "目标列表的变量名",
            "listAction": "append(尾插) / prepend(头插) / pop(尾出) / shift(头出) / remove(按值移除) / clear",
            "listValue": "要插入/移除的值(append/prepend/remove 用)",
            "listIndex": "操作位置索引",
        },
        "example": {"listVariable": "items", "listAction": "append", "listValue": "{new_item}"},
        "combo": "动态构建列表;循环里收集结果",
    },
    "dict_operation": {
        "required": ["dictVariable", "dictAction"],
        "optional": ["dictKey", "dictValue"],
        "defaults": {"dictAction": "set"},
        "desc": {
            "dictVariable": "目标字典的变量名",
            "dictAction": "set(写入键) / delete(删除键) / clear(清空)",
            "dictKey": "键名",
            "dictValue": "值(set 用)",
        },
        "example": {"dictVariable": "user_profile", "dictAction": "set", "dictKey": "name", "dictValue": "{user_name}"},
        "combo": "构建配置字典;累积统计结果",
    },
    "system_notification": {
        "required": ["notifyTitle", "notifyMessage"],
        "optional": ["duration"],
        "defaults": {"duration": 5},
        "desc": {"notifyTitle": "通知标题", "notifyMessage": "通知正文", "duration": "显示秒数"},
        "example": {"notifyTitle": "工作流完成", "notifyMessage": "成功处理 {count} 条记录"},
        "combo": "工作流末尾通知用户;长任务中途反馈进度",
    },
    "set_clipboard": {
        "required": ["textContent"],
        "optional": ["contentType", "imagePath"],
        "defaults": {"contentType": "text"},
        "desc": {
            "textContent": "要写入剪贴板的文本(支持 {var})",
            "contentType": "text(文本) / image(图片)",
            "imagePath": "image 模式下的图片路径",
        },
        "example": {"textContent": "{result}", "contentType": "text"},
        "combo": "工作流末尾把结果写到剪贴板让用户粘贴",
    },
    "copy_file": {
        "required": ["sourcePath", "targetPath"],
        "optional": ["overwrite", "resultVariable"],
        "defaults": {"overwrite": False},
        "desc": {"sourcePath": "源文件绝对路径", "targetPath": "目标文件绝对路径", "overwrite": "目标已存在时是否覆盖"},
        "example": {"sourcePath": "D:\\\\src\\\\a.txt", "targetPath": "D:\\\\backup\\\\a.txt", "overwrite": True},
        "combo": "备份/批量复制",
    },
    "delete_file": {
        "required": ["filePath"],
        "optional": ["deleteType"],
        "defaults": {"deleteType": "file"},
        "desc": {"filePath": "目标路径", "deleteType": "file(单文件) / folder(整个目录) / glob(通配符)"},
        "example": {"filePath": "D:\\\\temp\\\\old.log", "deleteType": "file"},
        "combo": "高危操作,优先在工作流头部用 confirm 节点确认",
    },
    "extract_table_data": {
        "required": ["tableSelector"],
        "optional": ["headerRow", "includeHeader", "exportToExcel", "excelPath", "variableName"],
        "defaults": {"headerRow": 1, "includeHeader": True, "exportToExcel": False, "variableName": "table_data"},
        "desc": {
            "tableSelector": "表格的 CSS/XPath 选择器(例如 table.data-table)",
            "headerRow": "表头所在行号(1-based)",
            "exportToExcel": "True 自动导出到 Excel 文件",
            "excelPath": "导出路径",
            "variableName": "表格数据存到此变量",
        },
        "example": {"tableSelector": "table.tbl-data", "headerRow": 1, "includeHeader": True, "variableName": "rows"},
        "combo": "网页表格批量采集;后接 foreach 遍历 rows",
    },
    "download_file": {
        "required": ["downloadUrl"],
        "optional": ["downloadMode", "fileName", "savePath", "triggerSelector", "variableName"],
        "defaults": {"downloadMode": "url", "variableName": "download_path"},
        "desc": {
            "downloadUrl": "下载 URL",
            "downloadMode": "url(直接下载) / trigger(点击触发下载)",
            "savePath": "保存目录",
            "fileName": "保存文件名(可空,自动从 URL 取)",
            "triggerSelector": "trigger 模式下的触发按钮选择器",
            "variableName": "下载完成后的本地路径存到此变量",
        },
        "example": {"downloadUrl": "https://example.com/file.zip", "downloadMode": "url", "savePath": "D:\\\\downloads", "variableName": "saved_path"},
        "combo": "批量下载文件",
    },
    "switch_iframe": {
        "required": ["locateBy"],
        "optional": ["iframeSelector", "iframeIndex", "iframeName"],
        "defaults": {"locateBy": "selector"},
        "desc": {
            "locateBy": "selector(选择器) / index(索引) / name(name 属性)",
            "iframeSelector": "iframe 的 CSS/XPath 选择器",
            "iframeIndex": "iframe 的索引(0-based)",
            "iframeName": "iframe 的 name 属性",
        },
        "example": {"locateBy": "selector", "iframeSelector": "iframe#payment"},
        "combo": "进入 iframe 后做操作,操作完用 switch_to_main 切回",
    },
    "inject_javascript": {
        "required": ["javascriptCode"],
        "optional": ["injectMode", "targetUrl", "targetIndex", "saveResult"],
        "defaults": {"injectMode": "current", "saveResult": False},
        "desc": {
            "javascriptCode": "要执行的 JS 代码字符串",
            "injectMode": "current(当前页面) / url(指定 URL 的标签页) / index(指定标签页索引)",
            "saveResult": "True 把 JS return 的值存到 saveResult 指定的变量名",
        },
        "example": {"javascriptCode": "return document.title", "injectMode": "current", "saveResult": "page_title"},
        "combo": "复杂网页交互;读取 window/document 状态",
    },
    "handle_dialog": {
        "required": ["dialogAction"],
        "optional": ["promptText", "saveMessage"],
        "defaults": {"dialogAction": "accept"},
        "desc": {
            "dialogAction": "accept(确定) / dismiss(取消) / prompt(填值后确定)",
            "promptText": "prompt 模式下要填入的文本",
            "saveMessage": "True 把弹窗 message 存到此变量名",
        },
        "example": {"dialogAction": "accept"},
        "combo": "处理 alert/confirm/prompt 弹窗,放在 click 之前预设动作",
    },
}

_ALL_SCHEMAS.update(PRIORITY_SCHEMAS_2)



# ============================================================================
# 现代桌面应用增强模块 schema(Electron / Canvas 应用专用 - 仅热键)
# 注:OCR 文字点击 / 图像匹配点击 / 区域 OCR 已由 click_text / click_image / image_ocr 等通用模块覆盖
# ============================================================================

DESKTOP_MODERN_SCHEMAS: dict = {
    "desktop_hotkey": {
        "required": ["keys"],
        "optional": ["targetWindow", "interval"],
        "defaults": {"interval": 0.05},
        "desc": {
            "keys": "热键组合,用 + 连接,如 'ctrl+s' / 'ctrl+shift+n' / 'alt+f4' / 'win+e'",
            "targetWindow": "可选,先激活该标题的窗口再发送热键",
            "interval": "按键间隔秒",
        },
        "example": {"keys": "ctrl+s", "targetWindow": "Notepad"},
        "combo": "**老应用 / Electron 应用必备**:菜单藏在背后时直接用快捷键(保存/复制/查找)",
    },
}

_ALL_SCHEMAS.update(DESKTOP_MODERN_SCHEMAS)



# ============================================================================
# 影刀级桌面自动化增强模块 schema
# ============================================================================

DESKTOP_PRO_SCHEMAS: dict = {
    "desktop_find_control_smart": {
        "required": [],
        "optional": ["namePattern", "classPattern", "automationId", "controlType", "textContains",
                     "fuzzyMatch", "fuzzyThreshold", "searchDepth", "timeout", "returnAll",
                     "appVariable", "saveToVariable"],
        "defaults": {"appVariable": "desktop_app", "saveToVariable": "desktop_control",
                     "fuzzyMatch": False, "fuzzyThreshold": 0.7, "searchDepth": 15, "timeout": 5,
                     "returnAll": False},
        "desc": {
            "namePattern": "name 通配符,支持 * ?,如 '*登录*' / '确*' / '?保存'",
            "classPattern": "ClassName 通配符",
            "automationId": "AutomationId 精确匹配(最稳定)",
            "controlType": "Button / Edit / ComboBox / ListItem / CheckBox 等",
            "textContains": "name 中必须包含的子串",
            "fuzzyMatch": "True 启用模糊匹配(name 不一致也能找到相似的)",
            "fuzzyThreshold": "模糊匹配阈值 0-1",
            "returnAll": "True 返回所有匹配项的数组,False 只返回评分最高的",
        },
        "example": {"namePattern": "*登录*", "controlType": "Button", "fuzzyMatch": True},
        "combo": "**类型 A 应用核心武器**:相比 desktop_find_control 支持通配符/模糊/多属性组合,准确率高得多;返回时按评分排序自动选最稳的",
    },
    "desktop_extract_table": {
        "required": [],
        "optional": ["containerName", "containerType", "includeColumns", "limit", "scrollToLoad",
                     "appVariable", "variableName"],
        "defaults": {"appVariable": "desktop_app", "containerType": "List",
                     "limit": 1000, "scrollToLoad": False, "variableName": "extracted_data"},
        "desc": {
            "containerName": "容器控件名(可空)",
            "containerType": "List / DataGrid / Tree / Table",
            "includeColumns": "逗号分隔的列名映射,如 '姓名,年龄,部门'",
            "limit": "最多抓取条数",
            "scrollToLoad": "True 滚动加载虚拟列表",
        },
        "example": {"containerType": "DataGrid", "includeColumns": "姓名,年龄,部门", "limit": 500},
        "combo": "**影刀 DataExtraction Wizard 同款**:批量抓取桌面应用的列表/表格数据,后接 foreach 遍历",
    },
    "desktop_get_app_state": {
        "required": [],
        "optional": ["maxDepth", "includeInvisible", "appVariable", "variableName"],
        "defaults": {"appVariable": "desktop_app", "maxDepth": 6, "includeInvisible": False,
                     "variableName": "app_state"},
        "desc": {
            "maxDepth": "控件树深度",
            "includeInvisible": "是否包含不可见控件",
        },
        "example": {"maxDepth": 4, "variableName": "ui_snapshot"},
        "combo": "AI 排错神器:返回完整窗口控件树+焦点位置,让 AI 一眼看清当前 UI 结构",
    },
    "desktop_query_with_xpath": {
        "required": ["xpath"],
        "optional": ["timeout", "appVariable", "saveToVariable"],
        "defaults": {"appVariable": "desktop_app", "saveToVariable": "desktop_control", "timeout": 5},
        "desc": {
            "xpath": "XPath 表达式,如 //Button[@name='登录'] / //*[contains(@name,'确定')] / //Edit[@automationid='UserName']",
        },
        "example": {"xpath": "//Button[contains(@name,'确定')]", "timeout": 5},
        "combo": "影刀 selector 表达式同款:支持属性匹配 + contains 子串 + 任意控件类型 *",
    },
    "desktop_select_text": {
        "required": [],
        "optional": ["selectMode", "controlVariable", "variableName"],
        "defaults": {"controlVariable": "desktop_control", "selectMode": "all", "variableName": "selected_text"},
        "desc": {
            "selectMode": "all(全选 Ctrl+A) / double_click(双击) / range(范围)",
        },
        "example": {"selectMode": "all", "variableName": "doc_content"},
        "combo": "前置 desktop_find_control 拿到 Edit/Document 控件,这步把内容选中复制到变量",
    },
    "desktop_get_focused_control": {
        "required": [],
        "optional": ["saveToVariable"],
        "defaults": {"saveToVariable": "focused_control"},
        "desc": {"saveToVariable": "存储焦点控件信息的变量名"},
        "example": {"saveToVariable": "current_focus"},
        "combo": "动态分析当前活跃元素;用户未指定控件时的兜底方案",
    },
    "desktop_assert_control": {
        "required": ["assertion"],
        "optional": ["expected", "controlVariable"],
        "defaults": {"controlVariable": "desktop_control"},
        "desc": {
            "assertion": "exists(存在) / visible(可见) / enabled(可用) / selected(选中) / text_contains(包含文字) / value_equals(值等于)",
            "expected": "期望值,text_contains 和 value_equals 用",
        },
        "example": {"assertion": "text_contains", "expected": "成功"},
        "combo": "**测试场景必备**:自动化执行后断言界面状态,失败立刻知道哪一步出问题",
    },
}

_ALL_SCHEMAS.update(DESKTOP_PRO_SCHEMAS)


# ============================================================
# Excel 自动化模块（openpyxl）—— excel_create ... excel_set_zoom
# 后端执行器：advanced_openpyxl.py + advanced_openpyxl_pro.py
# ============================================================

EXCEL_SCHEMAS: dict = {
    # ----- 工作簿 / 工作表 -----
    "excel_create": {
        "required": ["filePath"],
        "optional": ["sheetNames", "overwrite"],
        "defaults": {"sheetNames": "Sheet1", "overwrite": False},
        "desc": {"filePath": "新建的 .xlsx 路径", "sheetNames": "工作表名，逗号分隔", "overwrite": "已存在时是否覆盖"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetNames": "数据,汇总"},
        "combo": "后接 excel_write_dicts / excel_write_range 写数据",
    },
    "excel_add_sheet": {
        "required": ["filePath", "sheetName"],
        "optional": [],
        "defaults": {},
        "desc": {"filePath": "Excel 路径", "sheetName": "新工作表名"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "明细"},
        "combo": "",
    },
    "excel_delete_sheet": {
        "required": ["filePath", "sheetName"],
        "optional": [],
        "defaults": {},
        "desc": {"sheetName": "要删除的工作表名"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "Sheet2"},
        "combo": "",
    },
    "excel_rename_sheet": {
        "required": ["filePath", "newName"],
        "optional": ["oldName"],
        "defaults": {},
        "desc": {"oldName": "原名（留空取活动表）", "newName": "新名"},
        "example": {"filePath": "D:\\\\report.xlsx", "oldName": "Sheet1", "newName": "数据"},
        "combo": "",
    },
    "excel_list_sheets": {
        "required": ["filePath"],
        "optional": ["resultVariable"],
        "defaults": {"resultVariable": "sheet_list"},
        "desc": {"resultVariable": "存储工作表名数组的变量"},
        "example": {"filePath": "D:\\\\report.xlsx", "resultVariable": "sheets"},
        "combo": "后接 foreach 遍历工作表",
    },
    "excel_copy_sheet": {
        "required": ["filePath", "sheetName"],
        "optional": ["newName"],
        "defaults": {},
        "desc": {"sheetName": "要复制的工作表", "newName": "副本名称（留空自动）"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "数据", "newName": "数据备份"},
        "combo": "",
    },
    "excel_move_sheet": {
        "required": ["filePath", "sheetName"],
        "optional": ["offset"],
        "defaults": {"offset": 1},
        "desc": {"offset": "移动偏移量，正右负左"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "汇总", "offset": -1},
        "combo": "",
    },
    "excel_set_tab_color": {
        "required": ["filePath", "color"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"color": "十六进制颜色如 FF0000，留空清除", "sheetName": "工作表"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "数据", "color": "FF0000"},
        "combo": "",
    },
    "excel_clear_sheet": {
        "required": ["filePath"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"sheetName": "要清空的工作表（留空活动表）"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "数据"},
        "combo": "",
    },
    "excel_get_info": {
        "required": ["filePath"],
        "optional": ["sheetName", "resultVariable"],
        "defaults": {"resultVariable": "sheet_info"},
        "desc": {"resultVariable": "存储 {maxRow,maxColumn,dimensions,sheets} 的变量"},
        "example": {"filePath": "D:\\\\report.xlsx", "resultVariable": "info"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXCEL_SCHEMAS)


EXCEL_SCHEMAS_2: dict = {
    # ----- 单元格 / 区域 -----
    "excel_write_cell": {
        "required": ["filePath", "cell", "value"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"cell": "单元格地址如 A1", "value": "写入值", "sheetName": "工作表"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "A1", "value": "标题"},
        "combo": "",
    },
    "excel_read_cell": {
        "required": ["filePath", "cell"],
        "optional": ["sheetName", "resultVariable"],
        "defaults": {"resultVariable": "cell_value"},
        "desc": {"cell": "单元格地址如 A1", "resultVariable": "存储读到的值"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "B2", "resultVariable": "v"},
        "combo": "",
    },
    "excel_write_range": {
        "required": ["filePath", "data"],
        "optional": ["sheetName", "startCell"],
        "defaults": {"startCell": "A1"},
        "desc": {"data": "二维数组 JSON 如 [[1,2],[3,4]]", "startCell": "起始单元格"},
        "example": {"filePath": "D:\\\\report.xlsx", "startCell": "A1", "data": "[[\"姓名\",\"年龄\"],[\"张三\",18]]"},
        "combo": "",
    },
    "excel_read_range": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "resultVariable"],
        "defaults": {"resultVariable": "range_data"},
        "desc": {"range": "区域如 A1:C10", "resultVariable": "存储二维数组"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C10", "resultVariable": "data"},
        "combo": "后接 foreach 遍历行",
    },
    "excel_append_row": {
        "required": ["filePath", "rowData"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"rowData": "一维数组 JSON 如 [\"张三\",18,\"北京\"]"},
        "example": {"filePath": "D:\\\\report.xlsx", "rowData": "[\"李四\",22,\"上海\"]"},
        "combo": "循环里逐行追加",
    },
    "excel_write_dicts": {
        "required": ["filePath", "data"],
        "optional": ["sheetName", "writeHeader", "startCell"],
        "defaults": {"writeHeader": True, "startCell": "A1"},
        "desc": {"data": "字典数组 JSON，自动表头", "writeHeader": "是否写表头"},
        "example": {"filePath": "D:\\\\report.xlsx", "data": "[{\"姓名\":\"张三\",\"年龄\":18}]"},
        "combo": "最常用：把采集/查询结果整批写入 Excel",
    },
    "excel_read_dicts": {
        "required": ["filePath"],
        "optional": ["sheetName", "headerRow", "resultVariable"],
        "defaults": {"headerRow": 1, "resultVariable": "records"},
        "desc": {"headerRow": "表头行号", "resultVariable": "存储字典数组"},
        "example": {"filePath": "D:\\\\report.xlsx", "resultVariable": "rows"},
        "combo": "后接 foreach 遍历每条记录(可用 {item.列名})",
    },
    "excel_copy_range": {
        "required": ["filePath", "range", "destCell"],
        "optional": ["sheetName", "destSheet"],
        "defaults": {},
        "desc": {"range": "源区域", "destSheet": "目标表（留空同表）", "destCell": "目标起始单元格"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C5", "destSheet": "汇总", "destCell": "A1"},
        "combo": "",
    },
    "excel_clear_range": {
        "required": ["filePath", "range"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"range": "要清空的区域如 A1:C10"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C10"},
        "combo": "",
    },
    "excel_find_replace": {
        "required": ["filePath", "find"],
        "optional": ["sheetName", "replace", "matchEntire"],
        "defaults": {"matchEntire": False},
        "desc": {"find": "查找内容", "replace": "替换为", "matchEntire": "整格匹配"},
        "example": {"filePath": "D:\\\\report.xlsx", "find": "旧", "replace": "新"},
        "combo": "",
    },
    # ----- 行列 / 公式 -----
    "excel_insert_rows": {
        "required": ["filePath", "rowIndex"],
        "optional": ["sheetName", "count"],
        "defaults": {"count": 1},
        "desc": {"rowIndex": "在第几行前插入", "count": "插入行数"},
        "example": {"filePath": "D:\\\\report.xlsx", "rowIndex": 2, "count": 1},
        "combo": "",
    },
    "excel_delete_rows": {
        "required": ["filePath", "rowIndex"],
        "optional": ["sheetName", "count"],
        "defaults": {"count": 1},
        "desc": {"rowIndex": "起始行号", "count": "删除行数"},
        "example": {"filePath": "D:\\\\report.xlsx", "rowIndex": 5, "count": 2},
        "combo": "",
    },
    "excel_insert_cols": {
        "required": ["filePath", "colIndex"],
        "optional": ["sheetName", "count"],
        "defaults": {"count": 1},
        "desc": {"colIndex": "在第几列前插入", "count": "插入列数"},
        "example": {"filePath": "D:\\\\report.xlsx", "colIndex": 1, "count": 1},
        "combo": "",
    },
    "excel_delete_cols": {
        "required": ["filePath", "colIndex"],
        "optional": ["sheetName", "count"],
        "defaults": {"count": 1},
        "desc": {"colIndex": "起始列号", "count": "删除列数"},
        "example": {"filePath": "D:\\\\report.xlsx", "colIndex": 3, "count": 1},
        "combo": "",
    },
    "excel_hide": {
        "required": ["filePath", "key"],
        "optional": ["sheetName", "target", "hidden"],
        "defaults": {"target": "column", "hidden": True},
        "desc": {"target": "column/row", "key": "列字母或行号(支持 A:C / 1:5)", "hidden": "隐藏或显示"},
        "example": {"filePath": "D:\\\\report.xlsx", "target": "column", "key": "D", "hidden": True},
        "combo": "",
    },
    "excel_set_size": {
        "required": ["filePath", "key", "size"],
        "optional": ["sheetName", "target"],
        "defaults": {"target": "column"},
        "desc": {"target": "column列宽/row行高", "key": "列字母或行号", "size": "尺寸"},
        "example": {"filePath": "D:\\\\report.xlsx", "target": "column", "key": "A", "size": 25},
        "combo": "",
    },
    "excel_set_formula": {
        "required": ["filePath", "cell", "formula"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"cell": "单元格", "formula": "公式，可省略开头="},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "B10", "formula": "=SUM(B1:B9)"},
        "combo": "",
    },
    "excel_read_formula": {
        "required": ["filePath", "cell"],
        "optional": ["sheetName", "mode", "resultVariable"],
        "defaults": {"mode": "value", "resultVariable": "cell_value"},
        "desc": {"cell": "单元格", "mode": "value计算值/formula公式文本"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "B10", "mode": "value", "resultVariable": "total"},
        "combo": "",
    },
    "excel_merge_cells": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "unmerge"],
        "defaults": {"unmerge": False},
        "desc": {"range": "区域如 A1:C1", "unmerge": "true 则取消合并"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C1"},
        "combo": "",
    },
    "excel_freeze_panes": {
        "required": ["filePath"],
        "optional": ["sheetName", "cell"],
        "defaults": {"cell": "A2"},
        "desc": {"cell": "冻结到此单元格左上，A2 冻结首行，None 取消"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "A2"},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXCEL_SCHEMAS_2)


EXCEL_SCHEMAS_3: dict = {
    # ----- 样式 / 格式 / 装饰 -----
    "excel_set_style": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "bold", "italic", "fontSize", "fontName", "fontColor", "bgColor", "alignH", "alignV", "border"],
        "defaults": {"bold": False, "italic": False, "fontSize": 0, "border": False},
        "desc": {"range": "区域", "fontColor": "字色十六进制", "bgColor": "背景色十六进制", "alignH": "left/center/right", "alignV": "top/center/bottom"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C1", "bold": True, "bgColor": "FFFF00", "alignH": "center"},
        "combo": "常用于美化表头",
    },
    "excel_set_border": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "style", "color", "scope"],
        "defaults": {"style": "thin", "color": "000000", "scope": "all"},
        "desc": {"style": "thin/medium/thick/dashed/dotted/double", "scope": "all全部/outline外框"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:C10", "style": "thin", "scope": "all"},
        "combo": "",
    },
    "excel_number_format": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "preset", "customFormat"],
        "defaults": {"preset": "general"},
        "desc": {"preset": "integer/decimal2/thousands/percent/currency_cny/date/datetime/text 等", "customFormat": "自定义格式优先"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "B2:B100", "preset": "currency_cny"},
        "combo": "",
    },
    "excel_set_hyperlink": {
        "required": ["filePath", "cell", "link"],
        "optional": ["sheetName", "display"],
        "defaults": {},
        "desc": {"cell": "单元格", "link": "网址或文件路径", "display": "显示文字"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "A1", "link": "https://example.com", "display": "官网"},
        "combo": "",
    },
    "excel_set_comment": {
        "required": ["filePath", "cell"],
        "optional": ["sheetName", "text", "author"],
        "defaults": {"author": "WebRPA"},
        "desc": {"cell": "单元格", "text": "批注内容（留空清除）", "author": "作者"},
        "example": {"filePath": "D:\\\\report.xlsx", "cell": "A1", "text": "这是表头"},
        "combo": "",
    },
    "excel_add_image": {
        "required": ["filePath", "imagePath"],
        "optional": ["sheetName", "anchor", "width", "height"],
        "defaults": {"anchor": "A1", "width": 0, "height": 0},
        "desc": {"imagePath": "图片路径", "anchor": "锚点单元格", "width": "像素宽(0原始)", "height": "像素高(0原始)"},
        "example": {"filePath": "D:\\\\report.xlsx", "imagePath": "D:\\\\logo.png", "anchor": "E2"},
        "combo": "",
    },
    "excel_add_chart": {
        "required": ["filePath", "dataRange"],
        "optional": ["sheetName", "chartType", "catsRange", "anchor", "title", "titlesFromData"],
        "defaults": {"chartType": "bar", "anchor": "H2", "titlesFromData": True},
        "desc": {"chartType": "bar/column/line/pie/area/scatter", "dataRange": "数据区域", "catsRange": "分类(X轴)区域", "anchor": "放置位置"},
        "example": {"filePath": "D:\\\\report.xlsx", "chartType": "line", "dataRange": "B1:B10", "catsRange": "A2:A10", "anchor": "H2"},
        "combo": "",
    },
    "excel_data_validation": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "validationType", "options", "operator", "formula1", "formula2", "prompt"],
        "defaults": {"validationType": "list"},
        "desc": {"validationType": "list/whole/decimal/textLength", "options": "下拉选项数组JSON", "formula1": "数值约束值1"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "C2:C100", "validationType": "list", "options": "[\"是\",\"否\"]"},
        "combo": "做下拉选项数据录入约束",
    },
    "excel_conditional_format": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "ruleType", "operator", "value1", "value2", "text", "bgColor"],
        "defaults": {"ruleType": "cellIs", "operator": "greaterThan", "bgColor": "FFFF00"},
        "desc": {"ruleType": "cellIs/containsText/colorScale/dataBar", "operator": "greaterThan/lessThan/equal/between", "value1": "比较值"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "B2:B100", "ruleType": "cellIs", "operator": "greaterThan", "value1": "60", "bgColor": "FF0000"},
        "combo": "",
    },
    # ----- 筛选 / 排序 / 去重 -----
    "excel_auto_filter": {
        "required": ["filePath"],
        "optional": ["sheetName", "range"],
        "defaults": {},
        "desc": {"range": "筛选区域(留空清除)"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:D100"},
        "combo": "",
    },
    "excel_sort_range": {
        "required": ["filePath", "range"],
        "optional": ["sheetName", "sortColumn", "descending", "hasHeader"],
        "defaults": {"sortColumn": 1, "descending": False, "hasHeader": True},
        "desc": {"range": "数据区域", "sortColumn": "区域内第几列", "descending": "降序", "hasHeader": "首行表头"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:D100", "sortColumn": 2, "descending": True},
        "combo": "真正重排数据",
    },
    "excel_remove_duplicates": {
        "required": ["filePath"],
        "optional": ["sheetName", "range", "keyColumns", "hasHeader"],
        "defaults": {"hasHeader": True},
        "desc": {"range": "区域(留空整表)", "keyColumns": "判重列号逗号分隔(留空整行)", "hasHeader": "首行表头"},
        "example": {"filePath": "D:\\\\report.xlsx", "range": "A1:D100", "keyColumns": "1"},
        "combo": "",
    },
    # ----- CSV / 保护 / 页面 / 视图 -----
    "excel_to_csv": {
        "required": ["filePath", "csvPath"],
        "optional": ["sheetName", "encoding", "delimiter"],
        "defaults": {"encoding": "utf-8-sig", "delimiter": ","},
        "desc": {"csvPath": "CSV 输出路径", "encoding": "编码(utf-8-sig对Excel友好)"},
        "example": {"filePath": "D:\\\\report.xlsx", "csvPath": "D:\\\\out.csv"},
        "combo": "",
    },
    "excel_from_csv": {
        "required": ["csvPath", "filePath"],
        "optional": ["sheetName", "encoding", "delimiter"],
        "defaults": {"sheetName": "Sheet1", "encoding": "utf-8-sig", "delimiter": ","},
        "desc": {"csvPath": "CSV 输入路径", "filePath": "输出 Excel 路径"},
        "example": {"csvPath": "D:\\\\data.csv", "filePath": "D:\\\\out.xlsx"},
        "combo": "",
    },
    "excel_protect_sheet": {
        "required": ["filePath"],
        "optional": ["sheetName", "protect", "password"],
        "defaults": {"protect": True},
        "desc": {"protect": "true保护/false取消", "password": "密码(可选)"},
        "example": {"filePath": "D:\\\\report.xlsx", "sheetName": "数据", "protect": True, "password": "123"},
        "combo": "",
    },
    "excel_page_setup": {
        "required": ["filePath"],
        "optional": ["sheetName", "orientation", "paperSize", "fitToWidth", "fitToHeight", "printArea"],
        "defaults": {},
        "desc": {"orientation": "portrait/landscape", "paperSize": "A4/A3/A5/Letter", "fitToWidth": "适配页宽", "printArea": "打印区域"},
        "example": {"filePath": "D:\\\\report.xlsx", "orientation": "landscape", "paperSize": "A4", "fitToWidth": 1},
        "combo": "",
    },
    "excel_set_zoom": {
        "required": ["filePath"],
        "optional": ["sheetName", "zoom", "showGridLines"],
        "defaults": {"zoom": 100, "showGridLines": True},
        "desc": {"zoom": "缩放10~400", "showGridLines": "是否显示网格线"},
        "example": {"filePath": "D:\\\\report.xlsx", "zoom": 120, "showGridLines": False},
        "combo": "",
    },
}

_ALL_SCHEMAS.update(EXCEL_SCHEMAS_3)


# ============================================================
# Excel 自动化影刀对标补全模块 —— advanced_excel_yingdao.py
# ============================================================

EXCEL_SCHEMAS_YINGDAO: dict = {
    "excel_count_rows": {
        "required": ["filePath"],
        "optional": ["sheetName", "resultVariable"],
        "defaults": {"resultVariable": "row_count"},
        "desc": {"resultVariable": "存储总行数"},
        "example": {"filePath": "D:\\\\data.xlsx", "resultVariable": "total"},
        "combo": "常用于循环前确定行数",
    },
    "excel_find_empty_row": {
        "required": ["filePath"],
        "optional": ["sheetName", "column", "direction", "resultVariable"],
        "defaults": {"column": "A", "direction": "down", "resultVariable": "empty_row"},
        "desc": {"column": "按此列判断空行", "direction": "down 从上往下/up 末尾追加位置"},
        "example": {"filePath": "D:\\\\data.xlsx", "column": "A", "resultVariable": "row"},
        "combo": "配合 excel_write_cell 往第一个空行追加数据",
    },
    "excel_find_empty_col": {
        "required": ["filePath"],
        "optional": ["sheetName", "row", "resultVariable"],
        "defaults": {"row": 1, "resultVariable": "empty_col"},
        "desc": {"row": "按此行判断空列", "resultVariable": "存储列字母"},
        "example": {"filePath": "D:\\\\data.xlsx", "row": 1, "resultVariable": "col"},
        "combo": "",
    },
    "excel_find_empty_cell": {
        "required": ["filePath"],
        "optional": ["sheetName", "column", "startRow", "resultVariable"],
        "defaults": {"column": "A", "startRow": 1, "resultVariable": "empty_cell"},
        "desc": {"column": "列", "startRow": "起始行", "resultVariable": "存储单元格地址如 A6"},
        "example": {"filePath": "D:\\\\data.xlsx", "column": "A", "resultVariable": "cell"},
        "combo": "",
    },
    "excel_fill_range": {
        "required": ["filePath", "range", "value"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"range": "填充区域", "value": "填充值（可为公式）"},
        "example": {"filePath": "D:\\\\data.xlsx", "range": "C2:C100", "value": "待处理"},
        "combo": "",
    },
    "excel_clear_style": {
        "required": ["filePath", "range"],
        "optional": ["sheetName"],
        "defaults": {},
        "desc": {"range": "清除样式的区域（保留内容）"},
        "example": {"filePath": "D:\\\\data.xlsx", "range": "A1:Z100"},
        "combo": "",
    },
    "excel_activate_sheet": {
        "required": ["filePath", "sheetName"],
        "optional": [],
        "defaults": {},
        "desc": {"sheetName": "要设为活动的工作表"},
        "example": {"filePath": "D:\\\\data.xlsx", "sheetName": "汇总"},
        "combo": "",
    },
    "excel_save_as": {
        "required": ["filePath", "newPath"],
        "optional": [],
        "defaults": {},
        "desc": {"filePath": "源文件", "newPath": "另存路径"},
        "example": {"filePath": "D:\\\\data.xlsx", "newPath": "D:\\\\backup.xlsx"},
        "combo": "",
    },
    "excel_pivot_table": {
        "required": ["filePath", "groupBy"],
        "optional": ["sheetName", "sourceRange", "valueColumn", "aggregation", "destSheet", "destCell"],
        "defaults": {"aggregation": "sum", "destCell": "A1"},
        "desc": {"groupBy": "分组列名(表头,逗号分隔)", "valueColumn": "聚合列名", "aggregation": "sum/count/average/max/min", "destCell": "结果起始位置"},
        "example": {"filePath": "D:\\\\sales.xlsx", "groupBy": "部门", "valueColumn": "业绩", "aggregation": "sum", "destSheet": "汇总", "destCell": "A1"},
        "combo": "按分组聚合生成汇总表（不依赖 Excel 应用）",
    },
    "excel_to_pdf": {
        "required": ["filePath"],
        "optional": ["sheetName", "pdfPath"],
        "defaults": {},
        "desc": {"sheetName": "留空导出整个工作簿", "pdfPath": "PDF 输出路径(留空同名)"},
        "example": {"filePath": "D:\\\\report.xlsx", "pdfPath": "D:\\\\report.pdf"},
        "combo": "基于 Excel/WPS COM，需安装 Office/WPS（仅 Windows）",
    },
    "excel_run_macro": {
        "required": ["filePath", "macroName"],
        "optional": ["saveAfter", "resultVariable"],
        "defaults": {"saveAfter": False, "resultVariable": "macro_result"},
        "desc": {"macroName": "宏名，如 Module1.MyMacro", "saveAfter": "运行后是否保存"},
        "example": {"filePath": "D:\\\\book.xlsm", "macroName": "Module1.Run"},
        "combo": "基于 COM，需 .xlsm 含宏并允许宏（仅 Windows）",
    },
    "excel_refresh_data": {
        "required": ["filePath"],
        "optional": [],
        "defaults": {},
        "desc": {"filePath": "要刷新数据透视表/外部数据连接的 Excel"},
        "example": {"filePath": "D:\\\\report.xlsx"},
        "combo": "基于 COM，刷新后自动保存（仅 Windows）",
    },
}

_ALL_SCHEMAS.update(EXCEL_SCHEMAS_YINGDAO)


# ============================================================
# AI 数据处理任务模块 —— ai_tasks.py（抽取/分类/摘要/翻译/情感）
# 这些模块复用全局 AI 配置（apiUrl/apiKey/model），前端会自动注入默认值，
# AI 搭建工作流时通常只需填 inputText + 任务专属字段 + variableName。
# ============================================================

AI_TASK_SCHEMAS: dict = {
    "ai_extract": {
        "required": ["inputText", "fields"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"variableName": "extracted_data"},
        "desc": {"inputText": "待抽取文本（支持{变量}）", "fields": "要抽取的字段：逗号分隔或JSON描述", "variableName": "存储抽取出的JSON对象"},
        "example": {"inputText": "{page_text}", "fields": "标题,作者,日期,正文", "variableName": "article"},
        "combo": "常接在 get_element_info/read_text_file/api_request 后，把非结构化文本变成结构化JSON；后接 foreach/table_add_row",
    },
    "ai_classify": {
        "required": ["inputText", "categories"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"variableName": "category"},
        "desc": {"inputText": "待分类文本", "categories": "候选类别，逗号分隔(≥2个)", "variableName": "存储命中的类别名"},
        "example": {"inputText": "{comment}", "categories": "投诉,咨询,好评,其他", "variableName": "intent"},
        "combo": "后接 condition 按类别分支处理",
    },
    "ai_summarize": {
        "required": ["inputText"],
        "optional": ["maxWords", "style", "variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"maxWords": 200, "variableName": "summary"},
        "desc": {"inputText": "待摘要长文本", "maxWords": "摘要最大字数", "style": "风格(可选,如 要点列表/一句话)"},
        "example": {"inputText": "{article}", "maxWords": 150, "variableName": "summary"},
        "combo": "把长文/网页正文压缩；后接 send_email/print_log/table_add_row",
    },
    "ai_translate": {
        "required": ["inputText", "targetLang"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"targetLang": "英文", "variableName": "translation"},
        "desc": {"inputText": "待翻译文本", "targetLang": "目标语言，如 英文/日文/中文"},
        "example": {"inputText": "{content}", "targetLang": "英文", "variableName": "en_text"},
        "combo": "",
    },
    "ai_sentiment": {
        "required": ["inputText"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"variableName": "sentiment"},
        "desc": {"inputText": "待分析文本", "variableName": "存储 {sentiment,score,confidence,reason}"},
        "example": {"inputText": "{review}", "variableName": "sentiment"},
        "combo": "舆情/评论分析；后接 condition 按 {sentiment.sentiment} 分支",
    },
    "ai_normalize": {
        "required": ["inputText", "normalizeType"],
        "optional": ["targetFormat", "variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"normalizeType": "date", "variableName": "normalized"},
        "desc": {"inputText": "待规整的杂乱值", "normalizeType": "date/money/phone/number/name/address", "targetFormat": "自定义目标格式(可选)"},
        "example": {"inputText": "{raw_date}", "normalizeType": "date", "variableName": "clean_date"},
        "combo": "数据清洗：放在 foreach 里逐条规整后 table_add_row",
    },
    "ai_dedup_semantic": {
        "required": ["inputList"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"variableName": "deduped_list"},
        "desc": {"inputList": "待去重列表(数组变量或JSON数组,≤300项)", "variableName": "存储去重后数组"},
        "example": {"inputList": "{items}", "variableName": "unique_items"},
        "combo": "合并语义重复项；前接采集/读取产生的列表",
    },
    "ai_route": {
        "required": ["inputText", "routes"],
        "optional": ["variableName", "apiUrl", "apiKey", "model", "temperature", "maxTokens"],
        "defaults": {"variableName": "route"},
        "desc": {"inputText": "待判断内容", "routes": "分支选项：每行 名称:说明，或JSON {名称:说明}", "variableName": "存储命中的分支名"},
        "example": {"inputText": "{user_msg}", "routes": "退款:要求退钱\\n咨询:询问信息\\n投诉:表达不满", "variableName": "route"},
        "combo": "AI 判断力：后接 condition(leftValue={route}, operator=equals, rightValue=退款) 分流到不同处理分支",
    },
    "ai_vision_act": {
        "required": ["instruction"],
        "optional": ["action", "button", "apiUrl", "apiKey", "model", "variableName", "maxTokens"],
        "defaults": {"action": "click", "button": "left", "variableName": "vision_target", "maxTokens": 300},
        "desc": {
            "instruction": "自然语言描述要操作的屏幕目标，如：右上角的登录按钮",
            "action": "click(单击)/double(双击)/right(右键)/move(仅移动)/locate(仅定位返回坐标)",
            "button": "action=click/double 时的鼠标按键：left/right/middle",
            "variableName": "存储定位坐标 {x,y}",
        },
        "example": {"instruction": "页面中的提交按钮", "action": "click", "variableName": "vision_target"},
        "combo": "看屏点选，不依赖选择器；适合 Canvas/图片按钮/防自动化页面，操作物理鼠标需目标窗口在前台",
    },
}

_ALL_SCHEMAS.update(AI_TASK_SCHEMAS)
