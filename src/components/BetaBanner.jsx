"use client";

import { useEffect, useState } from "react";

export default function BetaBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Change this to your actual beta hostname
    if (
      window.location.hostname.startsWith("beta.") ||
      window.location.hostname.startsWith("localhost")
    ) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="w-full bg-yellow-400 text-black text-center text-sm font-semibold py-1">
      ⚠️ BETA — Test Environment
    </div>
  );
}
