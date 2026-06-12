import type { Spec } from "@json-render/react";

export type InspirationChoiceAction = {
  label: string;
  tags: string[];
  scores?: string[];
  intentScore?: number;
  nextStepId?: string;
  density?: "card" | "chip";
};

export type MorphicRenderSpec = Spec;
