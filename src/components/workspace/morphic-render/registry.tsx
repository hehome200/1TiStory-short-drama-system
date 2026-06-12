import { defineRegistry } from "@json-render/react";
import { morphicRenderCatalog } from "./catalog";
import { Button } from "./components/button";
import { ChoiceCard } from "./components/choice-card";
import { ChoiceOption } from "./components/choice-option";
import { Grid } from "./components/grid";
import { Heading } from "./components/heading";
import { Stack } from "./components/stack";
import { SummaryCard } from "./components/summary-card";

export const {
  registry: morphicRenderRegistry,
  handlers: createMorphicRenderHandlers,
} = defineRegistry(morphicRenderCatalog, {
  components: {
    Heading,
    Stack,
    Grid,
    Button,
    ChoiceCard,
    ChoiceOption,
    SummaryCard,
  },
  actions: {
    selectInspirationChoice: async () => {
      return;
    },
  },
});
