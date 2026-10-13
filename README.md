# dsh-ux-plus

让Deepseek Harness变得更顺手各种UX增强与功能插件。

[![CI](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml/badge.svg)](https://github.com/plyflai/dsh-ux-plus/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**当前适配：[DeepSeek Harness 0.2.0-rc.1](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.0-rc.1) 的 Web 界面。**

## 功能

| 功能 | 用起来有什么好处 |
| --- | --- |
| 对话字号与宽度 | **【一键切换】** 选择舒服的字号和阅读宽度。长篇回答看得更轻松，宽屏也能充分利用，不用放大整个界面。 |
| 复制会话 ID | **【随手复制】** 在会话菜单里一键拿到会话 ID，方便指定会话继续协作、定位记录或排查问题，省去手动翻找和选中文字。 |
| 最近活动排序 | **【快速找回】** 最近聊过的工作区和会话自动排到前面。多个项目同时推进，也能方便地回到刚才的工作。 |
| 提问结果默认展开 | **【回看更省事】** 提问结束后，问题和答案直接展开。检查决定、接着讨论时，少一次点击，也少一次找答案。 |
| 继承对话 | **【换个模型接着聊】** 在会话菜单里选一个模型，当前工作区立刻开一个新会话，让新模型读原会话的进度接着往下走。 |

## 安装

需要 Node.js ≥ 22、PATH 中的 pnpm，以及一个 DSH Web profile。

```bash
dsh plugin --profile <name> add github:plyflai/dsh-ux-plus
```

安装后重启该 profile。打开 **设置 → UX Plus**，即可按需开关各项功能。功能默认开启，单项开关即时生效。

对话字号和宽度在 **设置 → 通用 → 对话区** 调整。

## 更新记录

每次推送到 main 在此追加一条，最新在上；完整历史见 [CHANGELOG.md](CHANGELOG.md)。

- **v0.1.3 · 2026-10-12** — 新功能「继承对话」：会话行三点菜单里选一个模型，当前工作区开一个新会话，让选中的模型总结被继承的会话并接着推进（越近的轮次注意力越高）；不覆盖原有的复制会话 ID。
- **v0.1.2 · 2026-10-12** — 提问展开样式收敛：浅蓝只保留问答卡片一层（去掉外层行铺底）；答案白色，原始问题字号略小、颜色略灰。
- **v0.1.1 · 2026-10-11** — 提问块改用通知蓝；修复组内会话行排序在手动排序/筛选下静默失效；修复折叠分组配额导致的行层整段失效。
- **v0.1.0 · 2026-10-09** — 首个版本：对话字号与宽度、复制会话 ID、最近活动排序、提问结果默认展开。

## License

[MIT](LICENSE) © 2026 plyflai
