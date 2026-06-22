export const selectorGuideContent = `# 🎯 选择器完全指南（CSS + XPath）

选择器是网页自动化的核心技能。本章从入门到精通，全面讲解 **CSS 选择器** 与 **XPath 选择器** 的使用方法、优缺点与实战技巧。

---

## 📌 什么是选择器？

选择器是用来定位网页元素的"地址"。就像快递需要地址才能送到，自动化操作也需要选择器才能找到目标元素。

**示例**：
\`\`\`html
<button id="submit-btn" class="btn primary">提交</button>
\`\`\`

可以用以下选择器定位这个按钮：
- \`#submit-btn\` - 通过ID
- \`.btn\` - 通过类名
- \`button\` - 通过标签名

---

## 🎓 基础选择器

### 1. ID选择器（#）

通过元素的 \`id\` 属性定位，**最稳定**的选择方式。

**语法**：\`#id名称\`

**示例**：
\`\`\`html
<input id="username" type="text">
<button id="login-btn">登录</button>
\`\`\`

选择器：
- \`#username\` - 选择用户名输入框
- \`#login-btn\` - 选择登录按钮

**特点**：
- ✅ 最稳定，ID通常不会变
- ✅ 唯一性，一个页面ID不重复
- ❌ 不是所有元素都有ID

---

### 2. 类选择器（.）

通过元素的 \`class\` 属性定位。

**语法**：\`.类名\`

**示例**：
\`\`\`html
<div class="product-item">商品1</div>
<div class="product-item">商品2</div>
<button class="btn btn-primary">按钮</button>
\`\`\`

选择器：
- \`.product-item\` - 选择所有商品项（多个）
- \`.btn\` - 选择所有按钮
- \`.btn-primary\` - 选择主要按钮

**多类名选择**：
\`\`\`
.btn.btn-primary  → 同时有btn和btn-primary类的元素
\`\`\`

---

### 3. 标签选择器

通过HTML标签名定位。

**语法**：\`标签名\`

**示例**：
- \`input\` - 所有输入框
- \`button\` - 所有按钮
- \`a\` - 所有链接
- \`img\` - 所有图片
- \`div\` - 所有div

**特点**：
- ✅ 简单直接
- ❌ 通常会选中多个元素
- ❌ 不够精确

---

### 4. 属性选择器（[]）

通过元素的属性定位，非常强大。

**语法**：

| 语法 | 说明 |
|------|------|
| \`[attr]\` | 有这个属性 |
| \`[attr="value"]\` | 属性等于某值 |
| \`[attr^="value"]\` | 属性以某值开头 |
| \`[attr$="value"]\` | 属性以某值结尾 |
| \`[attr*="value"]\` | 属性包含某值 |

**示例**：
\`\`\`html
<input type="text" name="username" placeholder="请输入用户名">
<input type="password" name="password">
<a href="https://example.com" target="_blank">链接</a>
<div data-id="123" data-type="product">商品</div>
\`\`\`

选择器：
- \`[type="text"]\` - 文本输入框
- \`[type="password"]\` - 密码输入框
- \`[name="username"]\` - name为username的元素
- \`[href^="https"]\` - https开头的链接
- \`[href$=".pdf"]\` - 以.pdf结尾的链接
- \`[data-id="123"]\` - data-id为123的元素
- \`[data-type*="prod"]\` - data-type包含prod的元素

---

## 🔗 组合选择器

### 1. 后代选择器（空格）

选择某元素内部的元素。

**语法**：\`祖先 后代\`

**示例**：
\`\`\`html
<div class="container">
  <ul class="list">
    <li>项目1</li>
    <li>项目2</li>
  </ul>
</div>
\`\`\`

- \`.container li\` - container内的所有li
- \`.list li\` - list内的所有li

---

### 2. 子元素选择器（>）

只选择直接子元素。

**语法**：\`父元素 > 子元素\`

**示例**：
\`\`\`html
<ul class="menu">
  <li>一级菜单
    <ul>
      <li>二级菜单</li>
    </ul>
  </li>
</ul>
\`\`\`

- \`.menu li\` - 所有li（包括二级）
- \`.menu > li\` - 只有一级li

---

### 3. 相邻兄弟选择器（+）

选择紧跟在某元素后面的元素。

**语法**：\`元素1 + 元素2\`

**示例**：
\`\`\`html
<h2>标题</h2>
<p>第一段</p>
<p>第二段</p>
\`\`\`

- \`h2 + p\` - 紧跟h2后面的p（第一段）

---

### 4. 通用兄弟选择器（~）

选择某元素后面的所有兄弟元素。

**语法**：\`元素1 ~ 元素2\`

- \`h2 ~ p\` - h2后面的所有p

---

## 🎯 伪类选择器

### 位置伪类

| 选择器 | 说明 |
|--------|------|
| \`:first-child\` | 第一个子元素 |
| \`:last-child\` | 最后一个子元素 |
| \`:nth-child(n)\` | 第n个子元素 |
| \`:nth-child(odd)\` | 奇数位置的子元素 |
| \`:nth-child(even)\` | 偶数位置的子元素 |
| \`:nth-last-child(n)\` | 倒数第n个子元素 |

**示例**：
\`\`\`html
<ul>
  <li>项目1</li>
  <li>项目2</li>
  <li>项目3</li>
  <li>项目4</li>
</ul>
\`\`\`

- \`li:first-child\` - 项目1
- \`li:last-child\` - 项目4
- \`li:nth-child(2)\` - 项目2
- \`li:nth-child(odd)\` - 项目1、项目3

### 类型伪类

| 选择器 | 说明 |
|--------|------|
| \`:first-of-type\` | 同类型中的第一个 |
| \`:last-of-type\` | 同类型中的最后一个 |
| \`:nth-of-type(n)\` | 同类型中的第n个 |

### 状态伪类

| 选择器 | 说明 |
|--------|------|
| \`:hover\` | 鼠标悬停 |
| \`:focus\` | 获得焦点 |
| \`:checked\` | 被选中（复选框/单选框） |
| \`:disabled\` | 被禁用 |
| \`:enabled\` | 可用状态 |

### 否定伪类

\`:not(选择器)\` - 排除某些元素

**示例**：
- \`input:not([type="hidden"])\` - 非隐藏的输入框
- \`li:not(:first-child)\` - 除了第一个的所有li

---

## 🛠️ 实战技巧

### 1. 可视化选择元素

**Ctrl+点击** 选择器按钮，可以在网页上直接点选元素，自动生成选择器。

### 2. 浏览器调试选择器

1. 按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 输入测试代码：

\`\`\`javascript
// 测试选择器是否正确
document.querySelector('你的选择器')

// 查看选中了多少个元素
document.querySelectorAll('你的选择器').length
\`\`\`

### 3. 在Elements面板搜索

1. 按 **F12** 打开开发者工具
2. 切换到 **Elements** 标签
3. 按 **Ctrl+F** 搜索
4. 输入选择器，会高亮匹配的元素

---

## 📋 常见场景选择器

### 表单元素

\`\`\`
用户名输入框：#username 或 input[name="username"]
密码输入框：#password 或 input[type="password"]
登录按钮：#login-btn 或 button[type="submit"]
搜索框：#search 或 input[placeholder*="搜索"]
\`\`\`

### 列表元素

\`\`\`
所有列表项：.list-item 或 ul > li
第一个列表项：.list-item:first-child
最后一个列表项：.list-item:last-child
第3个列表项：.list-item:nth-child(3)
\`\`\`

### 表格元素

\`\`\`
表格：table 或 .data-table
表头：thead th
表格行：tbody tr
第2行：tbody tr:nth-child(2)
第3列：tbody td:nth-child(3)
\`\`\`

### 导航菜单

\`\`\`
导航栏：nav 或 .navbar
菜单项：.nav-item 或 nav a
当前激活项：.nav-item.active
\`\`\`

### 弹窗/对话框

\`\`\`
弹窗容器：.modal 或 [role="dialog"]
关闭按钮：.modal .close 或 .modal-close
确认按钮：.modal .btn-confirm
\`\`\`

---

## 🧭 XPath 选择器（进阶定位利器）

很多复杂页面光靠 CSS 定位不准、不稳，这时 **XPath** 往往更精准。WebRPA 已完美支持手动填写 XPath，所有"元素选择器"输入框都能一键切换到 XPath 模式。

### 什么是 XPath？

XPath（XML Path Language）是一套用"路径表达式"在 HTML/XML 文档树中定位节点的语言。它比 CSS 更强大：不仅能按标签、属性定位，还能**按文本内容定位**、**向上找父级/祖先**、**按位置/逻辑条件筛选**。

### 在 WebRPA 中如何使用 XPath

1. 在任意"元素选择器"输入框右上角，有一个 **CSS / XPath** 切换按钮
2. 点击它即可在 **CSS 模式** 与 **XPath 模式** 之间切换（输入框为空时也能切换）
3. 切到 XPath 模式后，直接粘贴或手写 XPath 表达式即可，例如 \`//button[text()="提交"]\`
4. 底层会自动给值加上 \`xpath=\` 前缀（你无需手动输入前缀），执行引擎据此用 XPath 引擎定位

> 小贴士：你也可以直接在 CSS 模式下粘贴以 \`/\` 或 \`//\` 开头的表达式，WebRPA 会自动识别为 XPath 并补全前缀，确保不会被当成 CSS 误解析。

### XPath 基础语法

| 表达式 | 说明 | 示例 |
|--------|------|------|
| \`/\` | 从根节点选取（绝对路径） | \`/html/body/div\` |
| \`//\` | 从任意位置选取（相对路径，最常用） | \`//div\` |
| \`.\` | 当前节点 | \`.//span\` |
| \`..\` | 父节点 | \`//input/..\` |
| \`@\` | 选取属性 | \`//a[@href]\` |
| \`*\` | 匹配任意元素 | \`//div/*\` |

### 按属性定位

\`\`\`
//input[@id="username"]          → id 为 username 的输入框
//button[@class="btn primary"]   → class 完全等于 "btn primary"
//a[@href="https://x.com"]       → 指定链接
//div[@data-id="123"]            → 自定义属性
\`\`\`

### 按文本定位（XPath 独有优势）

\`\`\`
//button[text()="提交"]              → 文本正好是"提交"的按钮
//button[contains(text(),"提交")]    → 文本包含"提交"
//a[contains(.,"下一页")]            → 后代文本含"下一页"的链接
//span[normalize-space()="确定"]     → 去除首尾空白后等于"确定"
\`\`\`

### 模糊匹配与函数

\`\`\`
//input[contains(@class,"form")]        → class 包含 form
//a[starts-with(@href,"https")]         → href 以 https 开头
//img[contains(@src,".png")]            → src 含 .png
//div[@class="a" and @data-type="b"]    → 同时满足两个条件
//div[@class="a" or @class="b"]         → 满足任一条件
//input[not(@disabled)]                 → 没有 disabled 属性
\`\`\`

### 按位置定位

\`\`\`
//ul/li[1]              → 第一个 li（XPath 下标从 1 开始）
//ul/li[last()]         → 最后一个 li
//ul/li[position()<=3]  → 前三个 li
//table//tr[2]/td[3]    → 第二行第三列单元格
\`\`\`

### 轴定位（沿文档树关系查找，CSS 做不到）

\`\`\`
//label[text()="账号"]/following-sibling::input   → "账号"标签后面的输入框
//input[@id="x"]/ancestor::form                   → 该输入框所在的表单
//td[text()="姓名"]/parent::tr                     → 含"姓名"单元格的整行
//h2/preceding-sibling::p                          → h2 前面的所有 p
\`\`\`

### CSS 与 XPath 对照速查

| 目标 | CSS | XPath |
|------|-----|-------|
| 按 ID | \`#username\` | \`//*[@id="username"]\` |
| 按 class | \`.btn\` | \`//*[contains(@class,"btn")]\` |
| 按标签 | \`button\` | \`//button\` |
| 按属性 | \`[name="user"]\` | \`//*[@name="user"]\` |
| 第 n 个 | \`li:nth-child(2)\` | \`//li[2]\` |
| 后代 | \`.box .item\` | \`//*[contains(@class,"box")]//*[contains(@class,"item")]\` |
| 按文本 | ❌ 不支持 | \`//button[text()="提交"]\` |
| 找父级 | ❌ 不支持 | \`//span/..\` |

### XPath 的优点与缺点

**✅ 优点**

- **能按文本内容定位**：页面没有稳定 id/class 时，按按钮文字、标签文字定位非常实用
- **能向上/横向查找**：支持父级、祖先、兄弟等"轴"，可以"先找到一个锚点元素，再定位它附近的目标"
- **筛选能力强**：支持 and/or/not、contains、starts-with、位置函数等复杂条件
- **对复杂结构更精准**：层级深、动态 class 的页面往往比 CSS 更可靠

**❌ 缺点**

- **语法更复杂**：表达式比 CSS 长，初学者上手门槛略高
- **绝对路径很脆**：像 \`/html/body/div[3]/div[2]/...\` 这种一旦页面结构微调就失效（务必避免，多用 \`//\` 相对路径 + 属性/文本）
- **可读性略差**：长 XPath 不如简洁的 CSS 直观
- **性能略低**：极端复杂的 XPath 在超大页面上比等价 CSS 稍慢（一般场景无感）

### 选择建议：什么时候用 XPath？

- 元素**有稳定 id/class** → 优先用 **CSS**（更简洁）
- 需要**按文本定位**（如"点击文字为'确定'的按钮"）→ 用 **XPath**
- 需要**从一个元素找它的父级/兄弟**（如"找到'价格'标签右边的数值"）→ 用 **XPath**
- 页面 class 是**随机/动态生成**、CSS 不稳 → 用 **XPath 按文本或属性包含** 定位
- 多个条件组合筛选 → 用 **XPath** 的 and/or/not

> 最佳实践：能用稳定 id 就用 CSS；定位不到或不稳时，切到 XPath 用"属性包含 + 文本 + 相对轴"组合，避免写绝对路径。两种模式可随时一键切换，配合右侧「测试定位」按钮即可快速验证。

---

## 🔍 测试定位（运行前验证选择器）

填好选择器后，不用真跑工作流就能验证它在当前页面是否命中。

\`\`\`
1. 先打开自动化浏览器并停在目标页面
2. 在节点配置面板的选择器输入框右侧，点「测试定位」按钮（放大镜图标）
3. 结果会在日志里显示：
   - 命中 N 个元素，并在页面上用红框高亮（约 2.5 秒）
   - 未命中时给出提示，并自动尝试拾取时保存的"自愈候选选择器"
\`\`\`

**好处**：

- 提前发现选择器写错 / 匹配到多个，减少跑挂
- 配合「选择器自愈」：主选择器失效时会用候选锚点重定位，测试时也会一并验证

> 提示：选择器输入框旁边还有「可视化选择元素」（准星图标）可直接到页面上点选生成选择器。

---

## ⚠️ 常见问题

### 1. 选择器找不到元素

**可能原因**：
- 元素在 iframe 中
- 元素是动态加载的
- 选择器写错了

**解决方法**：
- 检查是否需要切换到 iframe
- 添加等待元素模块
- 使用浏览器调试确认选择器

### 2. 选择器选中多个元素

**解决方法**：
- 添加更多限定条件
- 使用 :nth-child 指定位置
- 使用更具体的父元素

### 3. 选择器不稳定

**原因**：使用了动态生成的类名或ID

**解决方法**：
- 使用属性选择器 \`[data-xxx]\`
- 使用文本内容定位
- 使用相对位置定位

---

## 💡 选择器优先级建议

1. **首选 ID 选择器**：\`#login-btn\`
2. **次选 唯一类名**：\`.submit-button\`
3. **再选 属性选择器**：\`[data-action="submit"]\`
4. **最后 组合选择器**：\`.form .btn:last-child\`

**原则**：
- 越简单越好
- 越稳定越好
- 避免过长的选择器链`
