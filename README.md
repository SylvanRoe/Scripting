<div align="center">

# Scripting

**适用于 iPhone 与 iPad 的 Scripting App 脚本与桌面小组件库**

从全能聚合看板到精致桌面 Widget。每个项目独立封装、一键导入、独立更新。

[![Platform](https://img.shields.io/badge/Platform-iPhone%20%7C%20iPad-007AFF?logo=apple&logoColor=white)](https://apps.apple.com/app/apple-store/id6479691128)
[![Projects](https://img.shields.io/badge/Projects-5-34C759)](#全部项目)
[![Stars](https://img.shields.io/github/stars/SylvanRoe/Scripting?style=flat&label=Stars)](https://github.com/SylvanRoe/Scripting/stargazers)
[![Last commit](https://img.shields.io/github/last-commit/SylvanRoe/Scripting?style=flat&label=Updated)](https://github.com/SylvanRoe/Scripting/commits/main)
[![Telegram](https://img.shields.io/badge/Telegram-@Air__QT-26A5E4?logo=telegram&logoColor=white)](https://t.me/Air_QT)

[开始使用](#开始使用) · [主力推荐](#主力推荐) · [全部项目](#全部项目) · [组织约定](#组织约定) · [免责声明](#免责声明)

</div>

> 每个项目链接均指向打包好的 `.scripting` 独立安装包，点击项目名称即可一键唤起 Scripting 导入。项目所需的设置页、桌面小组件（Widget）、交互 Intent 与相关资源会随对应项目一并导入。

## 开始使用

1. 安装 [Scripting App](https://apps.apple.com/app/apple-store/id6479691128)。
2. 从下方列表选择需要的项目，**点击项目名称**直接打开一键导入页。
3. 回到 Scripting 运行项目；按项目说明完成基础参数、API Key、账号或桌面 Widget 配置。

| 项目规模 | 导入方式 | 维护与文档 |
| :--- | :--- | :--- |
| 5 个独立项目（含多合一看板套件） | `.scripting` 单项目一键导入 | 独立目录维护 · 附项目内 `README.md` |

## 主力推荐

| 项目 | 用途 | 文档 |
| :--- | :--- | :--- |
| [DashBoard-Kit](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2FDashBoard-Kit%2FDashBoard-Kit.scripting%22%5D) | 多组件看板聚合套件：统一后台配置管理，支持通过小组件参数自由切换 Quantumult X、Media Nexus、DeepSeek、WorkBuddy、Codex、Antigravity、CPAMP、qBittorrent、今日油价、节点检测等多套精美卡片。 | [查看说明](DashBoard-Kit/) |
| [今日油价](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2F%E4%BB%8A%E6%97%A5%E6%B2%B9%E4%BB%B7%2F%E4%BB%8A%E6%97%A5%E6%B2%B9%E4%BB%B7.scripting%22%5D) | 全国各省市汽柴油价格实时监控与调价窗口预测桌面小组件，提供多套现代视觉风格，支持系统定位与自定义省份。 | [查看说明](今日油价/) |
| [喝水记录](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2F%E5%96%9D%E6%B0%B4%E8%AE%B0%E5%BD%95%2F%E5%96%9D%E6%B0%B4%E8%AE%B0%E5%BD%95.scripting%22%5D) | 轻量饮水与饮品打卡工具，配套可交互桌面小组件（小 / 中 / 大号），支持桌面快捷按钮一键打卡并同步至 Apple 健康。 | [查看说明](喝水记录/) |

## 全部项目

### 聚合看板与监控

| 项目 | 版本 | 描述 | 来源 / 维护 |
| :--- | :--- | :--- | :--- |
| [DashBoard-Kit](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2FDashBoard-Kit%2FDashBoard-Kit.scripting%22%5D) | `v1.0.7` | 多组件看板聚合套件（统一后台配置管理，支持小组件参数自由切换 Quantumult X、Media Nexus、DeepSeek、WorkBuddy、Codex、Antigravity、CPAMP、qBittorrent、今日油价、节点检测等多套精美卡片）。 | 原创 · [目录](DashBoard-Kit/) |
| [SGCC](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2FSGCC%2FSGCC.scripting%22%5D) | `v1.0.2` | 国家电网电量中号小组件，展示年度/月度用电量与电费、阶梯进度、近日用电柱状图，支持多账户/多户名。 | 移植自 @脑瓜 v2.3.3 · [目录](SGCC/) |
| [SGCC_Mod](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2FSGCC_Mod%2FSGCC_Mod.scripting%22%5D) | `v1.2.1` | 网上国网电费中号小组件增强版，全面复刻三栏显示内容自由定制，支持后付费余额、5–15 日用电柱状图等。 | 维护 @jpcnmm · [目录](SGCC_Mod/) |

### 日常与生活 Widget

| 项目 | 版本 | 描述 | 来源 / 维护 |
| :--- | :--- | :--- | :--- |
| [今日油价](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2F%E4%BB%8A%E6%97%A5%E6%B2%B9%E4%BB%B7%2F%E4%BB%8A%E6%97%A5%E6%B2%B9%E4%BB%B7.scripting%22%5D) | `v1.4.8` | 实时全国各省市汽柴油价格监控与调价预测桌面小组件，提供通报通知胶囊、极简仪表盘等多套风格，支持系统定位与自定义省份。 | 原创 · [目录](今日油价/) |
| [喝水记录](https://www.scripting.fun/import_scripts/?urls=%5B%22https%3A%2F%2Fgithub.com%2FSylvanRoe%2FScripting%2Fraw%2Frefs%2Fheads%2Fmain%2F%E5%96%9D%E6%B0%B4%E8%AE%B0%E5%BD%95%2F%E5%96%9D%E6%B0%B4%E8%AE%B0%E5%BD%95.scripting%22%5D) | `v2.0.0` | 轻量饮水 / 饮品记录工具，配套可交互桌面小组件（`systemSmall` / `systemMedium` / `systemLarge`），支持将「水」记录一键同步到 Apple 健康，桌面快捷按钮直接打卡。 | 原创 · [目录](喝水记录/) |

## 组织约定与使用说明

- **独立目录结构**：每个子目录对应一个独立脚本项目，`script.json` 为项目入口描述，`entry` 指向 `index.tsx`（设置页 / 主入口），同目录下提供打包好的 `<项目名>.scripting` 供一键导入。
- **配置与依赖**：部分组件需要配置 API Key、账号凭据、代理重写或授予系统权限（如定位、Apple 健康），具体步骤请查阅各自子目录内的 `README.md`。
- **署名与维护**：各子目录内均完整保留原作者署名信息；本仓库整理、移植与原创维护为 **SylvanRoe**（Telegram: [@Air_QT](https://t.me/Air_QT)）。

## 相关链接

- [安装 Scripting App (App Store)](https://apps.apple.com/app/apple-store/id6479691128)
- [Scripting 官方网站](https://www.scripting.fun/index.html)
- [提交问题与建议 (Issues)](https://github.com/SylvanRoe/Scripting/issues)

## 免责声明

<details>
<summary>点击展开完整免责声明与补充说明</summary>

### 免责声明

- 本仓库中涉及任何解锁和解密分析的脚本仅用于资源共享和学习研究，不能保证其合法性、准确性、完整性和有效性，请根据情况自行判断。
- 本仓库内的任何内容禁止在中华人民共和国境内平台公开传播。
- 请勿将本仓库内的任何内容用于商业或非法目的，否则后果自负。
- 如果任何单位或个人认为该项目的脚本可能涉嫌侵犯其权利，则应及时通知并提供身份证明、所有权证明，我将在收到认证文件后删除相关脚本。
- 对任何本仓库中包含的脚本在使用中可能出现的问题概不负责，包括但不限于由任何脚本错误导致的任何损失或损害。
- 您必须在下载后的 24 小时内从计算机或手机中完全删除以上内容。
- 以任何方式查看此项目的人或直接或间接使用该项目的任何脚本的使用者都应仔细阅读此声明。保留随时更改或补充此免责声明的权利。一旦使用并复制了任何本仓库相关脚本或其他内容，则视为您已接受此免责声明。

### 补充说明

- 本仓库内的脚本不允许商业用途，但是可以用于学习和研究，转载请保留原作者署名信息！

</details>

---

<div align="center">

更多小组件陆续补充中 · 遇到问题请 [提交 Issue](https://github.com/SylvanRoe/Scripting/issues/new) · Maintained by [SylvanRoe](https://github.com/SylvanRoe)

</div>
