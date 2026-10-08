# dsh-ux-plus

DeepSeek Harness（DSH）Web 界面增强包。一个插件提供四项功能，每项都可以单独开关。

[![CI](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

| 功能 | 作用 |
| --- | --- |
| 对话区字号与宽度 | 调整聊天内容的字号和最大宽度，保留原有参数控件 |
| 复制会话 ID | 在工作区会话行的 `⋯` 菜单里增加复制会话 ID 的入口 |
| 最近活动排序 | 工作区分组及组内会话按最近更新排列 |
| 提问结果默认展开 | 提问结束后展开问题与答案，方便回看 |

## 安装

需要 Node.js ≥ 22、PATH 中的 pnpm，以及支持 `dsh.client`、`dsh.bundle.patch` 和 `sidebar.workspaces.session.menu.item` 槽位的 DSH Web profile。

```bash
dsh plugin --profile <name> add github:plyflai/dsh-ux-plus
```

安装后重启该 profile。设置左侧会出现 **UX Plus** 入口。四项功能默认开启，单项开关即时生效，刷新页面后保留设置。

**Plugins 页**上的 `dsh-ux-plus` 卡控制整包启停；**设置 → UX Plus** 控制各项功能。

本仓库包含构建后的 `lib/client.js`，从 GitHub 安装时无需自行构建。当前尚未发布 npm 版本或 GitHub Release。

## 更新与卸载

```bash
dsh plugin --profile <name> update dsh-ux-plus
dsh plugin --profile <name> remove dsh-ux-plus
```

更新或卸载后重启该 profile。部分宿主版本卸载时会留下 profile `cordis.patch.yml` 中的 `ux-plus` 开关覆盖行；若存在该残留，请删除该行。

## 从旧插件迁移

本包整合了 `dsh-ui-tweak`、`dsh-session-id-menu` 和 `dsh-workspace-folder-order` 的能力。已使用旧插件的用户应移除旧包及旧 patch 引用，再启用本包，避免重复挂载同一功能。

对话区字号和宽度沿用 `ui-tweak` 设置 namespace。四项功能的开关存储在 `ux-plus` namespace。

## 行为与兼容性

- 最近活动排序调整视觉顺序，按更新时间降序、相同时间按 ID 升序排列。即使宿主选择手动排序，本项开启时仍以最近活动为准；当前未命名的新会话保持首位。
- 提问结果展开只处理 `ask_user_question` 工具卡。紧凑模式中的工具调用组仍需手动展开。
- 对话区字号与宽度只作用于聊天内容。宿主外观设置中的全局字号继续在自身作用域生效。
- 会话 ID 菜单使用宿主原生槽位，由宿主传入准确的会话 ID。排序和提问展开使用宿主 DOM 结构，对话排版使用宿主 CSS token。宿主升级后，槽位、选择器或 token 变化可能影响这些功能；遇到问题可关闭单项，并附宿主版本提交 [Issue](https://github.com/plyflai/dsh-ux-plus/issues)。

## 开发

```bash
git clone https://github.com/plyflai/dsh-ux-plus.git
cd dsh-ux-plus
npm ci
npm test
npm run build
npm pack
```

构建生成 `lib/client.js`，并检查宿主半语法、客户端注册 ID、经典脚本格式和允许的运行时模块。CI 在 Node.js 22 和 24 上运行测试、构建和打包检查。

```text
src/                宿主入口、客户端入口与开关管理
features/           四项功能的内部模块
lib/client.js       随仓库及安装包分发的浏览器产物
tests/              包结构、开关、排序和提问展开测试
scripts/build.js    构建产物检查
cordis.patch.yml    整包的自指加载行
```

`features/` 下的模块随 `dsh-ux-plus` 一起分发，不单独安装或发布。修改客户端源码后需重新构建，并提交 `lib/client.js`。

## License

[MIT](LICENSE) © 2026 plyflai
