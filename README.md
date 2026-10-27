# 1TiStory｜短剧创作系统（公开源码）

本仓库提供一份 **1TiStory 早期网站公开版源码**，以及可独立使用的 **InkOS × Claude Agent SDK 短剧创作工作流**。两者应分开理解：公开网站代码不等于当前 1TiStory / sboard 网站的实时源码、部署或业务数据。

## InkOS 短剧创作工作流

**[查看独立工作流 README 与接入指南](packages/inkos-claude-workflow/README.md)**

这个工作流把 InkOS 的短剧创作方法和已保留的专业 Skills 整理为可移植的模块：

```text
CURRENT 四输入与同集证据
    ↓
计划（plan）→ 场次编排（compose）→ 正文候选（write）
    ↓
状态观察（observe）→ 审稿意见（audit）
    ↓
[用户明确要求时] 修订（revise，之后需要重新审稿）
```

- **只有一个 Agent Harness**：宿主使用现有 Claude Agent SDK，工作流自身不运行 pi-agent，不创建第二套 Agent、Provider、Session、数据库、队列或计费系统。
- **来源隔离**：只消费宿主提供、经版本核验的当前集四输入和安全证据，不自动读取历史 Candidate、其他项目或未来集。
- **先生成候选**：工作流不会自动改写正式正文，状态建议及审稿结果由宿主决定如何展示、复审或确认。
- **可验证**：带有无需密钥、不会发起 API 请求的本地测试；模型真实 A/B 与质量提升率尚未验证。

### 立即运行独立包测试（ZERO-CALL）

需要 Node.js **22 或更高版本**，不需要设置 API Key，也不需要启动网站：

```bash
git clone https://github.com/hehome200/1TiStory-short-drama-system.git
cd 1TiStory-short-drama-system
# 尚在 PR 审核期间，先切换工作流公开分支
git switch feature/inkos-claude-sdk-workflow-20261027
cd packages/inkos-claude-workflow
npm test
```

详细介绍、TypeScript `invoke` 适配示例、阶段预算和限制见 [包内 README](packages/inkos-claude-workflow/README.md)。

## 网站公开版源码

根目录保留了仓库原有的 Next.js 网站源码（历史公开快照），未因新增 InkOS 工作流而被替换。开发者可依据根目录 `package.json` 和已有环境模板研究或自行部署；数据库、凭证、第三方服务及其他运行前提需要独立配置。**本仓库不保证与当前生产站一致，也未执行网站生产部署。**

独立工作流不依赖启动这个 Next.js 网站。

## 代码与权限边界

| 内容 | 范围 |
| --- | --- |
| `packages/inkos-claude-workflow/` | 独立创作工作流，**AGPL-3.0-only** |
| `packages/inkos-claude-workflow/skills/` | 从 InkOS 引入的 Skills，保留上游来源与许可证 |
| 根目录其他公开网站代码 | 保留其既有归属和许可状况；**不会因子目录 AGPL 自动变为 AGPL** |
| 私有 1TiStory / sboard 当前源码、数据库、模型密钥 | **不在此仓库发布** |

原项目来源：[Narcooo/inkos](https://github.com/Narcooo/inkos)。本包采用 AGPL-3.0-only，详见 [许可全文](packages/inkos-claude-workflow/AGPL-3.0.txt) 与 [UPSTREAM 来源说明](packages/inkos-claude-workflow/UPSTREAM.md)。商业网络服务及组合作品的许可义务需单独核查。

**公开源码 ≠ 网站 SDK 已启用 ≠ Provider REAL 已执行 ≠ 剧本质量提升已被证明。**
