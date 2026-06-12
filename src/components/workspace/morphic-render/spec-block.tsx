"use client";

import {
  ActionProvider,
  JSONUIProvider,
  Renderer,
} from "@json-render/react";
import { morphicRenderRegistry } from "./registry";
import type { InspirationChoiceAction, MorphicRenderSpec } from "./schema";

type SpecBlockProps = {
  spec: MorphicRenderSpec;
  onSelectInspirationChoice: (selection: InspirationChoiceAction) => void;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function parseSelection(params: Record<string, unknown>): InspirationChoiceAction | null {
  if (typeof params.label !== "string" || !isStringArray(params.tags)) {
    return null;
  }

  return {
    label: params.label,
    tags: params.tags,
    scores: isStringArray(params.scores) ? params.scores : undefined,
    intentScore: typeof params.intentScore === "number" ? params.intentScore : undefined,
    nextStepId: typeof params.nextStepId === "string" ? params.nextStepId : undefined,
  };
}

export function SpecBlock({ spec, onSelectInspirationChoice }: SpecBlockProps) {
  return (
    <JSONUIProvider registry={morphicRenderRegistry}>
      <ActionProvider
        handlers={{
          selectInspirationChoice: (params) => {
            const selection = parseSelection(params);
            if (selection) {
              onSelectInspirationChoice(selection);
            }
          },
        }}
      >
        <Renderer spec={spec} registry={morphicRenderRegistry} />
      </ActionProvider>
    </JSONUIProvider>
  );
}
