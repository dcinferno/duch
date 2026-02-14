"use client";

import { useEffect, useState } from "react";

export default function BetaBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;

    if (
      hostname.startsWith("beta.") ||
      process.env.NODE_ENV === "development"
    ) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="hidden md:block w-full bg-yellow-400 text-black text-center text-sm font-semibold py-1">
      ⚠️ BETA — Test Environment
    </div>
  );
}
