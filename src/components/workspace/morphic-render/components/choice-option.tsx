import type { BaseComponentProps } from "@json-render/react";

type ChoiceOptionProps = {
  label: string;
  subtitle?: string;
  description?: string;
  tags: string[];
  scores?: string[];
  intentScore?: number;
  selected?: boolean;
  accent?: "blue" | "rose" | "gold";
  compact?: boolean;
  density?: "card" | "chip";
};

export function ChoiceOption({ props, emit }: BaseComponentProps<ChoiceOptionProps>) {
  const isCompact = Boolean(props.compact);
  const isChip = props.density === "chip";
  const accentClass =
    props.accent === "rose"
      ? "hover:border-rose-200/28 hover:bg-rose-200/[0.055]"
      : props.accent === "gold"
        ? "hover:border-amber-200/28 hover:bg-amber-200/[0.055]"
        : "hover:border-cyan-200/28 hover:bg-cyan-200/[0.055]";
  const selectedClass = props.selected
    ? "border-white/25 bg-white/[0.095] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_28px_rgba(255,255,255,0.07),0_18px_48px_rgba(0,0,0,0.34)]"
    : `border-white/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.078),rgba(255,255,255,0.036)_58%,rgba(255,255,255,0.022))] shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_18px_40px_rgba(0,0,0,0.24)] ${accentClass}`;
  const chipBaseClass = isChip
    ? "min-h-0 px-3 py-2.5 md:px-3.5 md:py-2.5"
    : isCompact
    ? "min-h-[94px] px-3.5 py-3 md:min-h-[102px] md:px-4 md:py-3.5"
    : "min-h-36 p-5 md:min-h-[9.5rem] lg:min-h-40";
  const labelClass = isChip
    ? "text-sm font-semibold tracking-normal text-white/92 transition duration-200 group-hover:text-white md:text-[0.95rem]"
    : isCompact
      ? "text-2xl font-medium tracking-normal text-white/90 transition duration-200 group-hover:text-white md:text-[1.65rem]"
    : "text-3xl font-light tracking-normal text-white/88 transition duration-200 group-hover:text-white md:text-4xl";
  const subtitleClass = isChip
    ? "mt-1 text-[11px] leading-4 text-white/64"
    : isCompact
      ? "mt-2 text-xs leading-5 text-white/68"
    : "mt-8 text-sm text-white/72 md:mt-10";

  return (
    <button
      type="button"
      onClick={() => emit("press")}
      className={`group relative flex w-full flex-col items-center justify-center rounded-[19px] border text-center transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.99] ${chipBaseClass} ${selectedClass} ${isCompact || isChip ? "justify-self-center" : ""}`}
    >
      <div>
        <div className={labelClass}>
          {props.label}
        </div>
        {props.subtitle && (
          <p className={subtitleClass}>{props.subtitle}</p>
        )}
      </div>
    </button>
  );
}
