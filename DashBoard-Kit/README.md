# DashBoard-Kit 仪表盘套件

基于 [Scripting](https://www.scripting.fun) 开发的聚合小组件仪表盘套件。一个脚本管理所有配置，支持通过 iOS 桌面小组件「参数」自由切换展示多种看板风格。

---

## ✨ 功能特性

* **多服务一站式聚合**：一个组件包囊括媒体服务器、大模型 API 余额、积分池、用量额度等多场景监控。
* **桌面小组件自由切换**：长按小组件选择「编辑小组件」，在**参数**中输入服务代号即可无缝切换看板类型。
* **原生交互式静默刷新**：右上角配备 iOS 17+ 原生 AppIntent 刷新按钮，点击即在后台静默抓取最新数据并重新渲染。
* **安全凭据存储**：所有 Token、API Key 等敏感数据均持久化在 iOS 原生 Keychain 安全区域，配置不泄露。

---

## 📱 支持看板类型及小组件参数

在桌面添加小组件后，**长按小组件 -> 编辑小组件 -> 在「参数」中填入以下关键字**即可：

| 参数关键字 | 看板类型 | 尺寸 | 功能简介 |
| :--- | :--- | :--- | :--- |
| `qx` 或 `quantumult` / `圈x` | **Quantumult X** | 小号 / 中号自适应 | 方案三深度联动：桌面直接点击切换运行模式（分流/全局/直连）与策略组节点，实时监控机场剩余流量、落地出口与延迟 |
| `qx_traffic` 或 `qx2` / `圈x流量` | **Quantumult X (流量统计)** | 小号 / 中号自适应 | 暗黑风上下行累计流量、策略组数、实时延迟、剩余流量与运行模式监控看板 |
| `media` 或 `moviepilot` / `emby` | **Media Nexus** | 中号 (Medium) | 聚合展示近 7 日入库、今日入库、电影/剧集/分集总览、最近入库片单及存储余量 |
| `deepseek` | **DeepSeek 余额** | 小号 (Small) | 实时监控账户余额、可用状态、近 7 日消费金额 |
| `workbuddy` 或 `wb` | **WorkBuddy 积分池** | 小号 (Small) | 直连 workbuddy2api 面板，展示积分剩余、签到账号、已消耗积分与请求数 |
| `codex` | **Codex 用量** | 小号 (Small) | 官方 OAuth 直连，监控 5 小时与周配额用量比例 |
| `antigravity` 或 `ag` | **Antigravity 配额** | 小号 (Small) | Google CloudCode 配额用量监控 |
| `cpamp` | **CPAMP 监控** | 小号 (Small) | 监控今日调用量、成功/失败数及消费额度 |
| `vpn` 或 `node` | **网络节点状态** | 小号 (Small) | 当前公网 IP、节点地区、延迟及网络状态监控 |
| `qbittorrent` 或 `qb` | **qBittorrent** | 小号 / 中号自适应 | 实时下行与上行速率、做种/活跃任务数、累计传输与磁盘余量 |
| `fuel` 或 `oil` / `油价` | **今日油价** | 小号 / 中号自适应 | 小号展示 Shell 贝壳高光与主力油品大字，中号展示 4 联卡片行情 |

> 💡 提示：若参数为空，小组件将根据您已配置的服务自动展示最适宜的看板（中号默认展示 Media Nexus，小号默认展示 WorkBuddy）。

---

## 🛠️ 使用与配置说明

1. **首次配置**：在 Scripting App 中直接**点击运行** `DashBoard-Kit`，即可进入可视化配置管理面板。
2. **配置各服务连接**：
   * **Quantumult X**：在圈X「重写 -> 引用」中添加远程重写订阅 `https://raw.githubusercontent.com/SylvanRoe/Scripting/refs/heads/main/DashBoard-Kit/qx_dashboard.conf` 并开启重写开关；可在脚本内填入机场订阅链接获取真实剩余流量，或自定义展示的 4 个策略组。
   * **MoviePilot / Emby**：填入服务器局域网或公网地址及 API Key。
   * **DeepSeek**：填入平台 User Token 或官方开放平台 API Key。
   * **WorkBuddy**：填入 workbuddy2api-panel 面板地址及 Token。
3. **添加桌面小组件**：
   * 返回 iOS 桌面，长按空白处进入编辑模式，添加 **Scripting** 小组件。
   * 选择脚本为 `DashBoard-Kit`。
   * 长按小组件点击「编辑小组件」，在「参数」中填入上述对应的关键字（如 `media` 或 `deepseek`）。
4. **刷新说明**：
   * 小组件遵循 iOS 系统的定时后台轮询刷新机制。
   * 支持点击组件右上角的小刷新图标，实时通过 AppIntent 触发后台抓取并重载。如涉及内网服务，请确保设备处于相同网络环境或已连接 VPN。
