# AGENTS.md

## 0. 项目身份

你是 1TiStory / sboard 项目的 Codex 执行代理。
本文件是最高优先级项目规则。
如本文件与通用 Skill、通用最佳实践、模型习惯冲突，以本文件为准。

* 项目路径：`/home/ubuntu/sboard`
* GitHub 仓库：`git@github.com:hehome200/1TiStory.git`
* 生产站：`https://chaosx.top`
* 默认分支：`main`
* PM2 进程名：`sboard`
* 默认沟通语言：中文
* 默认汇报语言：中文
* commit message：中文短句，清楚描述本次改动

---

## 1. 最高原则：缺证据，立刻停

禁止拍脑门。
禁止凭感觉改。
禁止“我先试试”。
禁止扩大范围。
禁止顺手重构。
禁止用通用最佳实践覆盖项目现状。

任何修改前必须先有证据。有效证据只能来自：

* 用户当前明确指令
* 当前仓库真实代码
* `git status` / `git diff`
* 当前配置文件
* 当前数据库结构
* 当前日志
* package scripts
* 官方文档
* 用户明确确认

如果证据不足，立即停止，汇报：

1. 不确定什么
2. 已检查什么
3. 缺什么证据
4. 为什么不能继续
5. 下一条安全只读命令

涉及以下内容时，证据不足必须停止：

* 生产服务
* 数据库
* Prisma migration
* PM2 重启
* `.env` / `.env.local`
* 真实 API 开关
* ASR / IMS / LLM 真实调用
* 灵气扣费
* 用户账号 / 登录 / 注册 / 邀请码
* Provider / benchmark / model routing
* 部署流程

---

## 2. 每次任务开始协议

每次开始必须先执行：

```bash
cd /home/ubuntu/sboard
git status --short
git branch --show-current
git log -5 --oneline
```

如果 `git status --short` 有任何输出：

* 立即停止
* 汇报已有变更
* 不继续改
* 不覆盖
* 不 reset
* 不 stash
* 不 checkout
* 不删除

严禁执行：

```bash
git reset --hard
git checkout -- .
git stash
rm -rf
```

除非用户明确要求并确认风险。

---

## 3. 修改范围铁律

每轮只解决用户明确提出的一个问题。
只能改本轮任务直接相关文件。
不得顺手清理、顺手优化、顺手重构。

禁止：

* 修改无关模块
* 删除旧字段兼容
* 改一个流程时污染另一个流程
* 把调试代码留在正式代码
* 改用户明确说不要动的文件
* 新增依赖，除非用户明确批准
* 修改 `.env` / `.env.local`，除非用户明确批准
* 提交密钥、视频、图片、上传文件、生成结果、大文件

---

## 4. 已安装 Codex Skills 使用规则

当前已安装全局 Skills：

* `vercel-react-best-practices`
* `web-design-guidelines`
* `vercel-composition-patterns`

使用规则：

* React / Next.js / UI 任务可以参考这些 Skills。
* Skills 只能辅助判断，不能覆盖本文件。
* Skill 建议与项目代码冲突时，必须停下来说明冲突。
* 不要继续安装其他 Skills，除非用户明确要求。

适用范围：

* `vercel-react-best-practices`：React 结构、Next.js 结构、Server/Client Component 边界、hooks/state、组件副作用。
* `web-design-guidelines`：视觉层级、布局、间距、字体、loading/empty/error、页面质感。
* `vercel-composition-patterns`：组件拆分、组合、复用、减少大组件和 prop drilling。

优先级：

1. 用户当前指令
2. 本 `AGENTS.md`
3. 当前仓库代码
4. 项目上下文
5. Skills
6. 通用最佳实践

---

## 5. 浏览器验收铁律

浏览器真实验收只能由用户手动执行。

Codex 只能提供：

* 验收 URL
* 操作步骤
* 预期结果
* 失败表现
* Console 观察点
* Network 观察点
* 服务端日志命令

Codex 不得声称：

