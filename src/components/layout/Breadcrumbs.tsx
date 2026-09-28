import Link from "next/link";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { CrumbItem } from "@/lib/breadcrumbs";
import { ArrowRight } from "@/components/ui/Icons";

/**
 * Compact hierarchy. On narrow screens a trail of four or more keeps the
 * direct parent and the current page, and collapses earlier levels to an
 * ellipsis that still links to the nearest hidden ancestor.
 */
export function Breadcrumbs({
  label,
  items,
  tone = "paper",
  className,
}: {
  label: string;
  items: CrumbItem[];
  tone?: "paper" | "dark";
  className?: string;
}) {
  if (items.length < 2) return null;
  const dark = tone === "dark";
  const collapse = items.length >= 4;
  const parentIndex = items.length - 2;
  const linkClass = cn(
    "rounded-sm transition-colors hover:underline hover:underline-offset-[3px]",
    dark ? "hover:text-on-dark" : "hover:text-ink",
  );
  const currentClass = dark ? "text-on-dark" : "text-ink-2";

  return (
    <nav aria-label={label} className={cn("min-w-0 text-meta", dark ? "text-on-dark-muted" : "text-ink-3", className)}>
      <ol className="flex min-w-0 flex-wrap items-baseline">
        {items.map((item, index) => {
          const href = item.href;
          const hideEarlier = collapse && index < parentIndex;
          const collapsedAncestor = items[parentIndex - 1];
          return (
            <Fragment key={`${item.label}-${index}`}>
              {collapse && index === parentIndex && collapsedAncestor?.href ? (
                <li className="flex min-w-0 items-baseline sm:hidden">
                  <Link href={collapsedAncestor.href} aria-label={collapsedAncestor.label} className={linkClass}>
                    …
                  </Link>
                  <span aria-hidden="true" className="mx-1.5">
                    /
                  </span>
                </li>
              ) : null}
              <li className={cn("flex min-w-0 max-w-full items-baseline", hideEarlier && "max-sm:hidden")}>
                {index > 0 ? (
                  <span aria-hidden="true" className={cn("mx-1.5", collapse && index === parentIndex && "max-sm:hidden")}>
                    /
                  </span>
                ) : null}
                {href ? (
                  <Link href={href} className={cn("min-w-0", linkClass)}>
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className={cn("min-w-0", currentClass)}>
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/** Local return to the direct parent. Separate from the hierarchy trail. */
export function ParentReturn({
  href,
  children,
  tone = "paper",
  className,
}: {
  href: string;
  children: string;
  tone?: "paper" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-sm text-small font-medium",
        dark ? "text-on-dark-muted hover:text-on-dark" : "text-ink-2 hover:text-marine",
        className,
      )}
    >
      <ArrowRight className="shrink-0 rotate-180 transition-transform duration-200 ease-out-soft motion-safe:group-hover:-translate-x-0.5" />
      <span className="underline decoration-line-strong underline-offset-[3px] transition-colors group-hover:decoration-amber">
        {children}
      </span>
    </Link>
  );
}
