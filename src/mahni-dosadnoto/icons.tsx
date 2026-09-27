import type { ReactNode } from "react";

type IconProps = {
  size?: number;
  className?: string;
};

function Glyph({ size = 24, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function StageGlyph({ stage, size = 22, className }: IconProps & { stage: 1 | 2 | 3 | 4 | 5 }) {
  switch (stage) {
    case 1:
      return (
        <Glyph size={size} className={className}>
          <path d="M7.2 16.2 5.4 19.2c2.1-.35 3.3-1.15 3.9-2" />
          <path d="M8 16.4h7.1A3.1 3.1 0 0 0 18.2 13.3V8.2A3.2 3.2 0 0 0 15 5H8.2A3.2 3.2 0 0 0 5 8.2v5.1A3.1 3.1 0 0 0 8 16.4Z" />
          <path d="M8.2 9.2h7.2M8.2 12.2h4.4" />
        </Glyph>
      );
    case 2:
      return (
        <Glyph size={size} className={className}>
          <rect x="4" y="5" width="7.2" height="5.2" rx="1.2" />
          <rect x="12.8" y="5" width="7.2" height="5.2" rx="1.2" />
          <rect x="8.4" y="13.2" width="7.2" height="5.2" rx="1.2" />
          <path d="M7.6 10.2v1.2c0 .7.5 1.2 1.2 1.2h1.2M16.4 10.2v1.2c0 .7-.5 1.2-1.2 1.2h-1.2" />
        </Glyph>
      );
    case 3:
      return (
        <Glyph size={size} className={className}>
          <circle cx="12" cy="12" r="7.2" />
          <path d="m8.7 12.1 2.2 2.2 4.4-4.6" />
        </Glyph>
      );
    case 4:
      return (
        <Glyph size={size} className={className}>
          <circle cx="11" cy="11" r="5.4" />
          <path d="m15.1 15.1 3.4 3.4" />
          <path d="M11 8.8v.2M11 13v.2M8.9 11h.2M12.9 11h.2" />
        </Glyph>
      );
    case 5:
      return (
        <Glyph size={size} className={className}>
          <path d="M5 12h12" />
          <path d="m13 7.5 4.8 4.5L13 16.5" />
          <path d="M5 7.5v9" />
        </Glyph>
      );
  }
}

export function PeopleIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="8.2" r="2.3" />
      <path d="M4.8 17.2c.5-2.3 2.2-3.5 4.2-3.5s3.7 1.2 4.2 3.5" />
      <circle cx="16" cy="9" r="1.8" />
      <path d="M15.2 13.8c1.5.2 2.7 1.1 3.2 2.6" />
    </Glyph>
  );
}

export function OrgIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M5 19.5h14" />
      <path d="M7 19.5V7.8L12 5l5 2.8v11.7" />
      <path d="M10 19.5v-3.2h4v3.2M9.2 10.2h.1M12 10.2h.1M14.8 10.2h.1M9.2 13.2h.1M12 13.2h.1M14.8 13.2h.1" />
    </Glyph>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="m5.5 12.2 4.1 4.1L18.5 7.6" />
    </Glyph>
  );
}

export function ConvergeIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <circle cx="7.2" cy="12" r="2.4" />
      <circle cx="16.8" cy="12" r="2.4" />
      <path d="M9.6 12h4.8" />
    </Glyph>
  );
}

export function PlaneIcon({ size = 42, className }: IconProps) {
  return (
    <Glyph size={size} className={className}>
      <path d="M4.5 11.2 20 5.2l-6.2 14.2-2.3-5.1-5-3.1Z" />
      <path d="M11.5 14.3 20 5.2" />
    </Glyph>
  );
}

export function LensGlyph({ judge, size = 22 }: IconProps & { judge: "business_value" | "feasibility" | "innovation" }) {
  if (judge === "business_value") {
    return (
      <Glyph size={size}>
        <path d="M5 16.5h14" />
        <path d="M7.5 16.5V11M12 16.5V7.5M16.5 16.5V9.5" />
      </Glyph>
    );
  }
  if (judge === "feasibility") {
    return (
      <Glyph size={size}>
        <rect x="5" y="5.5" width="14" height="13" rx="1.6" />
        <path d="m8.2 12.1 2.3 2.2 5-5" />
      </Glyph>
    );
  }
  return (
    <Glyph size={size}>
      <path d="M12 4.8v2.2M12 17v2.2M4.8 12h2.2M17 12h2.2" />
      <path d="m7.2 7.2 1.5 1.5M15.3 15.3l1.5 1.5M16.8 7.2l-1.5 1.5M8.7 15.3l-1.5 1.5" />
      <circle cx="12" cy="12" r="2.2" />
    </Glyph>
  );
}
