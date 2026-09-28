"use client";

import { useEffect, useState } from "react";

export function useCountdown(serverSeconds: number | null, active: boolean): number | null {
  const [clock, setClock] = useState({ base: serverSeconds, elapsed: 0 });

  if (clock.base !== serverSeconds) {
    setClock({ base: serverSeconds, elapsed: 0 });
  }

  useEffect(() => {
    if (!active || serverSeconds === null) return;
    const started = Date.now();
    const id = window.setInterval(() => {
      setClock({
        base: serverSeconds,
        elapsed: Math.max(0, Math.floor((Date.now() - started) / 1000)),
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, serverSeconds]);

  if (!active || serverSeconds === null) return serverSeconds;
  return Math.max(0, serverSeconds - clock.elapsed);
}
