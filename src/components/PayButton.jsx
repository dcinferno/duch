"use client";

import { getOrCreateUserId } from "@/lib/createUserId";

export default function PayButton({ amount, videoId }) {
  async function pay() {
    const userId = getOrCreateUserId();
    const redirectOrigin = window.location.origin;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_PROCESS_SERVER_URL}/api/checkout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          videoId,
          amount,
          redirectOrigin,
        }),
      }
    );

    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <button onClick={pay} className="px-4 py-2 bg-green-600 text-white rounded">
      Pay ${amount}
    </button>
  );
}
