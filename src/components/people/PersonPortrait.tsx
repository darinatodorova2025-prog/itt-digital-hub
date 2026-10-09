import Image from "next/image";
import { cn } from "@/lib/cn";

/** Colour photograph cropped to a circle. Background stays in the frame. */
export function PersonPortrait({
  src,
  alt,
  className,
  objectPosition,
}: {
  src: string;
  alt: string;
  className?: string;
  objectPosition?: string;
}) {
  return (
    <div className={cn("person-portrait", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1280px) 192px, (min-width: 960px) 172px, 204px"
        className="person-portrait-photo"
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}

/** Quiet reserved slot — not a person record, not hover-interactive. */
export function PersonPortraitVacant() {
  return (
    <div className="person-portrait person-portrait-vacant" aria-hidden="true">
      <span className="person-portrait-plate" />
      <span className="person-portrait-plus" />
    </div>
  );
}

/** Real person without a supplied portrait — plate only, no join-us plus. */
export function PersonPortraitPlate() {
  return (
    <div className="person-portrait person-portrait-vacant" aria-hidden="true">
      <span className="person-portrait-plate" />
    </div>
  );
}
