import type { BaseComponentProps } from "@json-render/react";

type SummaryCardProps = {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
};

export function SummaryCard({ props }: BaseComponentProps<SummaryCardProps>) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <h4 className="text-sm font-semibold text-white">{props.title}</h4>
      <dl className="mt-3 grid gap-2">
        {props.items.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-4">
            <dt className="text-xs text-slate-500">{item.label}</dt>
            <dd className="text-right text-xs text-slate-300">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
