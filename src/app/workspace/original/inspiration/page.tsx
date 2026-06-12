"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectRecord, saveProjects, loadProjects } from "@/lib/projects";
import { loadLocalProviderConfig } from "@/lib/local-ai/provider-settings";
import { generateWithLocalProvider } from "@/lib/local-ai/generation-service";

type ScenarioCard = {
  title: string;
  premise: string;
  hook: string;
  style: string;
};

function stripJsonFence(text: string) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
}

export default function OriginalInspirationPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("通用");
  const [genre, setGenre] = useState("都市言情");
  const [hook, setHook] = useState("");
  const [style, setStyle] = useState("");
  const [premise, setPremise] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cards, setCards] = useState<ScenarioCard[]>([]);

  const promptPayload = useMemo(() => ({
    title,
    audience,
    genre,
    hook,
    style,
    premise,
  }), [title, audience, genre, hook, style, premise]);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = await loadLocalProviderConfig();
      const result = await generateWithLocalProvider(
        {
          system: "你是 1TiStory 的灵感策划助手。只输出 JSON 数组，不要解释。",
          user: JSON.stringify({
            task: "original_inspiration",
            input: promptPayload,
            count: 3,
            format: [
              { title: "方案标题", premise: "方案梗概", hook: "灵感钩子", style: "风格标签" },
            ],
          }, null, 2),
          responseFormat: { type: "json_object" },
          temperature: 0.8,
          maxTokens: 1200,
        },
        provider,
      );
      const raw = stripJsonFence(result.text);
      const parsed = JSON.parse(raw) as { cards?: ScenarioCard[]; scenarios?: ScenarioCard[]; items?: ScenarioCard[] };
      const nextCards = (parsed.cards ?? parsed.scenarios ?? parsed.items ?? []).slice(0, 3);
      if (nextCards.length === 0) {
        throw new Error("模型未返回灵感方案");
      }
      setCards(nextCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : "灵感生成失败");
    } finally {
      setLoading(false);
    }
  };

  const skipAndCreate = () => {
    const project = createProjectRecord({
      title: title.trim() || "未命名原创项目",
      sourceMode: "idea",
    });
    const projects = loadProjects();
    saveProjects([project, ...projects]);
    router.push(`/workspace/original/editor?projectId=${encodeURIComponent(project.id)}`);
  };

  const chooseScenario = (card: ScenarioCard) => {
    const baseDraft = createProjectRecord({ title: "未命名原创项目", sourceMode: "idea" }).draft;
    const project = createProjectRecord({
      title: card.title || title.trim() || "未命名原创项目",
      sourceMode: "idea",
      draft: {
        ...baseDraft,
        title: card.title || title.trim() || "未命名原创项目",
        overview: {
          ...baseDraft.overview,
          audience,
          genres: genre ? [genre] : [],
          coreHooks: hook ? [hook] : [],
          styleTags: style ? [style] : [],
          premise: card.premise || premise,
          userPremise: premise,
        },
      },
    });
    const projects = loadProjects();
    saveProjects([project, ...projects]);
    router.push(`/workspace/original/editor?projectId=${encodeURIComponent(project.id)}`);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
        <h1 className="text-3xl font-semibold text-white">原创灵感</h1>
        <p className="mt-2 text-sm text-slate-400">保留输入、方案选择和跳过流程，所有结果都落到本地 IndexedDB。</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">项目标题</span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="新建原创项目" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">受众</span>
            <Input value={audience} onChange={(e) => setAudience(e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">题材</span>
            <Input value={genre} onChange={(e) => setGenre(e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">核心钩子</span>
            <Input value={hook} onChange={(e) => setHook(e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">风格</span>
            <Input value={style} onChange={(e) => setStyle(e.target.value)} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm text-slate-300">故事想法</span>
            <textarea
              value={premise}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPremise(e.target.value)}
              className="min-h-40 rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              placeholder="写下你的故事想法..."
            />
          </label>
          {error ? <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{error}</div> : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={loading}>{loading ? "生成中..." : "生成三套方案"}</Button>
            <Button variant="secondary" onClick={skipAndCreate}>跳过灵感，直接创建</Button>
          </div>
        </div>

        <div className="space-y-4">
          {cards.length > 0 ? (
            cards.map((card) => (
              <button
                key={card.title}
                onClick={() => chooseScenario(card)}
                className="w-full rounded-3xl border border-slate-800 bg-slate-950/80 p-5 text-left transition hover:border-cyan-400/40 hover:bg-slate-950"
              >
                <div className="text-lg font-semibold text-white">{card.title}</div>
                <div className="mt-2 text-sm text-slate-300">{card.premise}</div>
                <div className="mt-3 text-xs text-cyan-200">钩子：{card.hook}</div>
                <div className="mt-1 text-xs text-slate-500">{card.style}</div>
              </button>
            ))
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-sm text-slate-400">
              生成后会在这里显示三套方案。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
