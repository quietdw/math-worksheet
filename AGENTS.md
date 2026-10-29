# AGENTS.md

本仓库对 AI 编码代理（Copilot / Claude Code / Cursor 等）的协作约定。规格细节不在本文件，先读 [SPEC.md](./SPEC.md) 索引，再读对应 `spec/` 文件。

## 项目性质

零构建、纯静态、多学科小学练习卷站点。打开 HTML 即可出题、排版、导出打印，全部计算在浏览器本地完成。

- 无构建步骤、无打包器、无框架、无 `package.json`。
- 页面：`index.html`（学科入口）、`math-practice-generator.html`（数学，单文件应用）、`chinese-practice-generator.html`、`english-practice-generator.html`（占位）、`404.html`。
- 共用：`assets/site-shell.js`（页头 / 页尾，jQuery）、`assets/site.css`（设计变量与外壳样式）。
- 部署：GitHub Pages 直接发布仓库根目录，`.nojekyll` 关闭 Jekyll。

## 开始工作前

1. 读 [SPEC.md](./SPEC.md)，定位改动属于哪个功能点。
2. 读对应的 `spec/2026-10-29-*.md`，确认交互契约与约束。
3. 需要跑起来看效果时，用 `python -m http.server 8080`，不要用会注入脚本的 Live Server。

## 文档纪律

- 新增功能点 → 新建 `spec/YYYY-MM-DD-功能点.md`，日期用功能点定稿当天，功能点为中文短语；同时在 `SPEC.md` 第 2 节登记一行。
- 已有功能点演进 → 在文件内追加「变更记录」，不新建同义文件、不改已有文件名。
- 先改 spec，再改代码；代码与 spec 冲突时以 spec 为准，或先改 spec 并说明原因。
- `README.md` 只写「是什么、怎么用、怎么部署」，`AGENTS.md` 只写协作约定与硬约束，都不复述规格细节。

## 代码硬约束

- 不引入构建工具、npm 包、本地 `vendor/` 副本；jQuery 走 CDN（带 SRI）。
- 学科页保持单文件（HTML + CSS + JS 内联），学科页命名 `<subject>-practice-generator.html`。
- DOM 查询、文本刷新、属性 / class 切换、节点创建、事件绑定统一用 jQuery；出题引擎保持纯函数，不碰 DOM。
- 全站脚本里保留原生 API 的只有：CSS 自定义属性写入（`el.style.setProperty`）、`MediaQueryList` / `ResizeObserver`、`CustomEvent` 派发、`canvas` 2D 测量、`localStorage`、`URL.createObjectURL`。
- 源码中禁止出现连续的 `</body>`、`</script>` 字面量（拼字符串时用 `'</bo' + 'dy>'`），否则自动注入类服务器会提前闭合脚本。
- 站内链接一律相对路径（`./`、`math-practice-generator.html`）。
- 打印 / 导出时页头页脚由 `@media print` 隐藏，练习卷里不得出现外壳。
- 新增文本文件按 UTF-8 无 BOM + LF 保存；`.gitattributes` 已锁 `eol=lf`。
- 不提交密钥、令牌、`.env`、`*.token`。
- 学科页核心功能不得依赖外壳；jQuery 加载失败时正文仍可用，Word 导出失败时降级为 `.html`。

## 验证清单

改完至少自查这些点（仓库无自动化测试）：

- `python -m http.server 8080` 打开首页、三个学科页、`404.html`，控制台无报错。
- 页头导航 `aria-current` 正确，语文 / 英语带「建设中 / Soon」标记。
- 深浅色切换、中英文切换在四个页面都生效，刷新后偏好保留。
- 数学页：出题、规则组合、答案卷、打印预览、导出 Word / PDF / 网页各走一遍。
- 占位页保持 `noindex,follow` 且不在 `sitemap.xml` 中；首页与数学页在 sitemap 中。
- 改动涉及样式时检查 ≥900px 三列、窄屏单列，以及深色主题。

## 提交规范

沿用现有历史风格：Conventional Commits + 中文描述，一次提交只做一件事。

```
feat(ui): 标题栏新增 GitHub 入口与明暗主题切换
fix(ui): 窄屏缩放条不换行、面板内容居中限宽并压缩
a11y: GitHub 图标 aria-label 随语言切换
chore: ignore local token files
```

文档改动单独提交，不与功能混提。

## 常见坑

- Live Server 类自动注入脚本会把字符串里的 `</body>` 当成真实闭合标签 → 数学页脚本被截断。
- 数学页有自己的 `data-i18n` 体系，外壳用 `data-shell`，两套混用会互相覆盖文案。
- 主题偏好键 `mathgen.lang.v1` / `mathgen.theme.v1` 是全站共用，改名会导致老用户偏好丢失。
- 文件名里的 `<subject>` 与 `data-page` 取值（`home|math|chinese|english`）必须对得上，否则导航高亮和「建设中」标记失效。
