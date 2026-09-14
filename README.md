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

## ✨ 功能特性

### 🎯 动态内容（每次刷新都变）

| 功能 | 说明 |
|---|---|
| 🎲 **幸运数字** | 每次刷新随机生成 1-99 之间的数字 |
| 🎨 **幸运颜色** | 每次刷新随机从 10 种主题色中挑选 |
| 🥚 **彩蛋** | 25 个 Minecraft 主题小彩蛋随机抽取 |
| 💬 **每日一言** | 45 条挖矿、生存、冷知识，点按钮换一句 |

### 👤 个性化内容（每人不同）

| 功能 | 说明 |
|---|---|
| 🌐 **公网 IP** | 从 Cloudflare 请求头读取，展示用户自己的 IP |
| 📊 **人品测试** | 用 IP + 日期做 hash，同一天同一 IP 分数固定，不同人不同 |
| 🎨 **幸运颜色** | 同样按 IP 区分，每人每天一个颜色 |

### 📦 静态内容（每天更新）

| 功能 | 说明 |
|---|---|
| 🆕 **最新版本** | 从 Mojang 官方 API 抓取，显示快照 + 正式版 |
| 🖼 **版本封面图** | 从 Minecraft Wiki 抓取对应版本的封面 |
| 📖 **更新日志** | 一键跳转到对应版本的 Wiki 页面 |
| 🔧 **实用工具** | 内存优化、清理垃圾 |

### 🔗 常用链接

[Minecraft Wiki](https://zh.minecraft.wiki/) · [苦力怕论坛](https://klpbbs.com/) · [Hypixel](https://hypixel.net/) · [Modrinth](https://modrinth.com/) · [MC百科](https://www.mcmod.cn/) · [NameMC](https://namemc.com/)

---

## 🖼 主页预览

主页包含 8 张卡片：

❓ 常见问题
Q：主页加载失败怎么办？

关闭 PCL2 → 删除 %appdata%\PCL\Cache 文件夹 → 重开 PCL2。

Q：日期不更新？

Cloudflare Functions 可能没生效，跑一次 python check.py 诊断。

Q：版本图是旧的？

Cloudflare 缓存没刷新，去控制台清除缓存。

Q：人品分数和别人的一样？

同一 WiFi 下共享 IP，属于正常现象。

🤝 贡献
欢迎提交 Issue 和 Pull Request。

提交 Bug：描述问题 + 附上截图

提交功能：说明用途 + 附上代码

📄 开源协议
本项目采用 MIT License 开源。

⚠️ 主页内容里的版本图来自 Minecraft Wiki，遵循 CC BY-NC-SA 3.0 协议。

🙏 致谢
PCL2 - 强大的 Minecraft 启动器

Minecraft Wiki - 版本信息与封面图

NewsHomepage - 主页设计灵感

Mojang - 版本 API

<div align="center">
如果这个项目对你有帮助，点个 ⭐ Star 支持一下！

Made with ❤️ by wlasfjdskfj

</div> ```
