<div align="center">

# 🎮 PCL2 个性化主页

一个为 [PCL2 启动器](https://github.com/Meloong-Git/PCL) 打造的联网自定义主页，每天自动更新。

[![Generate Custom.xaml](https://github.com/wlasfjdskfj/pcl-homepage/actions/workflows/generate.yml/badge.svg)](https://github.com/wlasfjdskfj/pcl-homepage/actions/workflows/generate.yml)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

[主页地址](https://www.mkejga.de5.net/) · [提交反馈](https://github.com/wlasfjdskfj/pcl-homepage/issues)

</div>

---

## 📌 环境要求

- **PCL2 启动器 2.10.4 或更高版本**：主页使用了自定义卡片、图标按钮与事件控件，旧版本可能无法正常显示。

---

## ✨ 功能特性

### 👤 个性化内容（按 IP + 北京时间日期确定性生成，每人每天一份）

| 功能 | 说明 |
|---|---|
| 🌐 **公网 IP** | 从 Cloudflare 请求头读取，展示用户自己的 IP |
| 🎲 **幸运数字** | 用 IP + 日期做 hash 取值，同一天同一 IP 固定，不同人不同 |
| 🎨 **幸运颜色** | 从 24 种主题色中按 IP+日期挑选，每人每天一个颜色 |
| 📊 **人品测试** | 同样是 IP + 日期 hash，分数固定且带评级与评语 |
| 💬 **每日一言** | 68 条挖矿、生存与冷知识，每人每天一条（后台可自定义） |
| 🍀 **今日运势** | 宜 / 忌 / 小贴士，按 IP + 日期确定性生成 |

### 🎯 每次刷新都变

| 功能 | 说明 |
|---|---|
| 🥚 **彩蛋** | 50 个 Minecraft 主题小彩蛋随机抽取 |
| ⚔ **随机挑战** | 100 条挑战随机抽取，按难度带不同配色 |
| 🌱 **今日种子** | 从 97 个种子中随机，另有 8 个备选种子弹窗 |
| ❓ **MC 知识题** | 123 道题，按 IP + 日期抽取，附答案解析 |

### 📦 静态内容（每天由 CI 更新）

| 功能 | 说明 |
|---|---|
| 🆕 **最新版本** | 从 Mojang 官方 API 抓取，显示快照 + 正式版 |
| 🖼 **版本封面图** | 从 Minecraft Wiki 抓取对应版本的封面 |
| 📖 **更新总结** | 抓取各正式版的中文更新日志，点击弹窗查看 |
| 🔧 **实用工具** | 常用指令一键复制、内存优化、清理垃圾 |

### 🔗 常用链接

[Minecraft Wiki](https://zh.minecraft.wiki/) · [苦力怕论坛](https://klpbbs.com/) · [Hypixel](https://hypixel.net/) · [Modrinth](https://modrinth.com/) · [MC百科](https://www.mcmod.cn/) · [NameMC](https://namemc.com/)

---


## ❓ 常见问题

### 主页加载失败怎么办？

关闭 PCL2 → 删除 `%appdata%\PCL\Cache` 文件夹 → 重开 PCL2。

### 日期不更新？

Cloudflare Functions 可能没生效，跑一次 `python scripts/doctor.py` 体检：它会先检查本地仓库一致性，再探测线上接口。

### 主页显示 `__XXX__` 之类的原始文本？

说明模板里的占位符没有被中间件替换。运行 `python scripts/check_placeholders.py` 定位是哪一个。

### 版本图是旧的？

Cloudflare 缓存没刷新，去控制台清除缓存。

### 人品分数和别人的一样？

同一 WiFi 下共享 IP，属于正常现象。

---

## 🛠 本地开发

```bash
pip install -r requirements.txt

python scripts/doctor.py            # 完整体检（本地 + 线上探测）
python scripts/doctor.py --offline  # 只做本地检查
python scripts/generate.py          # 重新生成 Custom.xaml / panel.xaml / panel.json
```

仓库自带的校验脚本（CI 每次运行都会执行）：

| 脚本 | 作用 |
|---|---|
| `scripts/check_placeholders.py` | 校验模板 / 中间件 / 生成器三方占位符一致，防止占位符泄漏到页面 |
| `scripts/check_templates.py` | 校验模板 token 都有取值、生成物无残留 token |
| `scripts/check_imports.py` | 校验 `functions/` 下的 ES 模块导入都能解析到真实导出 |
| `scripts/doctor.py` | 综合体检：文件完整性、JSON、JS 语法、图片引用、线上接口 |

### 改页面结构请改 `templates/`

页面的静态结构（卡片、样式、按钮）全部放在 `templates/*.tpl`，`generate.py` 只负责
抓取版本信息并填入生成期数据。**要调整布局或样式，直接编辑模板文件即可，不必再动 Python。**

```
templates/Custom.xaml.tpl   主页结构
templates/panel.xaml.tpl    “更多功能”面板结构
templates/release_item.tpl  “最近正式版”单条列表项
templates/server_item.tpl   服务器推荐单条
```

模板里有两类占位符，不要混淆：

| 形式 | 何时替换 | 示例 |
|---|---|---|
| `{{TOKEN}}` | 生成期，由 `generate.py` 填入 | `{{MAIN_VERSION}}`、`{{WALLPAPER_URL}}`、`{{RELEASE_ITEMS}}` |
| `__TOKEN__` | 请求时，由 `functions/_middleware.js` 按访问者填入 | `__USER_IP__`、`__QUOTE__`、`__WEATHER_BODY__` |

新增生成期 token 时，记得在 `scripts/generate.py` 的 `render_template(...)` 调用里补上取值，
否则 `scripts/check_templates.py` 会让 CI 失败。

### 项目结构

```
templates/              页面结构模板（唯一来源，编辑这里）
Custom.xaml            生成物：主页（勿手工修改）
panel.xaml             生成物：“更多功能”面板（勿手工修改）
panel.json             生成物：面板元数据
_headers               Cloudflare Pages 缓存与安全响应头
scripts/generate.py    抓取版本/封面，渲染模板
functions/_middleware.js  请求时替换占位符（天气、运势、题目、公告等）
functions/admin.js     访问统计后台，通用工具已拆到 functions/_lib/admin-*.js
functions/_lib/        共享模块（不会被当成路由）
```

> ⚠️ `Custom.xaml`、`panel.xaml`、`panel.json` 都是**生成物**，由 `.github/workflows/generate.yml` 每 12 小时覆盖一次，请改 `templates/` 而不是直接编辑它们。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

- **提交 Bug**：描述问题 + 附上截图
- **提交功能**：说明用途 + 附上代码

---

## 📄 开源协议

本项目采用 [MIT License](LICENSE) 开源。

> ⚠️ 主页内容里的版本图来自 Minecraft Wiki，遵循 CC BY-NC-SA 3.0 协议。

---

## 🙏 致谢

- [PCL2](https://github.com/Meloong-Git/PCL) - 强大的 Minecraft 启动器
- [Minecraft Wiki](https://zh.minecraft.wiki/) - 版本信息与封面图
- [NewsHomepage](https://github.com/Light-Beacon/PCL2-NewsHomepage) - 主页设计灵感
- [Mojang](https://www.minecraft.net/) - 版本 API

---

<div align="center">

**如果这个项目对你有帮助，点个 ⭐ Star 支持一下！**

Made with ❤️ by [wlasfjdskfj](https://github.com/wlasfjdskfj)

</div>
