import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  ChevronRight,
  ClipboardCheck,
  Code2,
  FileText,
  MessageCircle,
  PenLine,
  Sparkles,
  Star,
  Trophy,
  Users,
  Wand2,
} from "lucide-react";
import { CommunityAction, CommunityViewTracker } from "@/components/community/community-actions";
import { communityConfig } from "@/lib/community-config";

export const metadata: Metadata = {
  title: "加入 1TiStory AI短剧生产实验室｜AI短剧共创社区",
  description:
    "加入 1TiStory AI短剧生产实验室，和创作者、开发者一起共创 AI 短剧生产流程，沉淀短剧模板、案例拆解、剧本工作流和产品反馈。",
};

const audienceCards = [
  {
    title: "短剧创作者",
    description: "你正在写短剧、做小程序剧、做竖屏内容，想用 AI 提高生产效率。",
    icon: PenLine,
  },
  {
    title: "小白编剧 / 网文作者",
    description: "你有故事灵感，但需要更稳定的结构、大纲、人物和分集流程。",
    icon: BookOpen,
  },
  {
    title: "AI 工具玩家",
    description: "你正在研究 prompt、工作流，希望参与一个真实内容生产场景。",
    icon: Wand2,
  },
  {
    title: "开发者 / 开源共创者",
    description: "你想参与 sboard / 1TiStory 社区版，贡献插件、模板、部署方案或产品建议。",
    icon: Code2,
  },
];

const benefits = [
  "1TiStory 免费内测资格",
  "短剧案例拆解模板",
  "爆款短剧开头拆解表",
  "AI短剧生成提示词简版",
  "每周共创任务和案例复盘",
  "优先体验新功能",
  "贡献者积分、徽章和模板署名",
  "后续 Pro 会员 / 训练营 / 私有化合作优先权",
];

const resourceList = [
  { title: "短剧案例拆解模板", description: "用结构化方式拆解爆款短剧" },
  { title: "爆款开头拆解表", description: "分析前 3 秒、15 秒、30 秒钩子" },
  { title: "AI短剧提示词简版", description: "帮助新用户快速开始生成" },
  { title: "模板共创库", description: "沉淀复仇、霸总、都市情感等题材模板" },
  { title: "产品路线图", description: "公开社区版和 Cloud 版迭代方向" },
];

const contributionScores = [
  ["提交一个案例拆解", "+50"],
  ["提交一个剧本模板", "+80"],
  ["提交一个有效 bug", "+30"],
  ["提交一个功能建议被采纳", "+100"],
  ["参与内测并提交反馈", "+50"],
  ["写一篇产品使用体验", "+100"],
];

const faqs = [
  {
    question: "这是付费社群吗？",
    answer:
      "第一阶段不是付费社群，主要面向真实创作者和 AI 工作流共创者开放内测。后续可能推出 Pro 会员、模板包或训练营，但当前重点是共创和验证。",
  },
  {
    question: "不会写剧本可以加入吗？",
    answer: "可以。只要你对短剧、网文、AI 内容生产或爆款结构感兴趣，并愿意提交真实反馈，就适合加入。",
  },
  {
    question: "开发者可以参与什么？",
    answer: "开发者可以参与 sboard 社区版、插件接口、部署方案、模型 provider、模板 schema 和开源 issue 共建。",
  },
  {
    question: "加入后需要做什么？",
    answer:
      "建议完成一次真实测试：输入一个短剧灵感，生成角色和大纲，然后反馈哪一步最惊喜、哪一步最水、你愿意为什么付费。",
  },
];

function SectionHeading({ kicker, title, description }: { kicker: string; title: string; description?: string }) {
  return (
    <div className="mb-8 max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="h-px w-10 bg-gradient-to-r from-amber-400/70 to-transparent" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70">{kicker}</span>
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-8 text-white/58 md:text-lg">{description}</p> : null}
    </div>
  );
}

