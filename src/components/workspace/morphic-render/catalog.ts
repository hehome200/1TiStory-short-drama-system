import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";

export const morphicRenderCatalog = defineCatalog(schema, {
  components: {
    Heading: {
      props: z.object({
        eyebrow: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
      }),
      description: "Section heading with optional eyebrow and description.",
    },
    Stack: {
      props: z.object({
        gap: z.enum(["sm", "md", "lg"]).optional(),
      }),
      description: "Vertical layout stack.",
    },
    Grid: {
      props: z.object({
        columns: z.number().int().min(1).max(4).optional(),
        centerLast: z.boolean().optional(),
        layout: z.enum(["grid", "wrap"]).optional(),
      }),
      description: "Responsive grid layout.",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary"]).optional(),
      }),
      description: "Generic action button.",
    },
    ChoiceCard: {
      props: z.object({
        title: z.string(),
        description: z.string().optional(),
        compact: z.boolean().optional(),
      }),
      description: "Card container for a group of inspiration choices.",
    },
    ChoiceOption: {
      props: z.object({
        label: z.string(),
        subtitle: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()),
        scores: z.array(z.string()).optional(),
        intentScore: z.number().optional(),
        selected: z.boolean().optional(),
        accent: z.enum(["blue", "rose", "gold"]).optional(),
        compact: z.boolean().optional(),
        density: z.enum(["card", "chip"]).optional(),
      }),
      description: "Selectable inspiration option that emits a press event.",
    },
    SummaryCard: {
      props: z.object({
        title: z.string(),
        items: z.array(
          z.object({
            label: z.string(),
            value: z.string(),
          }),
        ),
      }),
      description: "Compact summary card.",
    },
  },
  actions: {
    selectInspirationChoice: {
      params: z.object({
        label: z.string(),
        tags: z.array(z.string()),
        scores: z.array(z.string()).optional(),
        intentScore: z.number().optional(),
        nextStepId: z.string().optional(),
      }),
      description: "Select an inspiration planning choice and append its tags.",
    },
  },
});
