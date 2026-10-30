# Toonflow storyboardTeam 原版来源

上游仓库：https://github.com/HBAI-Ltd/Toonflow-app
固定 Commit：`af6e884c3d8cda353acaf8ef13aea8ea754a4afd`
授权：MIT。保留原版 `upstream/LICENSE`、原署名及版权声明。

本包 `upstream/` 下的文件来自上游 `packages/teams/storyboardTeam/`，严格逐字节复制，不译、不改、不删。 `src/index.ts` 是 1TiStory 自编的便携 Host 工作流适配，不是 Toonflow 原项目的完整运行时。

| 相对上游文件 | Git blob |
| --- | --- |
| skills/storyboard/SKILL.md | `8c99cfb3a98b927a446cf60d068c2eb41871d4cb` |
| members/director.md | `65208108454629fd53ff7baf74417c1e9d64e546` |
| members/writer.md | `438cffa1bdcd99707bae7b07381344029f4eead6` |
| members/reviewer.md | `c52f845d889bdf5911b0132b7d2ffd22ff1346c8` |
| knowledge/continuity.md | `ff912b4e0cd5537b44a162013670f05456b52462` |
| team.json | `37b9d689ac7ccd03861b1a2b265942f06ecb7919` |
| LICENSE | `dd6492ccf3ecc63016d608be3210a5cb599d8f94` |

ZERO-CALL 测试及 `verifyUpstream()` 检查上述 Git blob。上游更新必须以新的 exact SHA、许可证确认、diff 和定向资格为依据；不自动跟随主分支。

## 许可隔离

该独立包为 MIT，未复制当前 1TiStory 私有源码、用户剧本、数据库、凭证、Provider 或计费逻辑。相邻的 `packages/inkos-claude-workflow/` 独立采用 AGPL-3.0-only，不能混拷；整个历史网站仓库不会因本子包的 MIT 许可变更。
