"use client";

import { getOrCreateUserId } from "@/lib/createUserId";
import { useState } from "react";

export default function DownloadButton({ videoId }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);

    const userId = getOrCreateUserId();

    const res = await fetch("/api/download-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, videoId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!data.url) {
      alert("You haven't purchased this video.");
      return;
    }

    // ⬇️ Force a real download (Safari-compliant)
    const response = await fetch(data.url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${videoId}.mp4`; // you can insert video.title here if available
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(blobUrl);
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
