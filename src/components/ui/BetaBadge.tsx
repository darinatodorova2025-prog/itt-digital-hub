import { cn } from "@/lib/cn";

type BetaBadgeSize = "default" | "compact";

const sizeClass: Record<BetaBadgeSize, string> = {
  default: "px-2.5! py-1! text-xs!",
  compact: "px-2! py-0.5! text-[10px]!",
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
        "inline-flex shrink-0 items-center rounded-full border-0 bg-signal! font-sans font-semibold! uppercase leading-none! tracking-[0.04em]! text-white! shadow-none",
        sizeClass[size],
        className,
      )}
    >
      BETA
    </span>
  );
}