export default function CommunityPage() {
  const joinFallback = communityConfig.waitlistUrl ? undefined : "内测申请表链接即将开放，请先关注社区页后续更新。";
  const wechatFallback = communityConfig.waitlistUrl.trim() || undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
      <CommunityViewTracker />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_44%),radial-gradient(circle_at_75%_20%,rgba(6,182,212,0.12),transparent_34%)]" />

      <nav className="relative z-10 border-b border-white/10 bg-[#0a0a0f]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10">
              <PenLine className="h-5 w-5 text-amber-300" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-[0.12em]">1TiStory</span>
              <span className="block text-[10px] tracking-[0.12em] text-white/45">AI短剧生产实验室</span>
            </span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/70 transition hover:border-white/25 hover:text-white">
            返回首页
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-5 py-12 md:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-cyan-100">
            <Sparkles className="h-3.5 w-3.5" />
            加入 1TiStory AI短剧生产实验室
          </div>
          <h1 className="mt-7 text-4xl font-black leading-[1.08] tracking-tight text-white md:text-6xl">
            不是用户交流群，
            <span className="block bg-gradient-to-r from-amber-200 via-cyan-100 to-amber-100 bg-clip-text text-transparent">而是 AI短剧生产共创社区</span>
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/64 md:text-lg">
            1TiStory AI短剧生产实验室，是一个围绕短剧生产流程的共创社区。一起把短剧创作拆成可复用、可测试、可规模化的 AI 生产流程。从灵感、人物、大纲、分集，到案例拆解分析、剧本评估和分镜出片，我们正在共创一套真正能落地的 AI 短剧生产系统。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <CommunityAction label="申请加入内测社区" href={communityConfig.waitlistUrl} event="community_waitlist_click" variant="primary" icon="send" fallbackMessage={joinFallback} className="w-full sm:w-auto" />
            <CommunityAction label="领取短剧案例拆解模板" href={communityConfig.templateDownloadUrl} event="community_template_click" variant="secondary" icon="book" fallbackMessage="资料包链接即将开放，请先关注社区页后续更新。" className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-7">
          <div className="rounded-3xl border border-amber-300/15 bg-gradient-to-br from-amber-400/12 via-white/[0.03] to-cyan-400/10 p-5 md:p-7">
            <p className="text-sm font-semibold tracking-[0.14em] text-amber-100/80">COMMUNITY FLOW</p>
            <div className="mt-6 grid gap-3 text-sm text-white/72">
              {["灵感", "人物", "大纲", "分集", "案例拆解分析", "剧本评估", "分镜 / 出片"].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-300/12 text-xs font-bold text-amber-100">{String(index + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm leading-7 text-white/60">
              如果你正在写短剧、研究爆款、使用 AI 做内容，或者想参与 AI 工作流共创，欢迎加入第一批内测共创者。
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/6 bg-white/[0.015] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <SectionHeading kicker="WHO" title="这个社区适合这些人" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {audienceCards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-amber-300/25 hover:bg-white/[0.06]">
                <card.icon className="h-7 w-7 text-amber-200" />
                <h3 className="mt-5 text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/56">{card.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:px-6 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading kicker="BENEFITS" title="加入后你能获得什么" />
          <div className="grid gap-3 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                <span className="text-sm leading-6 text-white/72">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/6 bg-[#0c0d13] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <SectionHeading kicker="MISSION" title="当前共创任务" description="我们正在招募第一批 100 位内测共创者，一起测试：一句灵感 → 人物小传 → 前 10 集大纲 → 每集结尾钩子 → 剧本评估反馈。你只需要提交一次真实测试反馈，就可以获得基础内测额度和资料包。" />
          <div className="rounded-3xl border border-amber-300/18 bg-gradient-to-br from-amber-400/10 via-white/[0.035] to-cyan-400/8 p-5 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-amber-100/75">任务 #001</p>
                <h3 className="mt-3 text-2xl font-bold text-white">共创 10 个爆款短剧开头模板</h3>
              </div>
              <span className="inline-flex w-fit items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-xs font-semibold text-amber-100">开放招募中</span>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-5">
              {["主角是谁？", "被谁欺负？", "第一个反击点是什么？", "第三集结尾钩子是什么？", "最爽的一句台词是什么？"].map((item, index) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/16 p-4">
                  <span className="text-xs font-bold text-cyan-100/70">{index + 1}</span>
                  <p className="mt-3 text-sm leading-6 text-white/72">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <SectionHeading kicker="ASSETS" title="社区正在沉淀这些资产" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {resourceList.map((resource) => (
              <article key={resource.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <FileText className="h-6 w-6 text-cyan-200" />
                <h3 className="mt-5 text-base font-bold text-white">{resource.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/54">{resource.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/6 bg-white/[0.015] py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:px-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <SectionHeading kicker="SCORES" title="贡献不是白干，每一次有效反馈都能沉淀权益" description="你可以通过提交案例拆解案例、剧本模板、bug、功能建议、产品测试反馈获得积分。积分可兑换生成额度、高级模板包、作品点评、Pro 体验和共创者徽章。" />
            <div className="flex flex-wrap gap-3 text-sm text-white/62">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2"><Trophy className="h-4 w-4 text-amber-200" />贡献者徽章</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2"><Star className="h-4 w-4 text-cyan-200" />模板署名</span>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-[#11121a] p-5 md:p-7">
            <div className="grid gap-3">
              {contributionScores.map(([label, score]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3">
                  <span className="text-sm text-white/70">{label}</span>
                  <span className="shrink-0 rounded-full bg-amber-300/12 px-3 py-1 text-sm font-bold text-amber-100">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="join" className="relative z-10 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:px-6 lg:grid-cols-[0.96fr_1.04fr]">
          <div>
            <SectionHeading kicker="JOIN" title="加入 1TiStory AI短剧生产实验室" description="第一批社区名额优先开放给真实创作者、短剧从业者、AI 工作流玩家和开发者。加入前请准备一个你想测试的短剧灵感，或者一个你拆过的短剧案例。" />
            <div className="grid gap-3 sm:grid-cols-2">
              <CommunityAction label="申请加入微信群" href={wechatFallback} event="community_join_click" variant="primary" icon="message" fallbackMessage="微信群二维码即将开放，请先填写内测申请表。" />
              <CommunityAction label="领取资料包" href={communityConfig.templateDownloadUrl} event="community_template_click" variant="secondary" icon="book" fallbackMessage="资料包链接即将开放，请先关注社区页后续更新。" />
              <CommunityAction label="访问飞书资料库" href={communityConfig.feishuDocsUrl} event="community_feishu_click" variant="ghost" icon="arrow" fallbackMessage="飞书资料库链接即将开放，请先关注社区页后续更新。" />
              <CommunityAction label="查看 sboard 开源计划" href={communityConfig.githubUrl} event="community_github_click" variant="ghost" icon="github" />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-amber-200" />
              <h3 className="text-xl font-bold text-white">微信群承接</h3>
            </div>
            <div className="mt-6 flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-white/16 bg-black/18 p-6 text-center">
              {communityConfig.wechatQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={communityConfig.wechatQrUrl} alt="1TiStory AI短剧生产实验室微信群二维码" className="h-56 w-56 rounded-2xl object-cover" />
              ) : (
                <div>
                  <Users className="mx-auto h-10 w-10 text-white/35" />
                  <p className="mt-4 text-base font-semibold text-white/78">微信群二维码即将开放，请先填写内测申请表。</p>
                  <p className="mt-3 text-sm leading-6 text-white/48">二维码、飞书资料库、资料包链接都走配置项，空值不会影响页面上线。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 border-y border-white/6 bg-[#0c0d13] py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-5 md:px-6">
          <SectionHeading kicker="FAQ" title="常见问题" />
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:p-6">
                <h3 className="text-lg font-bold text-white">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-white/58">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-5 py-16 md:px-6 md:py-24">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-amber-300/16 bg-gradient-to-br from-amber-400/12 via-white/[0.04] to-cyan-400/10 p-6 text-center md:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10">
            <ClipboardCheck className="h-6 w-6 text-amber-100" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-white md:text-5xl">一个沉默的 500 人群，不如 30 个真实反馈用户。</h2>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-white/64">
            如果你愿意一起测试、共创、拆解和优化 AI 短剧生产流程，欢迎加入第一批 1TiStory 共创者。
          </p>
          <div className="mt-8 flex justify-center">
            <CommunityAction label="申请加入内测社区" href={communityConfig.waitlistUrl} event="community_waitlist_click" variant="primary" icon="send" fallbackMessage={joinFallback} />
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/8 px-5 py-8 text-center text-xs text-white/36 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <span>1TiStory AI短剧生产实验室</span>
          <span>{communityConfig.contactEmail || "community contact pending"}</span>
        </div>
      </footer>
    </main>
  );
}
