# 社区入口配置说明

## 页面路径

/community

## 入口位置

- 首页顶部导航
- 移动端导航
- 首页社区引导区
- Footer

## 环境变量

| 变量 | 作用 | 是否必须 |
|---|---|---|
| NEXT_PUBLIC_COMMUNITY_WECHAT_QR_URL | 微信群二维码图片 URL | 否 |
| NEXT_PUBLIC_COMMUNITY_FEISHU_DOCS_URL | 飞书资料库链接 | 否 |
| NEXT_PUBLIC_COMMUNITY_GITHUB_URL | GitHub / sboard 入口 | 否 |
| NEXT_PUBLIC_COMMUNITY_WAITLIST_URL | 内测申请表链接 | 否 |
| NEXT_PUBLIC_COMMUNITY_TEMPLATE_DOWNLOAD_URL | 社区资料领取链接 | 否 |
| NEXT_PUBLIC_COMMUNITY_CONTACT_EMAIL | 联系邮箱 | 否 |

## 上线前推荐配置

至少配置：

- NEXT_PUBLIC_COMMUNITY_WAITLIST_URL
- NEXT_PUBLIC_COMMUNITY_FEISHU_DOCS_URL
- NEXT_PUBLIC_COMMUNITY_TEMPLATE_DOWNLOAD_URL
- NEXT_PUBLIC_COMMUNITY_GITHUB_URL

微信群二维码可以暂不公开，建议先通过内测表单人工筛选后拉群。

## 注意事项

- 不要提交 .env / .env.local
- 不要把 AccessKey、API Key、私密链接写入代码
- 微信群二维码如果经常过期，建议不要直接提交到 public 目录
- 如果二维码要公开，建议使用可替换的 OSS/CDN 图片链接
- 修改环境变量后需要重新 build/restart 才会生效
