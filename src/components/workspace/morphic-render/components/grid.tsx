import { Children } from "react";
import type { BaseComponentProps } from "@json-render/react";

type GridProps = {
  columns?: number;
  centerLast?: boolean;
  layout?: "grid" | "wrap";
};

const gridClass: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2",
};

export function Grid({ props, children }: BaseComponentProps<GridProps>) {
  const columns = props.columns && props.columns >= 1 && props.columns <= 4 ? props.columns : 2;
  const centerLast = Boolean(props.centerLast);
  const layout = props.layout ?? "grid";

  if (layout === "wrap") {
    const itemBasisClass =
      columns === 3
        ? "w-full sm:basis-[calc(50%_-_0.375rem)] lg:basis-[calc(33.333%_-_0.5rem)]"
        : "w-full sm:basis-[calc(50%_-_0.375rem)]";

    return (
      <div className="flex flex-wrap justify-center gap-2.5">
        {Children.map(children, (child) => (
          <div className={`${itemBasisClass} flex justify-center`}>{child}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-2.5 ${gridClass[columns]} ${
        centerLast ? "sm:[&>*:last-child]:col-span-2 sm:[&>*:last-child]:max-w-[22rem] sm:[&>*:last-child]:justify-self-center" : ""
      }`}
    >
      {children}
    </div>
  );
}
