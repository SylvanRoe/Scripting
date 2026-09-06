# 喝水记录

> iOS Scripting 平台上的轻量饮水/饮品记录工具，配套可交互桌面小组件，支持将「水」记录一键同步到 Apple 健康。

## ✨ 功能特性

- **多饮品支持**：内置 8 种常见饮品（水、茶、咖啡、果汁、牛奶、汽水、运动饮料、汤），每条记录均带有饮品种类、容量与时间戳。
- **可交互桌面小组件**：
  - 支持 `systemSmall` / `systemMedium` / `systemLarge` 三种尺寸。
  - 小组件内可放置 **1–2 个** 常用饮品快捷按钮（一键打卡）。
  - 实时显示「今日累计 / 目标 / 进度条 / 完成百分比」。
  - 午夜后自动请求时间线刷新，避免显示昨日数据。
- **健康同步（仅「水」）**：
  - 开启同步后，新增的「水」记录会先暂存在本地（标记 `pending`），**避免在小组件 / 后台弹健康权限框**。
  - 在主界面点击「同步待处理饮水」即可批量写入 Apple Health（标记为 `synced` / 失败 `failed`）。
  - 每条记录附带 `healthSampleUUID` 与 `drinkRecord.id` 元数据，**不会重复写入**已存在的健康样本。
- **当日 / 历史数据**：
  - 今日记录实时累加，进度条按目标（默认 2000 mL）动态变化。
  - 自动维护 `drink_daily_history` 兼容旧版本。
- **细节优化**：
  - 进度条已通过 `scaleEffect` 加粗至 **2 倍**，上下左右更大留白（24–34pt）使小组件视觉更聚焦。
  - 小号小组件按钮 44×44 圆点；中/大号组件按钮为 capsule 卡片，便于点击。

## 📁 仓库结构

```
喝水记录/
├── README.md            ← 当前文件
├── script.json          ← Scripting 平台脚本元数据
├── index.tsx            ← App 入口，呈现 WaterView
├── WaterView.tsx        ← 主界面：今日记录 / 列表 / 同步按钮 / 偏好设置
├── model.ts             ← 数据层：饮品类目、记录、目标、同步逻辑
├── app_intents.tsx      ← 小组件调用的 AppIntent（后台打卡）
├── widget.tsx           ← 桌面小组件视图
└── global.d.ts          ← Scripting 全局类型声明
```

## 🚀 快速开始

1. 在 iOS 设备上安装最新版 **Scripting** App。
2. 将本目录文件拷贝到 Scripting 项目的 `喝水记录/` 下。
3. 打开 App 即可使用「喝水记录」；长按桌面添加对应小组件。

> 本仓库仅含源码，**不包含** 任何 Keychain 中的 Git 凭据或本地健康数据。

## 🧩 小组件

| 尺寸 | 行为 |
| --- | --- |
| `systemSmall`  | 标题 + 累计/目标 + 进度条 + 2 个圆点按钮 |
| `systemMedium` | 同上 + 标签更丰富、按钮为 capsule 卡片 |
| `systemLarge`  | 与 medium 相同布局，可放置更多内容（按钮区域保持居中） |

> 小组件按钮通过 `app_intents.tsx` 中的 `AppIntent` 实现，写入本地后立刻 `Widget.reloadAll()` 触发更新；**不会** 触发健康写入。

## ❤️ 健康同步逻辑

1. 第一次在主界面开启「同步到健康」开关（开关状态保存在 `drink_sync_to_health`）。
2. 之后所有新增的 `water` 记录都会被打上 `pending` 标记，**不直接** 写入健康。
3. 用户在主界面点击「同步待处理饮水」按钮：
   - 逐条通过 `HealthQuantitySample.create` 构造样本（`type: dietaryWater`，单位 `mL`）。
   - 写入前先标记为 `syncing`（含 `healthSampleUUID`）作为崩溃恢复锚点。
   - 写入成功后标记为 `synced`；失败则标为 `failed` 并保留在本地。
4. 已标记为 `synced` 的记录 **不会** 被再次尝试同步，避免在健康中产生重复样本。

### 为什么不在小组件里直接同步？

iOS 小组件运行在受限的后台环境，**无法弹出系统健康授权框**。若直接在小组件触发 `Health.saveQuantitySample`，会因权限未授予而失败，或在某些设备上出现响应延迟。因此：

- 小组件 → 写入本地 + `pending` 标签。
- 主界面手动触发 → 统一请求健康权限 + 批量写入。

## ⚙️ 数据存储键

| 键 | 用途 | 默认值 |
| --- | --- | --- |
| `drink_records_today` | 当日所有记录（`DrinkRecord[]`） | `[]` |
| `drink_daily_goal`    | 每日目标（mL） | `2000` |
| `drink_custom_ml`     | 自定义单次饮用量 | `250` |
| `drink_widget_drinks` | 桌面小组件展示的饮品种类（1–2 个） | `["water", "tea"]` |
| `drink_sync_to_health`| 是否启用健康同步 | `false` |
| `drink_daily_history` | 兼容旧版的每日累计缓存 | `{}` |

## 🛠 开发

- **类型检查**：在 Scripting 项目根目录执行 `get_typescript_diagnostics` 或 `scripting-ts run <project>`。
- **小组件预览**：
  ```bash
  scripting-ts widget "喝水记录" --family systemSmall --screenshot
  scripting-ts widget "喝水记录" --family systemMedium --screenshot
  ```
- **运行主界面**：
  ```bash
  scripting-ts run "喝水记录"
  ```

## 📜 版本

- 当前版本：`2.0.0`
- 兼容性：iOS 17+，Scripting App 最新版。

## 📄 许可

仅用于个人学习与日常饮水记录。Apple Health、Apple Scripting 及其相关图标均为 Apple Inc. 商标。
