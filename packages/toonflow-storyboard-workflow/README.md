# Toonflow 分镜工作流（独立可移植）

本包原样保留 [Toonflow](https://github.com/HBAI-Ltd/Toonflow-app) MIT `storyboardTeam`：导演、编写、审阅指令、`storyboard/SKILL.md`、连续性规则和 Team 描述。另提供 1TiStory 自编的最小编排适配，不重新改写上游方法，也不假称这是 Toonflow 官方原生运行时。

## 流程

```text
Host 的 CURRENT 剧本、真实场次、QuoteLock、来源 SHA
 → director 总体计划（原版）
 → writer:场次1（原版 Skill + Writer）
 → reviewer:场次1（原版 Reviewer + Continuity）
 → writer:场次2 → reviewer:场次2 ...
 → Candidate 待用户审阅
```

导演、编写、审阅均以原版完整文本为方法来源。**每镜不是必须输出长篇理由**：最少画面、景别、时长、原文索引、台词索引，可选运动/声音。镜号、台词原文、来源证明和媒体资产由宿主补齐。

## ZERO-CALL 测试

Node.js 22+，无需模型密钥、API、数据库或启动网站：

```bash
cd packages/toonflow-storyboard-workflow
npm test
```

覆盖原版 Git blob 完整性、两场连续生成、持久断点恢复、原文和 QuoteLock 保护、标题不生成镜头、历史或未知回执不自动派发。

## Host 接入

```ts
import {runWithHost,planWorkflow} from "./src/index.ts";

// source 必须由既有网站 Original/Project CURRENT Owner 确认。
// loadReceipts/append 必须连接已有 Work Session，不能使用浏览器缓存。
const result=await runWithHost({
  source,
  loadReceipts:()=>workSession.readCompletedReceipts(),
  invoke:async action=> {
    // Host 完成 ACL、Aura、Provider、Attempt、UNKNOWN 和幂等之后，
    // 以 action.requestId 调用已有 Claude Agent SDK / Direct API。
    return approvedProviderInvoke(action);
  },
  append:async receipt=>workSession.appendCAS(receipt),
});
```

`runWithHost` 只适合运行在现有**服务端持久任务/Worker** 中，绝不在浏览器循环里代替持久调度。网页仅查询进度/展示/导出。失败/UNKNOWN 不隐式重试或换身份；已有已完成回执只读恢复。没有绑定 Host 的模型执行不代表网站已自动续跑。

`planWorkflow(source, receipts)` 是纯函数，可用于只读恢复及生成下一阶段请求。 `acceptReceipt` 校验来源指纹、阶段身份、QuoteLock 和结构，返回待 Host 持久保存的已验证回执。

结果：`candidate_requires_review` 表示文字分镜结构校验完成，仍须人工审核；`review_required` 表示专业审阅提出问题。两者均 **applied:false**，不代表已经渲染视频或上线。镜头数量由剧情决定，不生成“剧名”“集号”的假场次。

## 许可与界限

上游来源、精确提交、原始文件 Git blob 与 MIT 版权见 [UPSTREAM.md](UPSTREAM.md)。本包不包含私有网站代码、商业数据、用户剧本或 Provider 凭证；也未将 Toonflow 服务部署到 1TiStory 网站。独立的 InkOS AGPL 包维持原有边界，不混合授权内容。
