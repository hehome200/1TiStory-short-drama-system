import type { BaseComponentProps } from "@json-render/react";

type StackProps = {
  gap?: "sm" | "md" | "lg";
};

const gapClass: Record<NonNullable<StackProps["gap"]>, string> = {
  sm: "space-y-3",
  md: "space-y-4",
  lg: "space-y-6",
};

export function Stack({ props, children }: BaseComponentProps<StackProps>) {
  return <div className={gapClass[props.gap ?? "md"]}>{children}</div>;
}
