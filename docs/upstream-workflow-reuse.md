# 1TiStory｜成熟开源工作流复用与公开同步约定 V1

适用：当 1TiStory 需要使用成熟开源项目的 AI 工具、Agent、Skill、工作流、创作指南时。此约定规范**默认方法**，不是永久放行任何第三方代码的许可，也不是生产发布授权。

## 默认执行方式（无需重复询问是否该“自己重写”）

1. **先选择成熟上游**：检索项目的官方源码、真实工作流、许可、提交版本、已验证能力；不把 README 宣传或 demo 当作完整 Runtime。
2. **原样保留**：优先逐文件复制上游 Skill/Agent/Workflow 与所需依赖文档到独立 `packages/<source>-<capability>-workflow/`；不在引入环节翻译、改写或“优化”原版方法。
3. **固化 Provenance**：保留上游仓库、exact SHA、文件 Git blob、LICENSE/NOTICE、原作者署名及可更新的版本声明。更新采用显式 diff 与验证，不自动追随主分支。
4. **隔离适配**：仅在本包 `src/` 中做公开、可移植的 Host Adapter（输入版本/哈希、来源索引、模型输出合同、回执/幂等）。不修改原版上游文件，不拼装两套竞争的 Provider、Agent Harness、DB、任务中心或计费系统。
5. **复用现有宿主**：正式网站由 1TiStory 现有 Claude Agent SDK / Direct API、Work Session、Project ACL、QuoteLock、Aura、Review/Apply、Video Owner 接管。公开工作流包自身不自动对外请求模型、不承诺浏览器关闭后可自主后台运行。
6. **失联恢复**：一切阶段基于来源指纹和宿主持久回执；UNKNOWN 不自动重派；宿主的持久 Worker/Session 负责继续下一个阶段，前端只读显示。
7. **测试与发布**：先针对原版哈希、来源、QuoteLock、断点恢复、失败锁定进行 ZERO-CALL；随后 GitHub PR、Diff Review、安全合并。网站正式接入时按 development exact-SHA Qualification 与适用用户浏览器验收独立完成。公开包 PASS 不等于网站 REAL PASS。
8. **不混入私密业务**：不发布未公开的 1TiStory 源码、运营 Prompt、数据库、用户剧本、密钥、生成作品和生产配置。源码不具备发布权利或许可证不清晰时先停在**单项法律/发布 Gate**，其余技术开发继续。

## 授权边界

- MIT、Apache-2.0 等可以在满足原版权/NOTICE/条款后复用；AGPL/GPL 等强 Copyleft 应作为**明确许可边界的独立包**，不得把其源码悄悄并进私有站或另一个宽松许可包。
- 用户已明确选择这种可移植工作流复用的技术路线。以后同类技术选型不再逐次询问“是否照搬”；但**没有自动获得**发布私有文件、额外模型 REAL、生产上线、受保护 DB 写入、Secrets 或跨仓库高风险权限。
- 一项完整业务目标未完成时保持 ACTIVE；工作流代码、公开包已合并、网站技术 PASS、最终浏览器验收分别记录，不互相冒充。
