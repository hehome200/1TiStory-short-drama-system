import type { BaseComponentProps } from "@json-render/react";

type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary";
};

export function Button({ props, emit }: BaseComponentProps<ButtonProps>) {
  const isPrimary = props.variant === "primary";
  return (
    <button
      type="button"
      onClick={() => emit("press")}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        isPrimary
          ? "bg-white text-slate-950 hover:bg-slate-100"
          : "border border-white/10 text-slate-200 hover:bg-white/10"
      }`}
    >
      {props.label}
    </button>
  );
}
