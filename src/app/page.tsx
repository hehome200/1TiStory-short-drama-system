"use client";

import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { CreationDirectionModal } from "@/components/creation-direction-modal";
import { CommunityModal } from "@/components/community/community-modal";
import { track } from "@/lib/analytics";
import {
  Film,
  MapPin,
  LayoutTemplate,
  FileText,
  Layers,
  Palette,
  Hammer,
  CheckCircle2,
  ArrowRight,
  Box,
  PenTool,
  Lightbulb,
  CircleDot,
  Users,
  Shield,
  DollarSign,
  Wrench,
  Building2,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

// 流程卡片组件
function ProcessCard({ step, index }: { step: typeof processSteps[0]; index: number }) {
  const themeColor = index === 0 ? "amber" : index === processSteps.length - 1 ? "violet" : "blue";

  const themeClasses = {
    amber: {
      border: "border-amber-500/30",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      gradient: "from-amber-500/20 to-amber-500/5",
      shadow: "shadow-amber-500/20",
    },
    violet: {
      border: "border-violet-500/30",
      bg: "bg-violet-500/10",
      text: "text-violet-400",
      gradient: "from-violet-500/20 to-violet-500/5",
      shadow: "shadow-violet-500/20",
    },
    blue: {
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      gradient: "from-blue-500/20 to-blue-500/5",
      shadow: "shadow-blue-500/20",
    },
  };

  const theme = themeClasses[themeColor as keyof typeof themeClasses];

  return (
    <div className="relative h-full w-full max-w-4xl">
      {/* 背景大序号 */}
      <div className="absolute -right-20 -top-20 text-[20rem] font-bold leading-none text-white/[0.02] select-none">
        {step.num}
      </div>

      <div className={`relative z-10 overflow-hidden rounded-3xl border-2 ${theme.border} bg-gradient-to-br ${theme.gradient} p-8 md:p-12 shadow-2xl ${theme.shadow}`}>
        <div className="flex items-start gap-8">
          {/* 左侧：图标 */}
          <div className={`shrink-0`}>
            <div className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${theme.gradient} shadow-xl`}>
              <step.icon className={`h-12 w-12 ${theme.text}`} />
            </div>
            {/* 序号徽章 */}
            <div className={`mt-4 flex items-center justify-center rounded-full ${theme.bg} px-4 py-2`}>
              <span className={`text-sm font-mono font-bold ${theme.text}`}>STEP {step.num}</span>
            </div>
          </div>

          {/* 右侧：内容 */}
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-4">
              <h3 className="text-3xl font-bold text-white">{step.title}</h3>
              <span className={`rounded-full px-4 py-1.5 text-xs font-mono uppercase tracking-[0.2em] ${theme.bg} ${theme.text}`}>
                {step.code}
              </span>
            </div>

            {/* 标签列表 */}
            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
              {step.items.map((item, itemIndex) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + itemIndex * 0.1 }}
                  className={`group rounded-xl border border-white/10 ${theme.bg} p-4 transition hover:scale-105 hover:border-white/20`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 mb-3">
                    <div className={`h-2 w-2 rounded-full ${theme.text.replace('text-', 'bg-')}`} />
                  </div>
                  <span className="text-sm text-white/80 group-hover:text-white">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const navLinks = [
  { name: "业务", href: "#services" },
  { name: "转型", href: "#transition" },
  { name: "流程", href: "#process" },
  { name: "案例", href: "#cases" },
  { name: "关于", href: "#why-us" },
  { name: "联系", href: "#contact" },
];

const sectionIds = ["hero", "services", "transition", "process", "cases", "why-us", "contact"];

const services = [
  {
    icon: Film,
    title: "短剧内容生产",
    description: "从题材定位到分集大纲，从人设搭建到正文剧本，建立可持续生产的短剧内容链路。",
    tags: ["题材定位", "人物关系", "分集大纲", "正文剧本", "爽点检测", "台词优化"],
  },
  {
    icon: MapPin,
    title: "文旅演艺策划",
    description: "把地方文化、历史人物、城市传说转化为可演、可看、可互动的文旅内容。",
    tags: ["地方文化提炼", "故事线设计", "NPC 互动脚本", "夜游剧情", "演艺动线", "场景道具"],
  },
  {
    icon: LayoutTemplate,
    title: "展馆展陈内容",
    description: "为博物馆、科技馆、企业展厅、公共安全馆等项目建立完整的内容叙事系统。",
    tags: ["主题策划", "展线叙事", "展项文案", "多媒体脚本", "讲解词", "互动内容"],
  },
  {
    icon: Box,
    title: "空间视觉化与施工转化",
    description: "把内容继续拆成场景、影像、道具、材料、灯光和施工协作语言。",
    tags: ["场景拆解", "效果图方向", "多媒体分镜", "材料建议", "施工配合", "现场交付"],
  },
];

const processSteps = [
  {
    num: "01",
    title: "内容策划",
    items: ["文化资源", "品牌信息", "项目目标", "叙事结构"],
    icon: Lightbulb,
    code: "CONTENT_PLANNING",
  },
  {
    num: "02",
    title: "剧本与文案",
    items: ["短剧剧本", "文旅演艺脚本", "展陈文案", "讲解词"],
    icon: FileText,
    code: "SCRIPT_COPYWRITING",
  },
  {
    num: "03",
    title: "场景视觉化",
    items: ["空间氛围", "场景分区", "道具清单", "效果图方向"],
    icon: Palette,
    code: "SCENE_VISUALIZATION",
  },
  {
    num: "04",
    title: "多媒体脚本",
    items: ["影片脚本", "互动内容", "数字展项", "分镜提示词"],
    icon: Film,
    code: "MULTIMEDIA_SCRIPT",
  },
  {
    num: "05",
    title: "深化设计",
    items: ["平面动线", "展项布局", "材料建议", "灯光氛围"],
    icon: Layers,
    code: "DETAILED_DESIGN",
  },
  {
    num: "06",
    title: "施工落地",
    items: ["施工指导", "现场协调", "多媒体联调", "交付验收"],
    icon: Hammer,
    code: "CONSTRUCTION",
  },
];

const cases = [
  {
    title: "北京大兴天宫院文史馆",
    type: "文史展馆 / 沉浸式展陈",
    capabilities: ["内容升级", "空间叙事", "多媒体融合", "场景氛围"],
    highlight: "由传统展陈升级为融合多媒体技术、手工艺雕塑与影视艺术的沉浸式展出。",
    gradient: "from-slate-700/30 to-slate-800/30",
  },
  {
    title: "太原植物园科普馆",
    type: "植物科普馆",
    capabilities: ["科普内容策划", "展线叙事", "互动体验", "空间视觉"],
    highlight: "围绕植物演化、植物奥秘、植物智慧、植物生态与植物文化构建完整故事线。",
    gradient: "from-emerald-700/25 to-emerald-900/25",
  },
  {
    title: "威海海洋科技馆",
    type: "科技馆 / 海洋主题展陈",
    capabilities: ["主题场景化", "多媒体展示", "科技内容转译"],
    highlight: "围绕海洋科技、冷链物流、智慧港口等主题进行场景化展示。",
    gradient: "from-cyan-700/25 to-cyan-900/25",
  },
  {
    title: "合肥公共安全馆",
    type: "公共安全馆",
    capabilities: ["安全教育内容", "沉浸体验", "互动展项", "场景模拟"],
    highlight: "通过公共安全、消防、防灾主题的沉浸式空间提升安全教育体验。",
    gradient: "from-orange-700/25 to-orange-900/25",
  },
  {
    title: "昆山生产安全馆",
    type: "生产安全馆",
    capabilities: ["事故场景模拟", "安全主题叙事", "强体验展陈"],
    highlight: "将火灾、事故、生产安全等抽象知识转化为可体验的安全教育场景。",
    gradient: "from-red-700/25 to-red-900/25",
  },
  {
    title: "全国 19 省市非物质文化遗产展",
    type: "大型展会 / 非遗文化展示",
    capabilities: ["文化内容组织", "展会空间规划", "视觉传播"],
    highlight: "大型非遗文化展示项目，强调文化内容组织、展会空间规划与视觉传播。",
    gradient: "from-amber-700/25 to-amber-900/25",
  },
];

const moreProjects = [
  // 中国开头
  "中国军事医学博物馆",
  "中国戏曲博物馆",
  "中国雄安华望城展厅",
  "中国流动科技馆",
  "中科馆临展",

  // 北京开头
  "北京档案特藏展",
  "北京科学中心",
  "北京大兴区天宫院文化展厅",
  "北京大兴区金隅党建服务中心",
  "北京建工集团",
  "北京一轻集团企业展厅",

  // 省级/市级（按地区排序）
  "甘肃华亭博物馆展厅",
  "陕西考古博物馆",
  "河北峰峰博物馆",
  "呼伦贝尔历史博物馆",
  "宁夏中卫市博物馆展厅深化设计",
  "南茹八路军纪念馆",
  "延庆军史馆",
  "屈子书院",
  "满洲里规划馆",
  "中铁水务展厅",
  "中石化石油工程技术研究院企业展",
  "唐山城市排水有限公司企业展厅",
  "江西信丰非遗展厅",
  "中日合作示范区文化空间及展厅",
  "包头市科技馆",
  "南宁科技馆",
  "克拉玛依科技馆",
  "内蒙古科技馆",
  "武汉科技馆",
  "佛山科技馆",
  "三明市科技馆",
  "绍兴科技馆",
  "威海海洋科技馆",
  "宁夏科技馆",
  "太原植物科普馆",
  "合肥公共安全馆",
  "烟台应急安全馆",
  "昆山生产安全馆",
  "徐州公共安全馆",
  "太原植物园",
  "金坛气象馆",
  "长沙环保馆",
  "鄂尔多斯游客服务中心",
  "红山军马场党建主题馆",
  "江苏金坛金城科技党建",
  "福建高院廉政文化教育基地",
  "广州黄花岗党群服务中心",
  "山东施可丰企业展厅",
];

const whyChooseUs = [
  {
    icon: Shield,
    title: "专业实力",
    description: "团队成员具备多年展陈设计、空间设计与多媒体项目经验，能够理解内容、视觉与落地之间的关系。",
  },
  {
    icon: DollarSign,
    title: "报价透明",
    description: "根据不同项目阶段和交付深度，建立更清晰的服务边界与报价方式。",
  },
  {
    icon: Wrench,
    title: "全程跟踪",
    description: "从项目理解、内容策划到视觉深化、施工配合，持续跟进关键节点。",
  },
  {
    icon: Building2,
    title: "技术创新",
    description: "关注前沿多媒体、数字展项、AI 内容生产与视觉化工具，让文化内容以更有记忆点的方式呈现。",
  },
];

const teamGroups = [
  "行业专家组",
  "主案设计组",
  "主创策划组",
  "总工程师组",
  "高级平面设计组",
  "场景设计组",
  "多媒体组",
  "展品设计组",
  "空间设计组",
];

const stats = [
  { value: "多年", label: "展陈设计经验", sub: "EXPERIENCE" },
  { value: "覆盖", label: "文博馆/科技馆/商业空间/公共安全馆/文旅展会", sub: "PROJECT_TYPES" },
  { value: "一体化", label: "策划/设计/多媒体/施工指导", sub: "FULL_SERVICE" },
  { value: "持续", label: "真实项目案例沉淀为内容生产系统", sub: "ONGOING" },
];

export default function Home() {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [scrolled, setScrolled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [communityModalSource, setCommunityModalSource] = useState("unknown");

  const handleWorkspaceEnter = useCallback(() => {
    window.location.href = `/workspace`;
  }, []);

  const handlePrimaryCta = useCallback(() => {
    handleWorkspaceEnter();
  }, [handleWorkspaceEnter]);

  const handleCommunityEntry = useCallback((source: string) => {
    track("community_home_entry_click", { source });
    setCommunityModalSource(source);
    setCommunityModalOpen(true);
  }, []);
  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

  // 初始显示 3 行，每行约 14 个项目（根据屏幕宽度自适应）
  const visibleProjects = showAllProjects ? moreProjects : moreProjects.slice(0, 42);

  // 流程步骤导航
  const navigate = useCallback((delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    setActiveIndex(prev => Math.max(0, Math.min(prev + delta, processSteps.length - 1)));
  }, []);

  // 滚轮监听 - 流程部分
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const processSection = document.getElementById("process");
      if (!processSection) return;

      const rect = processSection.getBoundingClientRect();
      // 只有当 process 部分在视口中时才响应滚轮
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        // 在第一个步骤且向上滚，或在最后步骤且向下滚时，允许继续滚动页面
        if ((activeIndex === 0 && e.deltaY < 0) || (activeIndex === processSteps.length - 1 && e.deltaY > 0)) {
          return; // 不阻止默认行为，允许页面继续滚动
        }

        if (Math.abs(e.deltaY) > 30) {
          e.preventDefault();
          navigate(e.deltaY > 0 ? 1 : -1);
        }
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });
    return () => document.removeEventListener("wheel", handleWheel);
  }, [activeIndex, navigate]);

  // 键盘监听 - 流程部分
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const processSection = document.getElementById("process");
      if (!processSection) return;

      const rect = processSection.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        // 在第一个步骤且向上/左，或在最后步骤且向下/右时，允许继续滚动页面
        if ((activeIndex === 0 && (e.key === "ArrowUp" || e.key === "ArrowLeft")) ||
            (activeIndex === processSteps.length - 1 && (e.key === "ArrowDown" || e.key === "ArrowRight"))) {
          return; // 不阻止默认行为，允许页面继续滚动
        }

        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          navigate(1);
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          navigate(-1);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, navigate]);

  // 滚动监听 - 导航高亮
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;

      for (const section of sectionIds) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }

      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 平滑滚动到指定区域
  const scrollToSection = useCallback((href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] text-white antialiased">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl shadow-lg shadow-black/20"
          : "border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-xl"
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
         <div className="flex h-10 w-10 items-center justify-center transition-transform hover:scale-105">
  <img
    src="/LOGO_W.png"
    alt="1TiStory"
    className="h-10 w-10 object-contain"
  />
</div>
            <div>
              <div className="text-sm font-bold tracking-[0.12em] text-white">
                以太内容实验室
              </div>
              <div className="text-[10px] tracking-[0.12em] text-white/50">
                1Ti Visual Story
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection(link.href);
                }}
                className={`text-xs font-medium tracking-[0.08em] transition-all ${
                  activeSection === link.href.slice(1)
                    ? "text-amber-300 scale-105"
                    : "text-white/60 hover:text-white/90"
                }`}
              >
                {link.name}
                {activeSection === link.href.slice(1) && (
                  <span className="absolute -bottom-1 left-0 h-px w-full bg-amber-400" />
                )}
              </a>
            ))}
            <button
              onClick={() => handleCommunityEntry("desktop_nav")}
              className="text-xs font-medium tracking-[0.08em] text-white/60 transition-all hover:text-amber-200"
            >
              加入社区
            </button>
            <button
              onClick={handleWorkspaceEnter}
              className={`group relative overflow-hidden rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-xs font-semibold tracking-[0.08em] text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-500/20`}
            >
              <span className={`relative z-10`}>进入工作台</span>
              <div className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 to-transparent opacity-0 transition group-hover:opacity-100`} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-white/10 bg-[#0a0a0f]/95 backdrop-blur-xl lg:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection(link.href);
                    }}
                    className={`rounded-lg px-4 py-3 text-sm font-medium transition ${
                      activeSection === link.href.slice(1)
                        ? "bg-amber-500/10 text-amber-300"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    {link.name}
                  </a>
                ))}
                <button
                  onClick={() => {
                    handleCommunityEntry("mobile_nav");
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-lg px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-amber-200"
                >
                  加入社区
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleWorkspaceEnter(); }}
                  className={`mt-2 flex items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold tracking-[0.08em] text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-500/20`}
                >
                  <Sparkles className={`h-4 w-4`} />
                  进入工作台
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen bg-[#0a0a0f] pt-20">
        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl flex-col justify-center px-6 py-12">
          {/* Left Content - Centered */}
          <motion.div
            className="mx-auto max-w-4xl text-center"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            {/* Tag */}
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium tracking-[0.18em] text-blue-300"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <CircleDot className="h-3 w-3" />
              1Ti Visual Story
            </motion.div>

            {/* Main Title */}
            <motion.h1
              className="mt-8 text-4xl font-black leading-[1.1] tracking-tight text-white md:text-5xl lg:text-6xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              内容生产与
              <span className="relative block bg-gradient-to-r from-amber-200 via-blue-200 to-amber-200 bg-clip-text text-transparent">
                视觉化策划平台
                <div className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-amber-400 via-blue-400 to-amber-400" />
              </span>
            </motion.h1>

            {/* Tagline */}
            <motion.div
              className="mt-8 text-2xl font-medium tracking-wide text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              让故事进入现实。
            </motion.div>

            {/* Subtitle */}
            <motion.p
              className="mt-4 max-w-2xl mx-auto text-base text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              为短剧、文旅演艺与展陈空间，生成剧本、场景与视觉方案，让内容最终落到可体验的现场。
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="mt-10 flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <button
                onClick={handlePrimaryCta}
                className={`group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/35`}
              >
                进入工作台
                <ArrowRight className={`h-4 w-4 transition-transform group-hover:translate-x-1`} />
              </button>
            </motion.div>

            {/* Capability Tags */}
            <motion.div
              className="mt-10 flex flex-wrap justify-center gap-2 text-xs text-white/40 tracking-[0.15em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {["短剧内容", "文旅演艺", "展陈空间", "多媒体视觉"].map((tag, i) => (
                <motion.span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  {tag}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right - Abstract Visual Background */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
          >
            {/* Ambient Glows - 简化动效 */}
            <div className="absolute -right-32 top-1/4 h-64 w-64 rounded-full bg-amber-500/3 blur-3xl" />
            <div className="absolute -left-32 bottom-1/4 h-64 w-64 rounded-full bg-blue-500/3 blur-3xl" />

            {/* Subtle Wireframe - 静态显示 */}
            <div className="absolute right-0 top-1/3 h-[400px] w-[400px] opacity-[0.04]">
              <svg viewBox="0 0 400 400" className="h-full w-full">
                <path d="M50,350 L150,150 L350,150 L400,350 Z" stroke="rgba(59,130,246,0.4)" strokeWidth="1" fill="none" />
                <path d="M80,350 L160,180 L340,180 L370,350 Z" stroke="rgba(59,130,246,0.3)" strokeWidth="0.5" fill="none" />
                <path d="M120,350 L180,220 L320,220 L340,350 Z" stroke="rgba(59,130,246,0.2)" strokeWidth="0.5" fill="none" />
                <circle cx="200" cy="200" r="80" stroke="rgba(251,191,36,0.2)" strokeWidth="0.5" fill="none" />
                <circle cx="200" cy="200" r="50" stroke="rgba(251,191,36,0.15)" strokeWidth="0.5" fill="none" />
              </svg>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community Entry Section */}
      <section className="relative border-t border-white/5 bg-[#0a0a0f] py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="grid gap-6 rounded-2xl border border-amber-500/18 bg-gradient-to-br from-amber-500/[0.09] via-white/[0.035] to-cyan-500/[0.07] p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100/80">
                <Users className="h-3.5 w-3.5" />
                Community
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white md:text-3xl">
                加入 AI短剧生产实验室
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/60 md:text-base">
                和第一批创作者、开发者一起共创 AI 短剧生产流程，沉淀短剧模板、案例拆解案例和真实产品反馈。
              </p>
              <p className="mt-3 text-xs leading-6 text-amber-100/70">
                免费内测、案例拆解模板、爆款开头拆解表、共创任务每周更新。
              </p>
            </div>
            <button
              onClick={() => handleCommunityEntry("home_section")}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-400/60 bg-amber-500/15 px-6 py-3 text-sm font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-500/22"
            >
              加入社区
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-amber-400/60">01</span>
              <div className="h-px w-12 bg-gradient-to-r from-amber-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                SERVICES
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              四类业务方向
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-white/50">
              从短剧内容到文旅演艺，从展馆展陈到空间视觉化，我们提供完整的内容生产与落地服务。
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition hover:border-amber-500/30 hover:from-white/[0.06]"
              >
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br from-amber-500/10 to-blue-500/10 opacity-0 blur-3xl transition group-hover:opacity-100" />

                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <service.icon className="h-6 w-6 text-amber-400" />
                  </div>

                  <h3 className="mt-5 text-lg font-bold text-white">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    {service.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {service.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 transition group-hover:border-amber-500/30 group-hover:text-amber-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Transition Section */}
      <section id="transition" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-blue-400/60">02</span>
              <div className="h-px w-12 bg-gradient-to-r from-blue-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                TRANSITION
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              从展陈设计经验，
              <span className="bg-gradient-to-r from-blue-200 to-blue-400 bg-clip-text text-transparent">
                生长出内容生产系统
              </span>
            </h2>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-3">
            {/* Traditional Capabilities */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8"
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                传统项目能力
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "展陈设计",
                  "多媒体设计",
                  "活动设计",
                  "平面设计",
                  "商业空间",
                  "文旅规划",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                  >
                    <div className="h-2 w-2 rounded-full bg-blue-500/50" />
                    <span className="text-sm text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Arrow / Transition */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="relative h-full w-full min-h-[200px]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-px w-full bg-gradient-to-r from-blue-500/30 via-amber-500/50 to-blue-500/30" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-3 text-center">
                    <div className="text-xs font-medium uppercase tracking-[0.15em] text-amber-300">
                      经验沉淀
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* New Platform Capabilities */}
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              transition={{ delay: 0.3 }}
              className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-transparent p-8"
            >
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400/60">
                新平台能力
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "剧本生产",
                  "展陈叙事",
                  "场景视觉化",
                  "多媒体脚本",
                  "施工落地",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3"
                  >
                    <CheckCircle2 className="h-4 w-4 text-amber-400" />
                    <span className="text-sm text-amber-100">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Description */}
          <motion.div
            className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <p className="text-base leading-relaxed text-white/70">
              以太科技过去长期服务于博物馆、科技馆、企业展厅、公共安全馆、文旅展会等项目。今天，我们将这些项目经验沉淀为一套新的内容生产方法：先建立故事和叙事，再转化为场景、影像、互动、道具和施工语言。
            </p>
          </motion.div>
        </div>
      </section>

      {/* Process Section - Scroll Snap Cards */}
      <section id="process" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16 text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="mb-8 flex items-center justify-center gap-3">
              <span className="text-xs font-mono text-violet-400/60">03</span>
              <div className="h-px w-12 bg-gradient-to-r from-violet-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                PROCESS
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              从内容策划到
              <span className="bg-gradient-to-r from-violet-200 to-violet-400 bg-clip-text text-transparent">
                现场交付
              </span>
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-white/50">
              不是停留在文字生成，而是把创意逐步转化为可设计、可制作、可沟通、可施工的项目文件。
            </p>
          </motion.div>

          {/* Scroll Snap Cards Container */}
          <div className="relative h-[600px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
            {/* 进度指示器 - 左侧 */}
            <div className="absolute left-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
              {processSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? "w-6 bg-gradient-to-r from-amber-400 to-violet-400"
                      : "bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* 当前步骤显示 */}
            <div className="relative h-full w-full">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={activeIndex}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -100 : 100 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-0 flex items-center justify-center p-8 md:p-16"
                >
                  <ProcessCard step={processSteps[activeIndex]} index={activeIndex} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 导航按钮 - 右侧 */}
            <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
              <button
                onClick={() => navigate(-1)}
                disabled={activeIndex === 0}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 text-white/60 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <div className="text-center text-xs font-mono text-white/40">
                {String(activeIndex + 1).padStart(2, '0')} / {processSteps.length}
              </div>
              <button
                onClick={() => navigate(1)}
                disabled={activeIndex === processSteps.length - 1}
                className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/5 transition hover:border-white/40 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5 text-white/60 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* 底部缩略图预览 */}
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {processSteps.map((step, index) => (
                <button
                  key={step.num}
                  onClick={() => setActiveIndex(index)}
                  className={`group relative flex h-12 w-16 items-center justify-center rounded-lg border transition-all ${
                    index === activeIndex
                      ? index === 0
                        ? "border-amber-500/50 bg-amber-500/10"
                        : index === processSteps.length - 1
                        ? "border-violet-500/50 bg-violet-500/10"
                        : "border-blue-500/50 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/20"
                  }`}
                >
                  <step.icon className={`h-5 w-5 ${
                    index === activeIndex
                      ? index === 0
                        ? "text-amber-400"
                        : index === processSteps.length - 1
                        ? "text-violet-400"
                        : "text-blue-400"
                      : "text-white/40"
                  }`} />
                  {/* Tooltip */}
                  <span className="absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/90 px-2 py-1 text-[10px] text-white group-hover:block">
                    {step.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cases Section */}
      <section id="cases" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-400/60">04</span>
              <div className="h-px w-12 bg-gradient-to-r from-emerald-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                PROJECTS
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              真实项目经验，
              <span className="bg-gradient-to-r from-emerald-200 to-emerald-400 bg-clip-text text-transparent">
                沉淀为可复用的方法
              </span>
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-white/50">
              过往项目不只是作品展示，更是内容策划、空间叙事、多媒体表达和现场落地能力的积累。
            </p>
          </motion.div>

          {/* Case Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((caseItem, index) => (
              <motion.div
                key={caseItem.title}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f15] transition hover:border-white/20"
              >
                {/* Gradient Background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${caseItem.gradient} opacity-0 transition group-hover:opacity-100`}
                />

                {/* Image Placeholder */}
                <div className="relative h-40 w-full overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${caseItem.gradient}`} />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-xs font-mono text-white/20">PROJECT IMAGE</div>
                      <div className="mt-1 text-[10px] text-white/10">Placeholder</div>
                    </div>
                  </div>
                </div>

                <div className="relative p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {caseItem.title}
                      </h3>
                      <div className="mt-1 text-xs text-white/40">
                        {caseItem.type}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-white/20 transition group-hover:text-white/60 group-hover:translate-x-1" />
                  </div>

                  {/* Capabilities */}
                  <div className="mt-4">
                    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                      能力体现
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {caseItem.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 transition group-hover:border-white/20 group-hover:text-white/80"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Highlight */}
                  <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
                      项目亮点
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">
                      {caseItem.highlight}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* More Projects */}
          <motion.div
            className="mt-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6">
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-white/40">
                更多项目沉淀
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {visibleProjects.map((project) => (
                  <span
                    key={project}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition hover:border-amber-500/30 hover:text-amber-300"
                  >
                    {project}
                  </span>
                ))}
              </div>
              {moreProjects.length > 45 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAllProjects(!showAllProjects)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/10 hover:border-amber-500/30"
                  >
                    {showAllProjects ? (
                      <>
                        收起
                        <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                      </>
                    ) : (
                      <>
                        查看更多 {moreProjects.length - 45} 个项目
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-us" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-amber-400/60">05</span>
              <div className="h-px w-12 bg-gradient-to-r from-amber-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                WHY US
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              为什么选择以太
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map((item, index) => (
              <motion.div
                key={item.title}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition hover:border-amber-500/30"
              >
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <item.icon className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative border-t border-white/5 py-24">
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-blue-400/60">06</span>
              <div className="h-px w-12 bg-gradient-to-r from-blue-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                EXPERIENCE
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              项目经验沉淀
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true }}
                variants={fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8"
              >
                <div className="absolute right-4 top-4 text-[8px] font-mono uppercase tracking-[0.2em] text-white/20">
                  {stat.sub}
                </div>
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="mt-2 text-sm text-white/60">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="relative border-t border-white/5 py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/[0.02] to-transparent" />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-12 text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs font-mono text-blue-400/60">07</span>
              <div className="h-px w-12 bg-gradient-to-r from-blue-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                TEAM
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              多专业团队协同
            </h2>
            <p className="mt-4 text-lg text-white/50">
              内容、空间、多媒体、工程协作，是以太内容实验室的基础工作方式。
            </p>
          </motion.div>

          {/* Team Groups - Grid Layout */}
          <div className="relative">
            {/* Center Badge */}
            <div className="mb-8 flex justify-center">
              <div className="flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-3">
                <Users className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">以太内容实验室</span>
              </div>
            </div>

            {/* Team Tags Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {teamGroups.map((group) => (
                <div
                  key={group}
                  className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm text-white/70 transition hover:border-amber-500/30 hover:text-amber-300 hover:bg-white/10"
                >
                  {group}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative border-t border-white/5 bg-[#0a0a0f] py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/[0.03] to-transparent" />
        <div className="relative mx-auto max-w-4xl px-6">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-xs font-mono text-amber-400/60">08</span>
              <div className="h-px w-12 bg-gradient-to-r from-amber-500/30 to-transparent" />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                CONTACT
              </span>
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              从一个创意开始，
              <span className="block bg-gradient-to-r from-amber-200 to-blue-200 bg-clip-text text-transparent">
                生成一套可落地的内容方案
              </span>
            </h2>
            <p className="mt-6 text-lg text-white/50">
              告诉我们你的项目类型、场地条件或故事想法，
              <span className="block">我们可以从内容策划、视觉方向和落地路径开始帮你拆解。</span>
            </p>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            className="mt-12 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-8 md:p-10"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  项目类型
                </label>
                <select className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 focus:border-amber-500/50 focus:outline-none">
                  <option value="" className="bg-[#0f0f15]">请选择项目类型</option>
                  <option value="short-drama" className="bg-[#0f0f15]">短剧内容</option>
                  <option value="culture-tourism" className="bg-[#0f0f15]">文旅演艺</option>
                  <option value="exhibition" className="bg-[#0f0f15]">展馆展陈</option>
                  <option value="immersive" className="bg-[#0f0f15]">沉浸式空间</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  当前阶段
                </label>
                <select className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 focus:border-amber-500/50 focus:outline-none">
                  <option value="" className="bg-[#0f0f15]">请选择当前阶段</option>
                  <option value="idea" className="bg-[#0f0f15]">仅有创意想法</option>
                  <option value="content" className="bg-[#0f0f15]">需要内容策划</option>
                  <option value="visual" className="bg-[#0f0f15]">需要视觉深化</option>
                  <option value="execution" className="bg-[#0f0f15]">需要施工配合</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  项目描述
                </label>
                <textarea
                  rows={4}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 focus:border-amber-500/50 focus:outline-none"
                  placeholder="请描述你的项目需求、场地条件、或想要表达的故事..."
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  联系人
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 focus:border-amber-500/50 focus:outline-none"
                  placeholder="您的姓名"
                />
              </div>

              <div>
                <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/60">
                  联系方式
                </label>
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 focus:border-amber-500/50 focus:outline-none"
                  placeholder="电话 / 微信 / 邮箱"
                />
              </div>

              <div className="md:col-span-2">
                <button className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/35">
                  提交项目需求
                </button>
              </div>
            </div>

            {/* Phone CTA */}
            <div className="mt-8 flex justify-center">
              <a
                href="tel:15311221311"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-300"
              >
                <ArrowRight className="h-4 w-4 -scale-x-100" />
                电话咨询：153 1122 1311
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-blue-600/10">
              <PenTool className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <div className="text-sm font-medium tracking-[0.12em] text-white/70">
                以太内容实验室
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                <span>1Ti Visual Story</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-white/50">
                <span>北京以太科技文化有限公司</span>
                <span className="h-2.5 w-px bg-white/10" />
                <span>Beijing 1Ti Technology Culture Co., Ltd</span>
              </div>
            <div className="mt-3 text-[10px] text-white/40">
                让故事进入现实，让内容成为可体验的空间。
              </div>
              <div className="mt-4 text-xs text-white/45">
                <span className="mr-3 font-medium text-white/55">社区</span>
                <button
                  onClick={() => handleCommunityEntry("footer")}
                  className="text-amber-200/80 transition hover:text-amber-100"
                >
                  加入社区
                </button>
              </div>
            </div>
          </div>
          <div className="text-center md:text-right">
            <a
              href="tel:15311221311"
              className="text-sm font-medium text-amber-300 transition hover:text-amber-200"
            >
              153 1122 1311
            </a>
            <div className="mt-3 text-xs text-white/40">
              © 北京以太科技文化有限公司
            </div>
            <div className="mt-2 text-center text-xs text-white/40">
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                京ICP备2026022163号-1
              </a>
            </div>
            <div className="mt-2 text-center text-xs text-white/40">
              <a
                href="https://beian.mps.gov.cn/#/query/webSearch?code=11011502039868"
                rel="noreferrer"
                target="_blank"
                className="inline-flex items-center gap-1 hover:text-white/60 transition-colors"
              >
                <img src="/beianlogo.png" alt="公安网备案" className="h-4 w-4" />
                京公网安备11011502039868号
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Community Modal */}
      <CommunityModal
        open={communityModalOpen}
        onClose={() => setCommunityModalOpen(false)}
        source={communityModalSource}
      />

    </div>
  );
}
