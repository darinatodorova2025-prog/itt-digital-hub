"use client";

import type { CSSProperties, ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { useFormStatus } from "react-dom";

export function AdminLinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="admin-loading-mark" aria-hidden="true" />;
}

export function AdminPendingButton({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} style={style} disabled={pending} aria-busy={pending}>
      {pending ? <span className="admin-loading-mark" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
