# Release Checklist

## 当前稳定基线

- 用户体系 V1 已封口
- 本地烟测通过
- 当前本地提交：2456697 document user system v2 backlog

## 上线前必须确认

### 1. Git 状态

- 工作区 clean
- 所有本地封口提交已确认
- 上线前再统一 push 到 GitHub

### 2. 环境变量检查

列出需要人工确认的变量，不要暴露真实值：

- DATABASE_URL
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- AUTH_SECRET，如果项目使用
- 生产环境域名
- OpenRouter / 千帆 / 模型服务相关 API Key
- 未来微信登录相关 AppID / Secret，当前可为空
- 未来邮件服务变量，当前可为空
- 未来短信服务变量，当前可为空

### 3. 数据库迁移演练

只写步骤，不执行：

- 备份生产数据库
- 确认当前 migration 状态
- 执行 prisma migrate deploy
- 执行 prisma generate
- 检查 User 新字段
- 检查 PointTransaction / PromotionRelation / CommissionRecord 表
- 检查旧用户 pointsBalance 默认值
- 检查 NextAuth 表不受影响

### 4. 回滚预案

写清楚：

- 数据库迁移前必须有备份
- 如果 migration 失败，停止部署
- 如果部署失败，回滚代码版本
- 如果积分数据异常，先禁用生成扣费入口，再人工修复流水
- 不建议直接删流水，应追加 admin_adjust 或 refund 修正

### 5. 上线后烟测

列出步骤：

- 新用户注册获得 50 积分
- 邀请码注册邀请人获得 20 积分
- 登录后首页直接弹创作方向
- 设置页能进入账户中心
- 账户中心显示余额和流水
- 余额不足生成返回积分不足
- 余额足够生成扣 10 分
- 生成失败自动退款
- 工作区生成链路正常
- 未登录访问 /account 跳转登录

### 6. 暂不上线的 V2 项

- 真实微信扫码登录
- 真实邮箱验证码
- 真实手机短信验证码
- 积分充值/支付
- 会员套餐
- 推广商后台
- 分佣提现
- 管理员后台 UI