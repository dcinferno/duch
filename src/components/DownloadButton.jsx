"use client";

import { getOrCreateUserId } from "@/lib/createUserId";
import { useState } from "react";

export default function DownloadButton({ videoId, key }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);

    const userId = getOrCreateUserId();

    const res = await fetch("/api/download-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId, key }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.url) {
      window.location.href = data.url; // triggers browser download
    } else {
      alert("You haven't purchased this video.");
    }
  }

  return (
    <button
      onClick={handleDownload}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      disabled={loading}
    >
      {loading ? "Preparing download..." : "Download Now"}
    </button>
  );
}