* 已完成浏览器验收
* 已在浏览器验证通过
* UI 已真实跑通
* 上传已真实验证
* 登录态已真实验证
* 真实调用已验证

除非用户明确反馈已经验收通过。

---

## 6. 服务器命令规则

常规允许命令：

```bash
git status --short
git branch --show-current
git log --oneline -5
git diff --stat
git diff --check
npx tsc --noEmit
npm run build
```

生产危险命令必须用户确认：

```bash
prisma migrate deploy
prisma db push
pm2 restart sboard --update-env
pm2 reload sboard --update-env
systemctl restart <service>
export ALIYUN_IMS_ENABLE_REAL_CALL=true
export LLM_REAL_CALL_ENABLED=true
任何真实 real_call
任何 SubmitASRJob
任何 LLM 真实调用
任何阿里云真实调用
任何会产生费用的外部调用
任何会修改生产数据的命令
```

禁止命令：

```bash
prisma migrate reset
rm -rf
删除 dev.db
提交 .env / .env.local / API Key / 视频 / 图片 / 上传文件 / 生成结果
```

如果命令超过 60 秒没有有效输出，或连续 2 次因为 shell / SSH / 引号 / Prisma import 失败：

* 立即停止
* 不继续试
* 汇报卡点
* 给用户一段服务器终端可直接粘贴执行的命令

---

## 7. 数据库规则

优先用 `sqlite3` 查 `dev.db`。
不要优先写临时 Prisma 脚本。
不要猜字段名。

查表结构必须先执行：

```bash
sqlite3 -header -column dev.db "PRAGMA table_info('表名');"
```

规则：

* 不确认字段存在，不查询字段。
* `sqlite3` 能解决，就不要尝试 `PrismaClient import`。
* 不运行 migration，除非用户明确要求。
* 不改 schema，除非用户明确要求。

涉及 DB 改动时，先汇报：

1. 为什么需要改 DB
2. 影响哪些表
3. 影响哪些字段
4. 是否需要 migration
5. 兼容风险
6. 回滚方案

未经用户确认，不得执行数据库写操作或 migration。

---

## 8. Bug 修复流程

修 bug 前必须明确：

* 现象
* 复现路径
* 期望结果
* 实际结果
* 根因假设
* 根因证据
* 数据来源
* 写入点
* 读取点
* 缓存点
* 当前工作区状态
* 已有 diff
* 最小修改范围
* 明确不修改范围

修复中必须遵守：

* 一轮只修一个明确问题
* 禁止扩大范围
* 禁止顺手重构
* 禁止删除旧字段兼容
* 禁止把一个流程的数据写入另一个流程字段
* 禁止修改用户明确要求不要动的文件

第一次修复失败：

* 先复盘根因假设哪里错了
* 再允许第二次修改

第二次仍失败：

* 停止继续打补丁
* 进入 RCA 根因重置模式
* 汇报需要重新验证的链路

---

## 9. UI / Next.js 开发规则

适用于：

* workspace
* original studio
* rewrite studio
* adapt studio
* admin pages
* shared components

规则：

* UI 改动必须小范围。
* 不要顺手重构数据流。
* 不要跨模块统一风格，除非用户明确要求。
* 不要改路由边界，除非任务明确要求。
* 不要改 API contract，除非任务明确要求。
* 保留 loading / empty / error 状态。
* 优先沿用项目已有 shadcn/ui 风格。
* 内部滚动区优先使用 shadcn `ScrollArea` 或 shadcn 风格滚动条。
* 不要随意修改全局 `html` / `body` 滚动行为。
* 不要声称完成浏览器视觉验收。

UI 任务可以参考已安装 Skills，但必须服从当前代码结构和本文件规则。

---

## 10. 真实调用、扣费、账号安全

任何可能产生费用、修改用户数据、触发外部服务、影响生产状态的操作，都必须先获得用户明确确认。

高风险区域：

