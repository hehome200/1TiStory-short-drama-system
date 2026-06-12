import type { BaseComponentProps } from "@json-render/react";

type HeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function Heading({ props }: BaseComponentProps<HeadingProps>) {
  return (
    <div>
      {props.eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {props.eyebrow}
        </div>
      )}
      <h3 className="mt-2 text-lg font-semibold text-white">{props.title}</h3>
      {props.description && (
        <p className="mt-2 text-sm leading-6 text-slate-400">{props.description}</p>
      )}
    </div>
  );
}
