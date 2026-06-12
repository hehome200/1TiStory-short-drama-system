import type { BaseComponentProps } from "@json-render/react";

type ChoiceCardProps = {
  title: string;
  description?: string;
  compact?: boolean;
};

export function ChoiceCard({ props, children }: BaseComponentProps<ChoiceCardProps>) {
  const isCompact = Boolean(props.compact);
  return (
    <section
      data-compact={isCompact ? "true" : undefined}
      className={`rounded-[21px] border border-white/[0.045] bg-transparent px-0 py-0 ${
        isCompact ? "overflow-hidden" : ""
      }`}
    >
      <div className="sr-only">
        <h4>{props.title}</h4>
        {props.description ? <p>{props.description}</p> : null}
      </div>
      <div
        className={
          isCompact
            ? "[&_.grid]:gap-2.5 [&_.grid]:items-stretch"
            : "[&_.grid]:gap-4 lg:[&_.grid]:gap-4"
        }
      >
        {children}
      </div>
    </section>
  );
}
