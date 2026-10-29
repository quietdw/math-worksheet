# 小学练习题生成器 · Primary Worksheet

零构建、纯静态的小学练习卷站点：打开网页即可出题、排版、导出打印。所有计算都在浏览器本地完成，不上传任何数据。

- 线上地址：<https://quietdw.github.io/primary-worksheet/>
- 仓库：<https://github.com/quietdw/primary-worksheet>
- 站点规格：[SPEC.md](./SPEC.md)（索引）→ [spec/](./spec/) 按「时间 + 功能点」拆分
- AI 协作约定：[AGENTS.md](./AGENTS.md)

## 功能

| 学科 | 状态 | 能力 |
| --- | --- | --- |
| 数学 | 已上线 | 加减乘除 / 混合运算，2–4 个数字，整数或小数，可限制负数与数值范围；题量 1–2000；2/3/4 列 × 20/25/30 行；字号、表头、答案显示可调；导出 Word 题目卷 / 答案卷、打印或另存 PDF、导出网页 |
| 语文 | 建设中 | 占位页，题型规划中 |
| 英语 | 建设中 | 占位页，题型规划中 |

站点级能力（由通用页头 / 页尾提供）：学科导航、GitHub 源码入口、深浅色主题、中英文界面切换。

## 本地预览

```bash
python -m http.server 8080
# 首页   http://localhost:8080/
# 数学   http://localhost:8080/math-practice-generator.html
# 语文   http://localhost:8080/chinese-practice-generator.html
# 英语   http://localhost:8080/english-practice-generator.html
```

无需安装依赖、无需构建。不要用带自动注入的静态服务器（如部分 Live Server 配置）去打开数学页，注入脚本可能插入到 JS 字符串里的 `</body>` 之前；用 `python -m http.server` 或直接双击 HTML 文件最稳。

## 目录结构

```
.
├── index.html                       首页：学科入口
├── math-practice-generator.html     数学练习卷生成器（单文件应用）
├── chinese-practice-generator.html  语文占位页
├── english-practice-generator.html  英语占位页
├── 404.html                         自定义 404
├── assets/
│   ├── site.css                     设计变量（明暗主题）+ 页头 / 页尾样式
│   └── site-shell.js                通用页头 / 页尾模块（jQuery）
├── favicon.svg / apple-touch-icon.png / og-image.png
├── robots.txt / sitemap.xml
├── .nojekyll                        关闭 GitHub Pages 的 Jekyll 处理
├── SPEC.md                          规格索引：命名规则、清单、维护约定
├── AGENTS.md                        AI 编码代理协作约定（硬约束、验证、提交）
└── spec/                            按「时间 + 功能点」拆分的规格文档
    ├── 2026-10-29-站点定位与信息架构.md
    ├── 2026-10-29-首页学科入口.md
    ├── 2026-10-29-数学练习页.md
    ├── 2026-10-29-语文英语占位页.md
    ├── 2026-10-29-通用外壳契约.md
    └── 2026-10-29-共用规范与依赖降级.md
```

规格文档命名固定为 `spec/YYYY-MM-DD-功能点.md`：一个文件只写一个可独立验收的功能点，新增功能点新建文件并在 [SPEC.md](./SPEC.md) 第 2 节登记，已有功能点演进在文件内追加「变更记录」。

## 依赖

| 依赖 | 加载方式 | 说明 |
| --- | --- | --- |
| jQuery 3.7.1 | `https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js`，带 SRI `integrity` + `crossorigin` | 通用页头 / 页尾模块使用；断网时页头页尾不渲染 |
| [docx.js](https://github.com/dolanmiu/docx) | 数学页首次导出 Word 时按需加载 | 加载失败自动降级为导出 `.html` |

仓库内不提供本地依赖副本。

## 部署

1. 推送 `main` 分支。
2. 仓库 `Settings → Pages` 选择 `main` 分支 `/(root)`。
3. `.nojekyll` 已存在，静态文件按原样发布。

仓库改名（`math-worksheet` → `primary-worksheet`）后需同步本地远程地址：

```bash
git remote set-url origin git@github.com:quietdw/primary-worksheet.git
```

旧地址 `https://quietdw.github.io/math-worksheet/` 不做跳转兼容。

## 浏览器支持

Chrome / Edge / Firefox / Safari 现代版本。

## 致谢

交互与排版思路参考了 [jesus.xin](https://jesus.xin/) 的在线计算题生成器；本项目重写了出题引擎、预览排版与 Word 导出，并补充了负数限制、答案卷、中英文切换等功能。

## License

MIT