# InkOS × Claude Agent SDK｜独立短剧创作工作流

这是从 [InkOS](https://github.com/Narcooo/inkos) 的创作方法与 Skills 改编的 **AGPL-3.0-only 开源工作流包**，定位为 1TiStory 的可拆卸 Writer 工作流，而不是另外一个 Agent Harness。

**单一执行架构**：模型执行由宿主已有 Claude Agent SDK 负责；本包仅负责创作流程、来源约束与 Candidate 组装。**不运行 pi-agent**，也不新建 Provider、Agent Session、数据库、队列、计费或 Apply Owner。并不宣称完整实现 InkOS 原仓库的全部创作模式。

## 工作流

```text
已确认 CURRENT 四输入 + 同集证据
        ↓
plan 约束与目标规划
        ↓
compose 场次、对抗与行动编排
        ↓
write 单集正文 Candidate
        ↓
observe 状态变化建议（未应用）
        ↓
audit 证据审查（不打分、不自动重写）
        ↓
[可选] revise 显式修订 → 新 Candidate（需要重新审稿）
```

默认执行 **5 个阶段**；指定 `revisionIntent` 时执行 **6 个阶段**。这意味着真正连接 SDK 后通常至少需要 5 次独立模型调用，而不是“一轮 Agent 等于一次 Provider 请求”。

修订稿和原稿的哈希不同会返回 `reviewStatus: "REVIEW_REQUIRED"`、`reviewedCandidateSha256: null`，并将当前 `proposedStateDeltas`、`reviewObservations`、`sourceConflicts` 设置为 `null`。旧审稿结果只保存在标有原稿哈希的 `priorReview` 中，绝不作为修订稿结论。

## 本地零调用验证

要求 Node.js **22+**（支持 `--experimental-strip-types`），无 API Key、Claude SDK 服务或数据库要求：

```bash
cd packages/inkos-claude-workflow
npm test
```

该测试通过模拟 `invoke` 执行，不访问模型。覆盖：5/6 阶段、输入来源检验、非法 JSON 拒绝、修订稿审查失效保护、19,000 字符来源 + 12,000 字符正文的提示词容量，以及超长正文在下游前拒绝。

## 如何接入现有 Claude Agent SDK

从 `src/index.ts` 导入 `runInkOSWorkflow` 和 `admitSource`。给它传入经过宿主鉴权、版本验证的四输入和 **宿主自己的受控 `invoke` 函数**。这里只展示形状，不触发真实调用：

```ts
import { runInkOSWorkflow } from "./src/index.ts";

const result = await runInkOSWorkflow({
  source: {
    projectId: "project123",
    episodeNumber: 1,
    sourceRevision: "current-v7",
    plot: "经过确认的本集剧情单",
    characters: "经过确认的人物单",
    execution: "经过确认的执行单",
    format: "经过确认的格式单",
  },
  requestId: "request-20261027-01",
  invoke: async ({phase, requestId, prompt, sourceSha256}) => {
    // 必须由宿主完成项目 ACL、去重、预算 / Attempt / Receipt、
    // Provider REAL 授权和 UNKNOWN 恢复，之后才调用原有 SDK；
    // 这里不提供可直接付费执行的示例。
    throw new Error("HOST_AGENT_SDK_ADMISSION_REQUIRED");
  },
});
```

任何输出都只是 `candidate_requires_review`，`applied` 永远是 `false`。宿主必须在其现有 Proposal/Review/Apply 中验证并确认候选，不允许由工作流自动保存正式正文。

## 输入、上下文和响应限制

- `source` 必须由宿主从唯一 CURRENT 读取；`sourceSha256` 为四输入 + 证据的内容指纹，不是通过模型文本自报。
- 单集取数，不默认读取未来集、历史 Candidate、失败批次、跨项目材料。
- 单阶段 SDK prompt 最大 30,000 字符；plan / compose / write / observe / audit / revise 的输出预算分别为 1,800 / 2,400 / 18,000 / 1,800 / 2,400 / 18,000 字符。调用前会告知模型长度上限，超限响应按错误处理，不截断正文。
- 审稿上下文能够容纳完整 CURRENT 时使用 `reviewContextMode: "CURRENT_INPUTS"`。空间不足时显式降级为 `"PLAN_PROJECTION"`，不静默截断正典，也不得把没有来源证据的冲突判断当成事实。
- 失败不会自动重试，已经发生的模型调用不能自动当作“未计费”；调用方须保留原始 Attempt 和未知结果。

## 目录及归属

| 路径 | 作用 |
| --- | --- |
| `src/index.ts` | 唯一可移植工作流、来源校验和 Candidate 合同 |
| `skills/` | 保留 InkOS 上游专业 Skills 和参考资料 |
| `test/workflow.test.ts` | 不联网、不扣费的工作流回归 |
| `AGPL-3.0.txt` | 授权全文 |
| `UPSTREAM.md` | 原作者与来源记录 |

网站侧的适配位于 **私有项目** `src/lib/inkos-study/claude-sdk-workflow-adapter.ts`，不属于此开源包。它复用现有 `executeClaudeAgentSdk`；默认 `INKOS_CLAUDE_SDK_WORKFLOW_ENABLED` 关闭、尚无网站正式可用入口，Provider REAL、受保护凭证、模型协议和服务激活仍需独立审批。这个开源包自身不包含 Claude Agent SDK 依赖。

## 开源协议及范围

本**目录下的独立工作流包**采用 **AGPL-3.0-only**。所复制的 InkOS Skills 保留上游版权、来源与许可证（见 [UPSTREAM.md](UPSTREAM.md)）。**并不据此把整个 1TiStory 网站仓库改为 AGPL**。任何进一步的网络部署、分发或组合作品许可事项应按 AGPL 要求单独核查。

公开源码 ≠ 站点部署 ≠ 模型已调用 ≠ 真实正文质量提升。后者必须通过相同模型、相同输入的独立 A/B 正文和盲审验证。
