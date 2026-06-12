const trimEnv = (value: string | undefined) => value?.trim() ?? "";

export const communityConfig = {
  wechatQrUrl: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_WECHAT_QR_URL),
  feishuDocsUrl: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_FEISHU_DOCS_URL),
  githubUrl: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_GITHUB_URL) || "https://github.com/hehome200/1TiStory",
  waitlistUrl: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_WAITLIST_URL),
  templateDownloadUrl: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_TEMPLATE_DOWNLOAD_URL),
  contactEmail: trimEnv(process.env.NEXT_PUBLIC_COMMUNITY_CONTACT_EMAIL),
};
