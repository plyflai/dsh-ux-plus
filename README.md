# dsh-ux-plus

让Deepseek Harness变得更顺手的各种小功能和UX增强包。

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

## 安装

需要 Node.js ≥ 22、PATH 中的 pnpm，以及一个 DSH Web profile。

```bash
dsh plugin --profile <name> add github:plyflai/dsh-ux-plus
```

安装后重启该 profile。打开 **设置 → UX Plus**，即可按需开关各项功能。功能默认开启，单项开关即时生效。

对话字号和宽度在 **设置 → 通用 → 对话区** 调整。

## License

[MIT](LICENSE) © 2026 plyflai
