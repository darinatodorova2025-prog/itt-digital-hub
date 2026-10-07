import { cn } from "@/lib/cn";

type BetaBadgeSize = "default" | "compact";

const sizeClass: Record<BetaBadgeSize, string> = {
  default: "px-3! py-1! text-[13px]!",
  compact: "px-2.5! py-[3px]! text-[11px]!",
};

/** Product status pill. The label stays BETA in every locale. */
export function BetaBadge({
  size = "default",
  className,
}: {
  size?: BetaBadgeSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "beta-badge inline-flex shrink-0 items-center rounded-full border-0 font-sans font-semibold uppercase leading-none tracking-[0.04em] text-white shadow-none",
        sizeClass[size],
        className,
      )}
      style={{ backgroundColor: "#FF2D2D", color: "#FFFFFF" }}
    >
      BETA
    </span>
  );
}