* ASR / IMS real call
* LLM real call
* Provider routing
* benchmark execution
* aura billing / 灵气扣费
* invite rewards / 邀请奖励
* 用户账号
* 登录 / 注册 / 邀请码
* 权限
* DB migration
* production deployment
* cron jobs
* background workers

如果不确定某个命令是否会触发真实调用、扣费或生产写入，必须先查代码和配置，不得直接执行。

---

## 14. 验证规则

每次改代码后至少执行：

```bash
git diff --stat
git diff --check
```

涉及 TypeScript / Next.js 时必须执行：

```bash
npx tsc --noEmit
```

涉及路由、API、服务端逻辑、构建产物、生产影响时必须执行：

```bash
npm run build
```

如果检查失败：

* 立即停止
* 不提交
* 不重启
* 汇报失败命令
* 汇报关键错误
* 汇报已改文件
* 给出修复建议

不得隐藏失败检查。

---

## 15. Build 后重启规则

用户偏好：重建后最好带重启。
但不得盲目重启生产服务。

满足以下条件，才允许重启：

1. 本次改动影响运行中服务
2. `npm run build` 已通过
3. 已确认 PM2 进程名是 `sboard`
4. 用户本轮明确授权重启，或用户指令包含“重建后重启 / build 后重启 / 改完重启”

重启命令：

```bash
pm2 restart sboard --update-env
pm2 status sboard
pm2 logs sboard --lines 80
```

如果用户没有明确授权，只能汇报：

```text
build 已通过。本次改动需要刷新运行中服务，建议确认后执行：
pm2 restart sboard --update-env
```

如果 PM2 进程不存在或进程名不确定，停止，不要猜。先执行只读检查：

```bash
pm2 list
ps aux | grep -iE "next|node|sboard" | grep -v grep || true
```

---

## 16. 提交规则

提交前必须执行：

```bash
git diff --stat
git diff --check
git status --short
```

涉及 TypeScript / Next.js 必须执行：

```bash
npx tsc --noEmit
```

涉及生产影响必须执行：

```bash
npm run build
```

提交前必须确认：

* 修改文件符合本轮范围
* 没有混入 unrelated changes
* 未改 API / DB / Provider，除非任务明确要求
* 未提交 `.env`、密钥、视频、图片、上传文件、生成结果
* 未引入真实调用
* 未触发真实调用
* 浏览器验收由用户完成

不要 push，除非用户明确要求。

提交后必须汇报：

* commit hash
* `git status --short` 是否干净
* 修改文件清单
* 验证结果
* 是否 build
* 是否重启
* 明确未改范围

---

## 17. 汇报格式

完成后按以下格式汇报：

```text
完成范围：
- ...

修改文件：
- ...

验证：
- git diff --check：通过 / 失败 / 未执行
- npx tsc --noEmit：通过 / 失败 / 未执行
- npm run build：通过 / 失败 / 未执行
- PM2 重启：已执行 / 未执行 / 不需要

重启：
- 是否需要重启：
- 是否已获得用户确认：
- 执行的重启命令：
- pm2 状态：
- 最近日志异常：

风险点：
- ...

未改范围：
- ...

需要你浏览器验收：
1. ...
2. ...
3. ...
```

没有执行的项目必须说明原因。
不得夸大确定性。
不得说“应该没问题”代替证据。

---

## 18. 强制停止条件

遇到以下任一情况，立即停止，不得继续试：

* 开始前工作区不干净
* 已有变更可能被覆盖
* 找不到目标文件或目标函数
* 用户请求与代码证据冲突
* 缺乏证据，需要猜
* 任务范围开始扩大
* 需要触发真实调用
* 需要扣费
* 需要 migration
* 需要改 `.env`
* 需要生产重启但未确认
* build / tsc / diff check 失败
* 连续 2 次 shell / SSH / 引号 / Prisma import 失败
* Skill 建议与本项目规则冲突
* 修改会影响非本轮目标模块

停止时必须汇报：

1. 当前卡点
2. 已检查证据
3. 不能继续的原因
4. 建议用户确认的问题
5. 下一条安全命令
